import { ServiceProvider, bson } from '@mongosh/service-provider-core';
import MongoshNodeRepl, { MongoshConfigProvider, MongoshNodeReplOptions } from './mongosh-repl';
import { PassThrough, Duplex } from 'stream';
import path from 'path';
import { EventEmitter, once } from 'events';
import { expect, tick, useTmpdir } from '../test/repl-helpers';
import { stubInterface } from 'ts-sinon';

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
  });

  context('with terminal: true', () => {
    beforeEach(async() => {
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
  });

  context('with fake TTY', () => {
    beforeEach(async() => {
      Object.assign(outputStream, {
        isTTY: true,
        getColorDepth() { return 256; }
      });
      mongoshRepl = new MongoshNodeRepl(mongoshReplOptions);
      await mongoshRepl.start(serviceProvider);
    });

    it('colorizes output', async() => {
      input.write('ISODate()\n');
      await tick();
      // eslint-disable-next-line no-control-regex
      expect(output).to.match(/\x1b\[.*m\d+-\d+-\d+T\d+:\d+:\d+.\d+Z\x1b\[.*m/);
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
