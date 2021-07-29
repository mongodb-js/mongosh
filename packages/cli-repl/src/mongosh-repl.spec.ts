/* eslint-disable no-control-regex */
import { MongoshCommandFailed } from '@mongosh/errors';
import { bson, ServiceProvider } from '@mongosh/service-provider-core';
import { ADMIN_DB } from '@mongosh/shell-api/lib/enums';
import { CliUserConfig } from '@mongosh/types';
import { EventEmitter, once } from 'events';
import path from 'path';
import { Duplex, PassThrough } from 'stream';
import { StubbedInstance, stubInterface } from 'ts-sinon';
import { promisify } from 'util';
import { expect, fakeTTYProps, tick, useTmpdir, waitEval } from '../test/repl-helpers';
import MongoshNodeRepl, { MongoshIOProvider, MongoshNodeReplOptions } from './mongosh-repl';
import { parseAnyLogEntry } from './log-entry';
import stripAnsi from 'strip-ansi';

const delay = promisify(setTimeout);

const multilineCode = `(function() {
  return 610 + 377;
})();`;

describe('MongoshNodeRepl', () => {
  let mongoshRepl: MongoshNodeRepl;
  let mongoshReplOptions: MongoshNodeReplOptions;
  let input: Duplex;
  let outputStream: Duplex;
  let output = '';
  let bus: EventEmitter;
  let ioProvider: MongoshIOProvider;
  let sp: StubbedInstance<ServiceProvider>;
  let serviceProvider: ServiceProvider;
  let config: Record<string, any>;
  const tmpdir = useTmpdir();

  beforeEach(() => {
    input = new PassThrough();
    outputStream = new PassThrough();
    output = '';
    outputStream.setEncoding('utf8').on('data', (chunk) => { output += chunk; });
    bus = new EventEmitter();

    config = new CliUserConfig();
    const cp = stubInterface<MongoshIOProvider>();
    cp.getHistoryFilePath.returns(path.join(tmpdir.path, 'history'));
    // eslint-disable-next-line @typescript-eslint/require-await
    cp.getConfig.callsFake(async(key: string) => config[key]);
    // eslint-disable-next-line @typescript-eslint/require-await
    cp.setConfig.callsFake(async(key: string, value: any) => { config[key] = value; return 'success'; });
    cp.listConfigOptions.callsFake(() => Object.keys(config));
    cp.exit.callsFake(((code) => bus.emit('test-exit-event', code)) as any);

    ioProvider = cp;

    sp = stubInterface<ServiceProvider>();
    sp.bsonLibrary = bson;
    sp.initialDb = 'test';
    sp.getConnectionInfo.resolves({
      extraInfo: {
        uri: 'mongodb://localhost:27017/test',
        is_localhost: true
      },
      buildInfo: {
        version: '4.4.1'
      }
    });
    serviceProvider = sp;

    mongoshReplOptions = {
      input: input,
      output: outputStream,
      bus: bus,
      ioProvider: ioProvider
    };
    mongoshRepl = new MongoshNodeRepl(mongoshReplOptions);
  });

  let originalEnvVars;
  before(() => {
    originalEnvVars = { ...process.env };
  });
  afterEach(() => {
    Object.assign(process.env, originalEnvVars);
    for (const key of Object.keys(process.env)) {
      if (!(key in originalEnvVars)) {
        delete process.env[key];
      }
    }
  });

  it('throws an error if internal methods are used too early', () => {
    expect(() => mongoshRepl.runtimeState()).to.throw('Mongosh not started yet');
  });

  context('with default options', () => {
    beforeEach(async() => {
      const initialized = await mongoshRepl.initialize(serviceProvider);
      await mongoshRepl.startRepl(initialized);
    });

    it('shows a nice message to say hello', () => {
      expect(output).to.match(/Using MongoDB:\s+4.4.1/);
      expect(output).to.match(/Using Mongosh:/);
      expect(output).to.match(/You can opt-out by running the .*disableTelemetry\(\).* command/);
      expect(config.disableGreetingMessage).to.equal(true);
    });

    it('evaluates javascript', async() => {
      input.write('21 + 13\n');
      await waitEval(bus);
      expect(output).to.include('34');
    });

    it('does not print "undefined"', async() => {
      input.write('const foo = "bar";\n');
      await waitEval(bus);
      expect(output).not.to.include('undefined');
      expect(output).not.to.include('bar');
    });

    it('emits exit events on exit', async() => {
      input.write('.exit\n');
      const [ code ] = await once(bus, 'test-exit-event');
      expect(code).to.equal(undefined);
    });

    it('emits error events when somebody throws something', async() => {
      input.write('throw new Error("meow")\n');
      const [ error ] = await once(bus, 'mongosh:error');
      expect(error.name).to.equal('Error');
      expect(error.message).to.equal('meow');
    });

    it('defaults to MongoshInternalError for exceptions', async() => {
      input.write('throw { code: "ABC", errmsg: "DEF" }\n');
      const [ error ] = await once(bus, 'mongosh:error');
      expect(error.name).to.equal('MongoshInternalError');
    });

    it('handles writer errors by wrapping them in MongoshInternalError', async() => {
      input.write('throw { get message() { throw new Error("surprise!!!"); } }\n');
      const [ error ] = await once(bus, 'mongosh:error');
      expect(error.name).to.equal('MongoshInternalError');
      expect(error.message).to.include('surprise!!!');
    });

    it('prints values when asked to', async() => {
      input.write('print("see this?"); 42\n');
      await waitEval(bus);
      expect(output).to.include('see this?');
    });

    it('forwards telemetry config requests', async() => {
      input.write('disableTelemetry()\n');
      await waitEval(bus);
      expect(ioProvider.setConfig).to.have.been.calledWith('enableTelemetry', false);
      input.write('enableTelemetry()\n');
      await waitEval(bus);
      expect(ioProvider.setConfig).to.have.been.calledWith('enableTelemetry', true);
    });

    it('makes .clear just display the prompt again', async() => {
      await tick();
      const prevOutput = output;
      input.write('.clear\n');
      await tick();
      expect(output.slice(prevOutput.length)).to.match(/> $/);
    });

    it('keeps variables defined before .clear', async() => {
      input.write('a = 14987135; 0\n');
      await waitEval(bus);
      input.write('.clear\n');
      await tick();
      expect(output).not.to.include('14987135');
      input.write('a\n');
      await waitEval(bus);
      expect(output).to.include('14987135');
    });

    it('prints a fancy syntax error when encountering one', async() => {
      input.write(',cat,\n');
      await waitEval(bus);
      expect(output).to.include('SyntaxError: Unexpected token');
      expect(output).to.include(`
> 1 | ,cat,
    | ^
  2 |`);
      expect(output).to.not.match(/ at [^ ]+ \n/g); // <- no stack trace lines
    });

    it('can enter multiline code', async() => {
      for (const line of multilineCode.split('\n')) {
        input.write(line + '\n');
        await waitEval(bus);
      }
      // Two ... because we entered two incomplete lines.
      expect(output).to.include('... ... 987');
      expect(output).not.to.include('Error');
    });

    it('Mongosh errors do not have a stack trace', async() => {
      input.write('db.auth()\n');
      await waitEval(bus);
      expect(output).to.include('MongoshInvalidInputError:');
      expect(output).not.to.include(' at ');
    });

    it('prints help', async() => {
      input.write('help()\n');
      await waitEval(bus);
      expect(output).to.match(/connect\s*Create a new connection and return the Database object/);
    });

    it('prints help for cursor commands', async() => {
      input.write('db.coll.find().hasNext.help()\n');
      await waitEval(bus);
      expect(output).to.include('returns true if the cursor returned by the');
    });

    it('prints Date objects using the ISODate constructor variant', async() => {
      input.write('new Date(1620143373000)\n');
      await waitEval(bus);
      expect(output).to.include('ISODate("2021-05-04T15:49:33.000Z")');
    });

    it('handles a long series of errors', async function() {
      input.write('-asdf();\n'.repeat(20));
      await waitEval(bus);
      expect(mongoshRepl.runtimeState().repl.listenerCount('SIGINT')).to.equal(1);
    });

    it('does not run statements that should not run', async() => {
      input.write(`
      sleep(0);
      throw new Error();
      if (false)
        print ('!this should not run!');
      `);
      for (let i = 0; i < 20; i++) {
        await tick();
      }
      expect(output).not.to.include('!this should not run!');
    });

    it('_ returns the last result', async() => {
      input.write('42\n');
      await waitEval(bus);
      output = '';

      input.write('_\n');
      await waitEval(bus);
      expect(output).to.include('42');
    });

    it('_ can be used like the last result in expressions', async() => {
      input.write('({ foo: "bar", baz: "quux" });\n');
      await waitEval(bus);
      output = '';

      input.write('JSON.stringify(_)\n');
      await waitEval(bus);
      expect(output).to.include('{"foo":"bar","baz":"quux"}');
    });

    it('_error yields the last exception', async() => {
      input.write('throw new Error("blah")\n');
      await waitEval(bus);
      output = '';

      input.write('_error.message\n');
      await waitEval(bus);
      expect(output).to.include('blah');
    });
  });

  context('with terminal: true', () => {
    const tab = async() => {
      await tick();
      input.write('\u0009');
    };
    const tabtab = async() => {
      await tab();
      await tab();
    };

    beforeEach(async() => {
      // Node.js uses $TERM to determine what level of functionality to provide
      // in a way that goes beyond color support, in particular TERM=dumb
      // disables features like autoformatting. We don't want that to happen
      // depending on the outer environment in which we are being run.
      process.env.TERM = 'xterm-256color';
      mongoshRepl = new MongoshNodeRepl({
        ...mongoshReplOptions,
        nodeReplOptions: { terminal: true }
      });
      const initialized = await mongoshRepl.initialize(serviceProvider);
      await mongoshRepl.startRepl(initialized);
    });

    it('provides an editor action', async() => {
      input.write('.editor\n');
      await tick();
      expect(output).to.include('Entering editor mode');
      input.write('2**16+1\n');
      input.write('\u0004'); // Ctrl+D
      await waitEval(bus);
      expect(output).to.include('65537');
    });

    it('does not stop input when autocompleting during .editor', async() => {
      input.write('.editor\n');
      await tick();
      expect(output).to.include('Entering editor mode');
      output = '';
      input.write('db.');
      await tabtab();
      await tick();
      input.write('version()\n');
      input.write('\u0004'); // Ctrl+D
      await waitEval(bus);
      expect(output).to.include('Error running command serverBuildInfo');
    });

    it('can enter multiline code', async() => {
      for (const line of multilineCode.split('\n')) {
        input.write(line + '\n');
        await waitEval(bus);
      }
      expect(output).to.include('987');
      expect(output).not.to.include('Error');
    });

    it('can enter multiline code with delays after newlines', async() => {
      for (const line of multilineCode.split('\n')) {
        input.write(line + '\n');
        await waitEval(bus);
        await delay(150);
      }
      expect(output).to.include('987');
      expect(output).not.to.include('Error');
    });

    it('allows to enter and fix recoverable errors', async() => {
      input.write('24 %\n');
      await waitEval(bus);
      expect(output).to.not.include('Error');

      input.write('6\n');
      await waitEval(bus);
      expect(output).to.include(0);
      expect(output).to.not.include('Error');
    });

    it('behaves correctly on non-recoverable multi-line errors', async() => {
      input.write('24 %\n');
      await waitEval(bus);
      expect(output).to.not.include('Error');

      input.write(';\n');
      await waitEval(bus);
      expect(output).to.not.include('MongoshInternalError');
      expect(output).to.include('SyntaxError');
    });

    it('pressing Ctrl+C twice exits the shell', async() => {
      input.write('\u0003');
      await tick();
      expect(output).to.match(/To exit, press (Ctrl\+C|\^C) again/);
      input.write('\u0003');
      const [ code ] = await once(bus, 'test-exit-event');
      expect(code).to.equal(undefined);
    });

    it('pressing Ctrl+D exits the shell', async() => {
      input.write('\u0004');
      const [ code ] = await once(bus, 'test-exit-event');
      expect(code).to.equal(undefined);
    });

    context('autocompletion', () => {
      it('autocompletes collection methods', async() => {
        input.write('db.coll.');
        await tabtab();
        await tick();
        expect(output).to.include('db.coll.updateOne');
      });
      it('autocompletes shell-api methods (once)', async() => {
        input.write('vers');
        await tabtab();
        await tick();
        expect(output).to.include('version');
        expect(output).to.not.match(/version[ \t]+version/);
      });
      it('autocompletes async shell api methods', async() => {
        input.write('db.coll.find().');
        await tabtab();
        await tick();
        expect(output).to.include('db.coll.find().close');
      });
      it('autocompletes local variables', async() => {
        input.write('let somelongvariable = 0\n');
        await waitEval(bus);
        output = '';
        input.write('somelong');
        await tabtab();
        await tick();
        expect(output).to.include('somelongvariable');
      });
      it('autocompletes partial repl commands', async() => {
        input.write('.e');
        await tabtab();
        await tick();
        expect(output).to.include('editor');
        expect(output).to.include('exit');
      });
      it('autocompletes full repl commands', async() => {
        input.write('.ed');
        await tabtab();
        await tick();
        expect(output).to.include('.editor');
        expect(output).not.to.include('exit');
      });
      it('autocompletion during .editor does not reset the prompt', async() => {
        input.write('.editor\n');
        await tick();
        output = '';
        expect((mongoshRepl.runtimeState().repl as any)._prompt).to.equal('');
        input.write('db.');
        await tabtab();
        await tick();
        input.write('foo\nbar\n');
        expect((mongoshRepl.runtimeState().repl as any)._prompt).to.equal('');
        input.write('\u0003'); // Ctrl+C for abort
        await tick();
        expect((mongoshRepl.runtimeState().repl as any)._prompt).to.equal('test> ');
        expect(stripAnsi(output)).to.equal('db.foo\r\nbar\r\n\r\ntest> ');
      });
      it('does not autocomplete tab-indented code', async() => {
        output = '';
        input.write('\t\tfoo');
        await tick();
        expect(output).to.equal('\t\tfoo');
      });
    });

    context('history support', () => {
      const arrowUp = '\x1b[A';

      for (const { mode, prefill } of [
        { mode: 'with no existing history', prefill: 0 },
        { mode: 'with existing history', prefill: 100 }
      ]) {
        // eslint-disable-next-line no-loop-func
        context(mode, () => {
          let getHistory: () => string[];

          beforeEach(() => {
            const { history } = mongoshRepl.runtimeState().repl as any;
            getHistory = () => history.filter(line => !line.startsWith('prefill-'));
            for (let i = 0; i < prefill; i++) {
              history.unshift(`prefill-${i}`);
            }
          });

          it('looks up existing entries, if there are any', async() => {
            output = '';
            input.write(arrowUp);
            await tick();
            if (prefill === 0) {
              expect(output).to.equal('');
            } else {
              expect(output).to.include(`prefill-${prefill - 1}`);
            }
          });

          it('works for single-line input', async() => {
            output = '';
            input.write(`let a = 16\na = a**2\n${arrowUp}\n`);
            await tick();
            expect(output).to.include('256');
            input.write(`${arrowUp}\n`);
            await tick();
            expect(output).to.include('65536');
            expect(getHistory()).to.deep.equal([
              'a = a**2',
              'let a = 16'
            ]);
          });

          it('works for multi-line input', async() => {
            output = '';
            input.write('obj = ({ foo: \n');
            await tick();
            input.write('"bar" })\n');
            await tick();
            expect(mongoshRepl.runtimeState().repl.context.obj).to.deep.equal({ foo: 'bar' });
            expect(output).not.to.include('obj = ({ foo: "bar" })');
            expect(output).not.to.include('obj = { foo: "bar" }');

            output = '';
            input.write(`${arrowUp}\n`);
            await tick();
            expect(output).to.include('obj = { foo: "bar" }');
            expect(getHistory()).to.deep.equal([
              'obj = { foo: "bar" }'
            ]);
          });

          it('works for multi-line input from .editor', async() => {
            output = '';
            input.write('.editor\n');
            await tick();
            input.write('obj = ({ foo: \n');
            await tick();
            input.write('"baz" })\n');
            await tick();
            input.write('\u0004'); // Ctrl+D
            await tick();
            expect(mongoshRepl.runtimeState().repl.context.obj).to.deep.equal({ foo: 'baz' });
            expect(output).not.to.include('obj = ({ foo: "baz" })');
            expect(output).not.to.include('obj = { foo: "baz" }');

            output = '';
            input.write(`${arrowUp}\n`);
            await tick();
            expect(output).to.include('obj = { foo: "baz" }');
            expect(getHistory()).to.deep.equal([
              'obj = { foo: "baz" }',
              '.editor'
            ]);
          });

          it('works for multi-line input when a prompt has been set before', async() => {
            input.write('prompt = () => "abc> "\n');
            await tick();

            output = '';
            input.write('obj = ({ foo: \n');
            await tick();
            input.write('"bar" })\n');
            await tick();
            expect(mongoshRepl.runtimeState().repl.context.obj).to.deep.equal({ foo: 'bar' });
            expect(output).not.to.include('obj = ({ foo: "bar" })');
            expect(output).not.to.include('obj = { foo: "bar" }');

            output = '';
            input.write(`${arrowUp}\n`);
            await tick();
            expect(output).to.include('obj = { foo: "bar" }');
            expect(getHistory()).to.deep.equal([
              'obj = { foo: "bar" }',
              'prompt = () => "abc> "'
            ]);
          });

          it('works for interrupted multi-line input', async() => {
            input.write('const a = 20\n');
            await tick();
            input.write('obj = ({ foo: \n');
            await tick();
            input.write('\u0003'); // Ctrl+C
            await tick();

            output = '';
            input.write(`${arrowUp}`);
            await tick();
            expect(output).to.include('obj = ({ foo: ');

            output = '';
            input.write(`${arrowUp}`);
            await tick();
            expect(output).to.include('const a = 20');

            expect(getHistory()).to.deep.equal([
              'obj = ({ foo: ',
              'const a = 20'
            ]);
          });

          it('does not crash if hitting enter and then up', async() => {
            input.write('\n');
            await once(mongoshRepl.runtimeState().repl, 'flushHistory');
            input.write(`${arrowUp}`);
            await tick();
          });

          context('redaction', () => {
            it('removes sensitive commands by default', async() => {
              input.write('connect\n');
              await once(mongoshRepl.runtimeState().repl, 'flushHistory');
              input.write('connection\n');
              await once(mongoshRepl.runtimeState().repl, 'flushHistory');
              input.write('db.test.insert({ email: "foo@example.org" })\n');
              await once(mongoshRepl.runtimeState().repl, 'flushHistory');

              expect(getHistory()).to.deep.equal([
                'db.test.insert({ email: "foo@example.org" })',
                'connection' // connection is okay, connect is considered sensitive
              ]);
            });

            it('keeps sensitive commands when asked to', async() => {
              input.write('config.set("redactHistory", "keep");\n');
              await tick();
              input.write('connect\n');
              await once(mongoshRepl.runtimeState().repl, 'flushHistory');
              input.write('connection\n');
              await once(mongoshRepl.runtimeState().repl, 'flushHistory');
              input.write('db.test.insert({ email: "foo@example.org" })\n');
              await once(mongoshRepl.runtimeState().repl, 'flushHistory');

              expect(getHistory()).to.deep.equal([
                'db.test.insert({ email: "foo@example.org" })',
                'connection',
                'connect',
                'config.set("redactHistory", "keep");'
              ]);
            });

            it('removes other sensitive data when asked to', async() => {
              input.write('config.set("redactHistory", "remove-redact");\n');
              await tick();
              input.write('connect\n');
              await once(mongoshRepl.runtimeState().repl, 'flushHistory');
              input.write('connection\n');
              await once(mongoshRepl.runtimeState().repl, 'flushHistory');
              input.write('db.test.insert({ email: "foo@example.org" })\n');
              await once(mongoshRepl.runtimeState().repl, 'flushHistory');

              expect(getHistory()).to.deep.equal([
                'db.test.insert({ email: "<email>" })',
                'connection',
                'config.set("redactHistory", "remove-redact");'
              ]);
            });
          });
        });
      }
    });

    context('with modified config values', () => {
      it('controls inspect compact option', async() => {
        input.write('config.set("inspectCompact", false)\n');
        await waitEval(bus);
        expect(output).to.include('Setting "inspectCompact" has been changed');

        output = '';
        input.write('({a:{b:{}}})\n');
        await waitEval(bus);
        expect(stripAnsi(output)).to.include('{\n  a: {\n    b: {}\n  }\n}\n');
      });

      it('controls inspect depth', async() => {
        input.write('config.set("inspectDepth", 2)\n');
        await waitEval(bus);
        expect(output).to.include('Setting "inspectDepth" has been changed');

        output = '';
        input.write('({a:{b:{c:{d:{e:{f:{g:{h:{}}}}}}}}})\n');
        await waitEval(bus);
        expect(stripAnsi(output).replace(/\s+/g, ' ')).to.include('{ a: { b: { c: [Object] } } }');

        input.write('config.set("inspectDepth", 4)\n');
        await waitEval(bus);
        output = '';
        input.write('({a:{b:{c:{d:{e:{f:{g:{h:{}}}}}}}}})\n');
        await waitEval(bus);
        expect(stripAnsi(output).replace(/\s+/g, ' ')).to.include('{ a: { b: { c: { d: { e: [Object] } } } } }');
      });

      it('controls history length', async() => {
        input.write('config.set("historyLength", 2)\n');
        await waitEval(bus);

        let i = 2;
        while (!output.includes('65536')) {
          input.write(`${i} + ${i}\n`);
          await waitEval(bus);
          i *= 2;
        }

        const { history } = mongoshRepl.runtimeState().repl as any;
        expect(history).to.have.lengthOf(2);
      });

      it('controls stack trace display', async() => {
        output = '';
        input.write('throw new Error("yellow")\n');
        await waitEval(bus);
        expect(stripAnsi(output)).to.match(/Error: yellow\n(test> )+$/);

        input.write('config.set("showStackTraces", true)\n');
        await waitEval(bus);
        expect(output).to.include('Setting "showStackTraces" has been changed');

        output = '';
        input.write('throw new Error("orange")\n');
        await waitEval(bus);
        expect(stripAnsi(output)).to.match(/Error: orange\n +at\b/);
      });

      it('bails out when setting invalid config options', async() => {
        input.write('config.set("historyLength", true)\n');
        await waitEval(bus);
        expect(output).to.include('Cannot set option "historyLength": historyLength must be a positive integer');
        expect((mongoshRepl.runtimeState().repl as any).historySize).to.equal(1000);
      });
    });

    it('refreshes the prompt if a window resize occurs', async() => {
      output = '';
      outputStream.emit('resize');
      await tick();
      expect(stripAnsi(output)).to.equal('test> ');
    });

    it('does not refresh the prompt if a window resize occurs while evaluating', async() => {
      let resolveInProgress;
      mongoshRepl.runtimeState().repl.context.inProgress =
        new Promise(resolve => { resolveInProgress = resolve; });
      input.write('inProgress\n');
      await tick();

      output = '';
      outputStream.emit('resize');
      await tick();
      // The empty space is because the Node.js readline implementation still
      // tries to make sure that something is printed when a resize happens.
      // This is okay, though, because it also moves the cursor back to where
      // it originally was.
      expect(stripAnsi(output)).to.equal(' ');

      output = '';
      resolveInProgress();
      await tick();
      expect(stripAnsi(output)).to.equal('\ntest> ');
    });

    context('thrown non-Errors', () => {
      it('allows `throw null`', async() => {
        output = '';
        input.write('throw null;\n');
        await waitEval(bus);
        // We do verify that both `Error` and `null` are syntax-highlighted here.
        expect(output).to.match(/\x1b\[\d+mError\x1b\[\d+m: \x1b\[\d+mnull\x1b\[\d+m/);
      });

      it('allows `throw number`', async() => {
        output = '';
        input.write('throw 123;\n');
        await waitEval(bus);
        // We do verify that both `Error` and `123` are syntax-highlighted here.
        expect(output).to.match(/\x1b\[\d+mError\x1b\[\d+m: \x1b\[\d+m123\x1b\[\d+m/);
      });
    });
  });

  context('with fake TTY', () => {
    beforeEach(async() => {
      process.env.TERM = 'xterm-256color';
      Object.assign(outputStream, fakeTTYProps);
      Object.assign(input, fakeTTYProps);
      mongoshRepl = new MongoshNodeRepl(mongoshReplOptions);
      const initialized = await mongoshRepl.initialize(serviceProvider);
      await mongoshRepl.startRepl(initialized);
      expect(mongoshRepl.getFormatOptions().colors).to.equal(true);
    });

    it('colorizes input statement', async() => {
      input.write('const cat = "Nori"');
      await tick();
      expect(output).to.match(/const(\x1b\[.*m)+ cat = (\x1b\[.*m)+"(\x1b\[.*m)+N(\x1b\[.*m)+o(\x1b\[.*m)+r(\x1b\[.*m)+i(\x1b\[.*m)+"(\x1b\[.*m)+/);
    });

    it('colorizes input function', async() => {
      input.write('function add (a, b) { return a + b }');
      await tick();
      expect(output).to.match(/function(\x1b\[.*m)+ (\x1b\[.*m)+a(\x1b\[.*m)+d(\x1b\[.*m)+d(\x1b\[.*m)+ \(a, b\) \{ retur\x08+(\x1b\[.*m)+return(\x1b\[.*m)+ a \+ b/);
    });

    it('colorizes input integers', async() => {
      input.write('const sum = 42 + 7');
      await tick();
      expect(output).to.match(/const(\x1b\[.*m)+ sum = (\x1b\[.*m)+4(\x1b\[.*m)+2(\x1b\[.*m)+ \+ (\x1b\[.*m)+7(\x1b\[.*m)+/);
    });

    it('colorizes output', async() => {
      input.write('55 + 89\n');
      await waitEval(bus);
      expect(output).to.match(/\x1b\[.*m144\x1b\[.*m/);
    });

    it('clears the console when console.clear() is used', async() => {
      output = '';
      input.write('console.clear()\n');
      await tick();
      expect(output).to.match(/\x1b\[[0-9]+J/); // 'CSI n J' is clear display
    });

    it('clears the console when cls is used', async() => {
      output = '';
      input.write('cls\n');
      await tick();
      expect(output).to.match(/\x1b\[[0-9]+J/); // 'CSI n J' is clear display
    });

    context('user prompts', () => {
      beforeEach(() => {
        // No boolean equivalent for 'passwordPrompt' in the API, so provide one:
        mongoshRepl.runtimeState().repl.context.booleanPrompt = (question) => {
          return Object.assign(mongoshRepl.onPrompt(question, 'yesno'), {
            [Symbol.for('@@mongosh.syntheticPromise')]: true
          });
        };
      });

      it('can ask for passwords', async() => {
        input.write('const pw = passwordPrompt()\n');
        await tick();
        expect(output).to.include('Enter password');

        output = '';
        input.write('hello!\n');
        await waitEval(bus);
        expect(output).not.to.include('hello!');

        output = '';
        input.write('pw\n');
        await waitEval(bus);
        expect(output).to.include('hello!');
      });

      it('can abort asking for passwords', async() => {
        input.write('pw = passwordPrompt(); 0\n');
        await tick();
        expect(output).to.include('Enter password');

        output = '';
        input.write('hello!\u0003'); // Ctrl+C
        await waitEval(bus);
        expect(output).not.to.include('hello!');
        expect(output).to.include('aborted by the user');

        output = '';
        input.write('pw\n');
        await waitEval(bus);
        expect(output).not.to.include('hello!');
        expect(output).to.include('ReferenceError');
      });

      it('can ask for yes/no answers', async() => {
        input.write('const answer = booleanPrompt("shall we play a game?")\n');
        await tick();
        expect(output).to.include('shall we play a game?:');

        input.write('Y');
        await waitEval(bus);
        expect(output).to.include('shall we play a game?: Y\n');
        expect(output).not.to.include('yes');

        output = '';
        input.write('answer\n');
        await waitEval(bus);
        expect(output).to.include('yes');
      });

      it('repeats yes/no questions if not answered with Y/N', async() => {
        input.write('const answer = booleanPrompt("shall we play a game?")\n');
        await tick();
        expect(output).to.include('shall we play a game?:');

        input.write('q');
        await tick();
        expect(output).to.include('shall we play a game?: q\nPlease enter Y or N: shall we play a game?:');
        expect(output).not.to.include('yes');

        output = '';
        input.write('n');
        await waitEval(bus);
        expect(output).to.include('n\n');
        expect(output).not.to.include('no');

        output = '';
        input.write('answer\n');
        await waitEval(bus);
        expect(output).to.include('no');
      });

      it('allows defaults for yes/no questions', async() => {
        input.write('const answer = booleanPrompt("shall we play a game?")\n');
        await tick();
        expect(output).to.include('shall we play a game?:');

        input.write('\n');
        await waitEval(bus);

        output = '';
        input.write('[answer]\n');
        await waitEval(bus);
        expect(stripAnsi(output)).to.include("[ '' ]");
      });

      it('allows interrupting yes/no questions', async() => {
        input.write('answer = booleanPrompt("shall we play a game?")\n');
        await tick();
        expect(output).to.include('shall we play a game?:');

        input.write('\u0003'); // Ctrl+C
        await waitEval(bus);
        expect(output).to.include('aborted by the user');

        output = '';
        input.write('answer\n');
        await waitEval(bus);
        expect(output).to.include('ReferenceError');
      });
    });
  });

  context('with somewhat unreachable history file', () => {
    const fs = require('fs');
    let origReadFile: any;

    before(() => {
      origReadFile = fs.readFile;
      fs.readFile = (...args: any[]) => process.nextTick(args[args.length - 1], new Error());
    });

    after(() => {
      fs.readFile = origReadFile;
    });

    it('warns about the unavailable history file support', async() => {
      await mongoshRepl.initialize(serviceProvider);
      expect(output).to.include('Error processing history file');
    });
  });

  context('when the config says to skip the telemetry greeting message', () => {
    beforeEach(async() => {
      config.disableGreetingMessage = true;
      await mongoshRepl.initialize(serviceProvider);
    });

    it('skips telemetry intro', () => {
      expect(output).not.to.match(/You can opt-out by running the .*disableTelemetry\(\).* command/);
    });
  });

  context('startup warnings', () => {
    context('when connecting with nodb', () => {
      beforeEach(async() => {
        mongoshReplOptions.shellCliOptions = {
          nodb: true
        };
        mongoshRepl = new MongoshNodeRepl(mongoshReplOptions);
        const initialized = await mongoshRepl.initialize(serviceProvider);
        await mongoshRepl.startRepl(initialized);
      });

      it('does not show warnings', () => {
        expect(output).to.not.contain('The server generated these startup warnings when booting');
      });
    });

    for (const variant of ['structured', 'unstructured']) {
      // eslint-disable-next-line no-loop-func
      context(`when connecting to a db with ${variant} logs`, () => {
        const logLines = variant === 'structured' ? [
          '{"t":{"$date":"2020-12-07T07:51:30.691+01:00"},"s":"W",  "c":"CONTROL",  "id":20698,   "ctx":"main","msg":"***** SERVER RESTARTED *****","tags":["startupWarnings"]}',
          '{"t":{"$date":"2020-12-07T07:51:32.763+01:00"},"s":"W",  "c":"CONTROL",  "id":22120,   "ctx":"initandlisten","msg":"Access control is not enabled for the database. Read and write access to data and configuration is unrestricted","tags":["startupWarnings"]}'
        ] : [
          '2021-05-03T14:50:59.815+0200 I  CONTROL  [main] ***** SERVER RESTARTED *****',
          '2021-05-03T14:50:59.815+0200 I  CONTROL  [initandlisten] ** WARNING: Access control is not enabled for the database.',
          '2021-05-03T14:50:59.815+0200 I  CONTROL  [initandlisten] **          Read and write access to data and configuration is unrestricted.'
        ];
        it('they are shown as returned by database', async() => {
          sp.runCommandWithCheck.withArgs(ADMIN_DB, {
            getLog: 'startupWarnings'
          }, {}).resolves({ ok: 1, log: logLines });
          await mongoshRepl.initialize(serviceProvider);

          expect(output).to.contain('The server generated these startup warnings when booting');
          logLines.forEach(l => {
            const { timestamp, message } = parseAnyLogEntry(l);
            expect(output).to.contain(`${timestamp}: ${message}`);
          });
        });
        it('they are shown even if the log format cannot be parsed', async() => {
          sp.runCommandWithCheck.withArgs(ADMIN_DB, {
            getLog: 'startupWarnings'
          }, {}).resolves({ ok: 1, log: ['Not JSON'] });
          await mongoshRepl.initialize(serviceProvider);

          expect(output).to.contain('The server generated these startup warnings when booting');
          expect(output).to.contain('Unexpected log line format: Not JSON');
        });
        it('does not show anything when there are no warnings', async() => {
          let error = null;
          bus.on('mongosh:error', err => { error = err; });
          sp.runCommandWithCheck.withArgs(ADMIN_DB, {
            getLog: 'startupWarnings'
          }, {}).resolves({ ok: 1, log: [] });
          await mongoshRepl.initialize(serviceProvider);

          expect(output).to.not.contain('The server generated these startup warnings when booting');
          expect(error).to.be.null;
        });
        it('does not show anything if retrieving the warnings fails with exception', async() => {
          const expectedError = new Error('failed');
          let error = null;
          bus.on('mongosh:error', err => { error = err; });
          sp.runCommandWithCheck.withArgs(ADMIN_DB, {
            getLog: 'startupWarnings'
          }, {}).rejects(expectedError);
          await mongoshRepl.initialize(serviceProvider);

          expect(output).to.not.contain('The server generated these startup warnings when booting');
          expect(output).to.not.contain('Error');
          expect(error).to.equal(expectedError);
        });
        it('does not show anything if retrieving the warnings returns undefined', async() => {
          let error = null;
          bus.on('mongosh:error', err => { error = err; });
          sp.runCommandWithCheck.withArgs(ADMIN_DB, {
            getLog: 'startupWarnings'
          }, {}).resolves(undefined);
          await mongoshRepl.initialize(serviceProvider);

          expect(output).to.not.contain('The server generated these startup warnings when booting');
          expect(output).to.not.contain('Error');
          expect(error).to.be.instanceof(MongoshCommandFailed);
        });
      });
    }
  });

  context('prompt', () => {
    it('shows the enterprise info from the default prompt', async() => {
      sp.getConnectionInfo.resolves({
        extraInfo: {
          uri: 'mongodb://localhost:27017/test',
          is_localhost: true
        },
        buildInfo: {
          version: '4.4.1',
          modules: ['enterprise']
        }
      });

      const initialized = await mongoshRepl.initialize(serviceProvider);
      await mongoshRepl.startRepl(initialized);
      expect(output).to.contain('Enterprise test> ');
    });

    it('defaults if an error occurs', async() => {
      const initialized = await mongoshRepl.initialize(serviceProvider);
      await mongoshRepl.startRepl(initialized);
      expect(output).to.contain('> ');
      mongoshRepl.runtimeState().internalState.getDefaultPrompt = () => { throw new Error('no prompt'); };

      input.write('21 + 21\n');
      await waitEval(bus);
      expect(output).to.contain('> ');
      expect(output).to.not.contain('error');
    });

    it('changes the prompt when db is reassigned', async() => {
      const connectionInfo = {
        extraInfo: {
          uri: 'mongodb://localhost:27017/test',
          is_localhost: true
        },
        buildInfo: {
          version: '4.4.1',
          modules: ['enterprise']
        }
      };

      sp.getConnectionInfo.resolves(connectionInfo);
      // eslint-disable-next-line @typescript-eslint/require-await
      sp.getNewConnection.callsFake(async() => {
        Object.assign(connectionInfo.extraInfo, {
          is_localhost: true,
          is_data_lake: true
        });
        return sp;
      });
      sp.platform = 2; // ReplPlatform.CLI ... let's maybe stop using an enum for this

      const initialized = await mongoshRepl.initialize(serviceProvider);
      await mongoshRepl.startRepl(initialized);
      expect(output).to.contain('Enterprise test> ');

      input.write('db = Mongo("foo").getDB("bar")\n');
      await waitEval(bus);
      expect(output).to.contain('AtlasDataLake bar> ');
    });

    context('user-provided prompt', () => {
      beforeEach(async() => {
        const initialized = await mongoshRepl.initialize(serviceProvider);
        await mongoshRepl.startRepl(initialized);
        output = '';
      });

      it('accepts a custom user-provided prompt string', async() => {
        input.write('prompt = "abc> "; 0\n');
        await waitEval(bus);
        expect(output).to.contain('abc> ');
      });

      it('accepts a custom user-provided prompt function', async() => {
        input.write('prompt = () => { return "foo" + "> " }; 0\n');
        await waitEval(bus);
        expect(output).to.contain('foo> ');
      });

      it('ignores user-provided non-strings', async() => {
        input.write('prompt = 123; 0\n');
        await waitEval(bus);
        expect(output).not.to.contain('123');
        expect(output).to.contain('> ');
      });

      it('ignores user-provided non-string-returning functions', async() => {
        input.write('prompt = () => 123; 0\n');
        await waitEval(bus);
        expect(output).not.to.contain('123');
        expect(output).to.contain('> ');
      });

      it('ignores user-provided throwing functions', async() => {
        input.write('prompt = () => { throw new Error("foobar") }; 0\n');
        await waitEval(bus);
        expect(output).not.to.contain('foobar');
        expect(output).to.contain('> ');
      });
    });
  });

  context('before the REPL starts', () => {
    beforeEach(async() => {
      await mongoshRepl.initialize(serviceProvider);
      // No .start() call here.
    });

    it('does not show a prompt', async() => {
      await mongoshRepl.loadExternalCode('setImmediate(() => { throw new Error(); })', '<eval>');
      await tick();
      expect(output).to.include('Error: \n');
      expect(output).not.to.include('>');
    });
  });

  context('with nodb', () => {
    beforeEach(async() => {
      mongoshReplOptions.shellCliOptions = {
        nodb: true
      };
      mongoshRepl = new MongoshNodeRepl(mongoshReplOptions);
      await mongoshRepl.initialize(serviceProvider);
    });

    it('does not include MongoDB version', () => {
      expect(output).to.not.match(/Using MongoDB/);
    });
  });
});
