/* eslint-disable no-control-regex */
import { ServiceProvider, bson } from '@mongosh/service-provider-core';
import MongoshNodeRepl, { MongoshConfigProvider, MongoshNodeReplOptions } from './mongosh-repl';
import { PassThrough, Duplex } from 'stream';
import path from 'path';
import { EventEmitter, once } from 'events';
import { expect, tick, useTmpdir, fakeTTYProps } from '../test/repl-helpers';
import { stubInterface } from 'ts-sinon';
import { promisify } from 'util';

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
  let configProvider: MongoshConfigProvider;
  let serviceProvider: ServiceProvider;
  let config: Record<string, any>;
  const tmpdir = useTmpdir();

  beforeEach(async() => {
    input = new PassThrough();
    outputStream = new PassThrough();
    output = '';
    outputStream.setEncoding('utf8').on('data', (chunk) => { output += chunk; });
    bus = new EventEmitter();

    config = {};
    const cp = stubInterface<MongoshConfigProvider>();
    cp.getHistoryFilePath.returns(path.join(tmpdir.path, 'history'));
    cp.getConfig.callsFake(async(key: string) => config[key]);
    cp.setConfig.callsFake(async(key: string, value: any) => { config[key] = value; });

    configProvider = cp;

    const sp = stubInterface<ServiceProvider>();
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
      configProvider: configProvider
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

  it('throws an error if internal methods are used too early', async() => {
    expect(() => mongoshRepl.writer(new Error())).to.throw('Mongosh not started yet');
  });

  context('with default options', () => {
    beforeEach(async() => {
      await mongoshRepl.start(serviceProvider);
    });

    it('shows a nice message to say hello', () => {
      expect(output).to.match(/Using MongoDB:\s+4.4.1/);
      expect(output).to.match(/Using Mongosh Beta:/);
      expect(output).to.match(/You can opt-out by running the .*disableTelemetry\(\).* command/);
    });

    it('evaluates javascript', async() => {
      input.write('21 + 13\n');
      await tick();
      expect(output).to.include('34');
    });

    it('does not print "undefined"', async() => {
      input.write('const foo = "bar";\n');
      await tick();
      expect(output).not.to.include('undefined');
      expect(output).not.to.include('bar');
    });

    it('emits exit events on exit', async() => {
      input.write('.exit\n');
      const [ code ] = await once(bus, 'mongosh:exit');
      expect(code).to.equal(0);
    });

    it('emits error events when somebody throws something', async() => {
      input.write('throw new Error("meow")\n');
      const [ error ] = await once(bus, 'mongosh:error');
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
      await tick();
      expect(output).to.include('see this?');
    });

    it('forwards telemetry config requests', async() => {
      input.write('disableTelemetry()\n');
      await tick();
      expect(configProvider.setConfig).to.have.been.calledWith('enableTelemetry', false);
      input.write('enableTelemetry()\n');
      await tick();
      expect(configProvider.setConfig).to.have.been.calledWith('enableTelemetry', true);
    });

    it('makes .clear just display the prompt again', async() => {
      await tick();
      const prevOutput = output;
      input.write('.clear\n');
      await tick();
      expect(output.slice(prevOutput.length)).to.equal('> ');
    });

    it('keeps variables defined before .clear', async() => {
      input.write('a = 14987135; 0\n');
      await tick();
      input.write('.clear\n');
      await tick();
      expect(output).not.to.include('14987135');
      input.write('a\n');
      await tick();
      expect(output).to.include('14987135');
    });

    it('prints a fancy syntax error when encountering one', async() => {
      input.write('<cat>\n');
      await tick();
      expect(output).to.include('SyntaxError: Unexpected token');
      expect(output).to.include(`
> 1 | <cat>
    | ^
  2 |\u0020

>`); // ← This is the prompt – We’re seeing no stack trace for syntax errors.
    });

    it('can enter multiline code', async() => {
      for (const line of multilineCode.split('\n')) {
        input.write(line + '\n');
        await tick();
      }
      // Two ... because we entered two incomplete lines.
      expect(output).to.include('... ... 987');
      expect(output).not.to.include('Error');
    });

    it('Mongosh errors do not have a stack trace', async() => {
      input.write('db.auth()\n');
      await tick();
      expect(output).to.include('MongoshInvalidInputError:');
      expect(output).not.to.include(' at ');
    });

    it('prints help', async() => {
      input.write('help()\n');
      await tick();
      expect(output).to.match(/connect\s*Create a new connection and return the Database object/);
    });

    it('prints help for cursor commands', async() => {
      input.write('db.coll.find().hasNext.help()\n');
      await tick();
      expect(output).to.include('returns true if the cursor returned by the');
    });
  });

  context('with terminal: true', () => {
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
      await mongoshRepl.start(serviceProvider);
    });

    it('provides an editor action', async() => {
      input.write('.editor\n');
      await tick();
      expect(output).to.include('Entering editor mode');
      input.write('2**16+1\n');
      input.write('\u0004'); // Ctrl+D
      await tick();
      expect(output).to.include('65537');
    });

    it('can enter multiline code', async() => {
      for (const line of multilineCode.split('\n')) {
        input.write(line + '\n');
        await tick();
      }
      expect(output).to.include('987');
      expect(output).not.to.include('Error');
    });

    it('can enter multiline code with delays after newlines', async() => {
      for (const line of multilineCode.split('\n')) {
        input.write(line + '\n');
        await delay(150);
      }
      expect(output).to.include('987');
      expect(output).not.to.include('Error');
    });

    it('pressing Ctrl+C twice exits the shell', async() => {
      input.write('\u0003');
      await tick();
      expect(output).to.match(/To exit, press (Ctrl\+C|\^C) again/);
      input.write('\u0003');
      const [ code ] = await once(bus, 'mongosh:exit');
      expect(code).to.equal(0);
    });

    it('pressing Ctrl+D exits the shell', async() => {
      input.write('\u0004');
      const [ code ] = await once(bus, 'mongosh:exit');
      expect(code).to.equal(0);
    });

    it('autocompletes', async() => {
      input.write('db.coll.\u0009\u0009'); // U+0009 is TAB
      await tick();
      expect(output).to.include('db.coll.updateOne');
    });
  });

  context('with fake TTY', () => {
    beforeEach(async() => {
      process.env.TERM = 'xterm-256color';
      Object.assign(outputStream, fakeTTYProps);
      Object.assign(input, fakeTTYProps);
      mongoshRepl = new MongoshNodeRepl(mongoshReplOptions);
      await mongoshRepl.start(serviceProvider);
      expect(mongoshRepl.getFormatOptions().colors).to.equal(true);
    });

    it('colorizes input statement', async() => {
      input.write('const cat = "Nori"');
      await tick();
      expect(output).to.match(/const(\x1b\[.*m)+ cat = (\x1b\[.*m)+"Nori"(\x1b\[.*m)+/);
    });

    it('colorizes input function', async() => {
      input.write('function add (a, b) { return a + b }');
      await tick();
      expect(output).to.match(/function(\x1b\[.*m)+ (\x1b\[.*m)+add(\x1b\[.*m)+ \(a, b\) \{ (\x1b\[.*m)+return(\x1b\[.*m)+ a \+ b/);
    });

    it('colorizes input integers', async() => {
      input.write('const sum = 42 + 7');
      await tick();
      expect(output).to.match(/const(\x1b\[.*m)+ sum = (\x1b\[.*m)+42(\x1b\[.*m)+ \+ (\x1b\[.*m)+7(\x1b\[.*m)+/);
    });

    it('colorizes output', async() => {
      input.write('ISODate()\n');
      await tick();
      expect(output).to.match(/\x1b\[.*m\d+-\d+-\d+T\d+:\d+:\d+.\d+Z\x1b\[.*m/);
    });

    it('colorizes syntax errors', async() => {
      input.write('<cat>\n');
      await tick();
      expect(output).to.match(/SyntaxError(\x1b\[.*m)+: Unexpected token/);
      expect(output).to.match(/>(\x1b\[.*m)+ 1 \| (\x1b\[.*m)+<(\x1b\[.*m)+cat(\x1b\[.*m)+>(\x1b\[.*m)+/);
    });

    it('can ask for passwords', async() => {
      input.write('const pw = passwordPrompt()\n');
      await tick();
      expect(output).to.include('Enter password');

      output = '';
      input.write('hello!\n');
      await tick();
      expect(output).not.to.include('hello!');

      output = '';
      input.write('pw\n');
      await tick();
      expect(output).to.include('hello!');
    });

    it('can abort asking for passwords', async() => {
      input.write('pw = passwordPrompt(); 0\n');
      await tick();
      expect(output).to.include('Enter password');

      output = '';
      input.write('hello!\u0003'); // Ctrl+C
      await tick();
      expect(output).not.to.include('hello!');
      expect(output).to.include('aborted by the user');

      output = '';
      input.write('pw\n');
      await tick();
      expect(output).not.to.include('hello!');
      expect(output).to.include('ReferenceError');
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
      await mongoshRepl.start(serviceProvider);
      expect(output).to.include('Error processing history file');
    });
  });

  context('when the config says to skip the telemetry greeting message', () => {
    beforeEach(async() => {
      config.disableGreetingMessage = true;
      await mongoshRepl.start(serviceProvider);
    });

    it('skips telemetry intro', () => {
      expect(output).not.to.match(/You can opt-out by running the .*disableTelemetry\(\).* command/);
    });
  });
});
