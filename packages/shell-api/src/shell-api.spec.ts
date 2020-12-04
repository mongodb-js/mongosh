/* eslint-disable new-cap */
import { expect } from 'chai';
import ShellApi from './shell-api';
import { signatures, toShellResult } from './index';
import Cursor from './cursor';
import { ALL_PLATFORMS, ALL_SERVER_VERSIONS, ALL_TOPOLOGIES } from './enums';
import { StubbedInstance, stubInterface } from 'ts-sinon';
import Mongo from './mongo';
import { ReplPlatform, ServiceProvider, bson } from '@mongosh/service-provider-core';
import { EventEmitter, once } from 'events';
import ShellInternalState, { EvaluationListener } from './shell-internal-state';

describe('ShellApi', () => {
  describe('signatures', () => {
    it('type', () => {
      expect(signatures.ShellApi.type).to.equal('ShellApi');
    });
    it('attributes', () => {
      expect(signatures.ShellApi.attributes.use).to.deep.equal({
        type: 'function',
        returnsPromise: false,
        returnType: { type: 'unknown', attributes: {} },
        platforms: ALL_PLATFORMS,
        topologies: ALL_TOPOLOGIES,
        serverVersions: ALL_SERVER_VERSIONS
      });
      expect(signatures.ShellApi.attributes.show).to.deep.equal({
        type: 'function',
        returnsPromise: true,
        returnType: { type: 'unknown', attributes: {} },
        platforms: ALL_PLATFORMS,
        topologies: ALL_TOPOLOGIES,
        serverVersions: ALL_SERVER_VERSIONS
      });
      expect(signatures.ShellApi.attributes.exit).to.deep.equal({
        type: 'function',
        returnsPromise: true,
        returnType: { type: 'unknown', attributes: {} },
        platforms: ALL_PLATFORMS,
        topologies: ALL_TOPOLOGIES,
        serverVersions: ALL_SERVER_VERSIONS
      });
      expect(signatures.ShellApi.attributes.it).to.deep.equal({
        type: 'function',
        returnsPromise: true,
        returnType: { type: 'unknown', attributes: {} },
        platforms: ALL_PLATFORMS,
        topologies: ALL_TOPOLOGIES,
        serverVersions: ALL_SERVER_VERSIONS
      });
      expect(signatures.ShellApi.attributes.Mongo).to.deep.equal({
        type: 'function',
        returnsPromise: true,
        returnType: 'Mongo',
        platforms: [ ReplPlatform.CLI ],
        topologies: ALL_TOPOLOGIES,
        serverVersions: ALL_SERVER_VERSIONS
      });
      expect(signatures.ShellApi.attributes.connect).to.deep.equal({
        type: 'function',
        returnsPromise: true,
        returnType: 'Database',
        platforms: [ ReplPlatform.CLI ],
        topologies: ALL_TOPOLOGIES,
        serverVersions: ALL_SERVER_VERSIONS
      });
    });
  });
  describe('help', () => {
    const apiClass = new ShellApi({} as any);
    it('calls help function', async() => {
      expect((await toShellResult(apiClass.help())).type).to.equal('Help');
      expect((await toShellResult(apiClass.help)).type).to.equal('Help');
    });
  });
  describe('commands', () => {
    let serviceProvider: StubbedInstance<ServiceProvider>;
    let bus: StubbedInstance<EventEmitter>;
    let internalState: ShellInternalState;
    let mongo: Mongo;

    beforeEach(() => {
      bus = stubInterface<EventEmitter>();
      const newSP = stubInterface<ServiceProvider>();
      newSP.initialDb = 'test';
      serviceProvider = stubInterface<ServiceProvider>({ getNewConnection: newSP });
      serviceProvider.initialDb = 'test';
      serviceProvider.bsonLibrary = bson;
      mongo = stubInterface<Mongo>();
      mongo._serviceProvider = serviceProvider;
      internalState = new ShellInternalState(serviceProvider, bus);
      internalState.currentDb._mongo = mongo;
      serviceProvider.platform = ReplPlatform.CLI;
    });
    describe('use', () => {
      beforeEach(() => {
        internalState.shellApi.use('testdb');
      });
      it('calls use with arg', async() => {
        expect(mongo.use).to.have.been.calledWith('testdb');
      });
    });
    describe('show', () => {
      beforeEach(() => {
        internalState.shellApi.show('databases');
      });
      it('calls show with arg', async() => {
        expect(mongo.show).to.have.been.calledWith('databases');
      });
    });
    describe('it', () => {
      it('returns empty result if no current cursor', async() => {
        internalState.currentCursor = null;
        const res: any = await internalState.shellApi.it();
        expect((await toShellResult(res)).type).to.deep.equal('CursorIterationResult');
      });
      it('calls _it on current Cursor', async() => {
        internalState.currentCursor = stubInterface<Cursor>();
        await internalState.shellApi.it();
        expect(internalState.currentCursor._it).to.have.been.called;
      });
    });
    describe('Mongo', () => {
      beforeEach(() => {
        serviceProvider.platform = ReplPlatform.CLI;
      });
      it('returns a new Mongo object', async() => {
        const m = await internalState.shellApi.Mongo('localhost:27017');
        expect((await toShellResult(m)).type).to.equal('Mongo');
        expect(m._uri).to.equal('mongodb://localhost:27017/test');
      });
      it('fails for non-CLI', async() => {
        serviceProvider.platform = ReplPlatform.Browser;
        try {
          await internalState.shellApi.Mongo('uri');
        } catch (e) {
          return expect(e.name).to.equal('MongoshUnimplementedError');
        }
        expect.fail('MongoshInvalidInputError not thrown for Mongo');
      });
      it('parses URI with mongodb://', async() => {
        const m = await internalState.shellApi.Mongo('mongodb://127.0.0.1:27017');
        expect(m._uri).to.equal('mongodb://127.0.0.1:27017');
      });
      it('parses URI with just db', async() => {
        const m = await internalState.shellApi.Mongo('dbname');
        expect(m._uri).to.equal('mongodb://127.0.0.1:27017/dbname');
      });
    });
    describe('connect', () => {
      it('returns a new DB', async() => {
        serviceProvider.platform = ReplPlatform.CLI;
        const db = await internalState.shellApi.connect('localhost:27017', 'username', 'pwd');
        expect((await toShellResult(db)).type).to.equal('Database');
        expect(db.getMongo()._uri).to.equal('mongodb://localhost:27017/test');
      });
      it('fails with no arg', async() => {
        serviceProvider.platform = ReplPlatform.CLI;
        try {
          await (internalState.shellApi as any).connect();
        } catch (e) {
          return expect(e.name).to.equal('MongoshInvalidInputError');
        }
        expect.fail('MongoshInvalidInputError not thrown for connect');
      });
    });
    describe('version', () => {
      it('returns a string for the version', () => {
        const version = internalState.shellApi.version();
        const expected = require('../package.json').version;
        expect(version).to.be.a('string');
        expect(version).to.equal(expected);
      });
    });
  });
  describe('from context', () => {
    let serviceProvider: StubbedInstance<ServiceProvider>;
    let bus: EventEmitter;
    let internalState: ShellInternalState;
    let mongo: Mongo;
    let evaluationListener: StubbedInstance<EvaluationListener>;

    beforeEach(() => {
      bus = new EventEmitter();
      const newSP = stubInterface<ServiceProvider>();
      newSP.initialDb = 'test';
      serviceProvider = stubInterface<ServiceProvider>({ getNewConnection: newSP });
      serviceProvider.initialDb = 'test';
      serviceProvider.platform = ReplPlatform.CLI;
      serviceProvider.bsonLibrary = bson;
      mongo = stubInterface<Mongo>();
      mongo._serviceProvider = serviceProvider;
      evaluationListener = stubInterface<EvaluationListener>();
      internalState = new ShellInternalState(serviceProvider, bus);
      internalState.setCtx({});
      internalState.mongos.push(mongo);
      internalState.currentDb._mongo = mongo;
      internalState.setEvaluationListener(evaluationListener);
    });
    it('calls help function', async() => {
      expect((await toShellResult(internalState.context.use.help())).type).to.equal('Help');
      expect((await toShellResult(internalState.context.use.help)).type).to.equal('Help');
    });
    describe('use', () => {
      beforeEach(() => {
        internalState.context.use('testdb');
      });
      it('calls use with arg', async() => {
        expect(mongo.use).to.have.been.calledWith('testdb');
      });
    });
    describe('show', () => {
      beforeEach(() => {
        internalState.context.show('databases');
      });
      it('calls show with arg', async() => {
        expect(mongo.show).to.have.been.calledWith('databases');
      });
    });
    describe('it', () => {
      it('returns empty result if no current cursor', async() => {
        internalState.currentCursor = null;
        const res: any = await internalState.context.it();
        expect((await toShellResult(res)).type).to.deep.equal('CursorIterationResult');
      });
      it('calls _it on current Cursor', async() => {
        internalState.currentCursor = stubInterface<Cursor>();
        await internalState.context.it();
        expect(internalState.currentCursor._it).to.have.been.called;
      });
    });
    describe('Mongo', () => {
      beforeEach(() => {
        serviceProvider.platform = ReplPlatform.CLI;
      });
      it('returns a new Mongo object', async() => {
        const m = await internalState.context.Mongo('mongodb://127.0.0.1:27017');
        expect((await toShellResult(m)).type).to.equal('Mongo');
        expect(m._uri).to.equal('mongodb://127.0.0.1:27017');
      });
      it('fails for non-CLI', async() => {
        serviceProvider.platform = ReplPlatform.Browser;
        try {
          await internalState.shellApi.Mongo('mongodb://127.0.0.1:27017');
        } catch (e) {
          return expect(e.name).to.equal('MongoshUnimplementedError');
        }
        expect.fail('MongoshInvalidInputError not thrown for Mongo');
      });
    });
    describe('connect', () => {
      it('returns a new DB', async() => {
        serviceProvider.platform = ReplPlatform.CLI;
        const db = await internalState.context.connect('mongodb://127.0.0.1:27017');
        expect((await toShellResult(db)).type).to.equal('Database');
        expect(db.getMongo()._uri).to.equal('mongodb://127.0.0.1:27017');
      });
      it('handles username/pwd', async() => {
        serviceProvider.platform = ReplPlatform.CLI;
        const db = await internalState.context.connect('mongodb://127.0.0.1:27017', 'username', 'pwd');
        expect((await toShellResult(db)).type).to.equal('Database');
        expect(db.getMongo()._uri).to.equal('mongodb://127.0.0.1:27017');
        expect(db.getMongo()._options).to.deep.equal({ auth: { username: 'username', password: 'pwd' } });
      });
    });
    describe('version', () => {
      it('returns a string for the version', () => {
        const version = internalState.context.version();
        const expected = require('../package.json').version;
        expect(version).to.be.a('string');
        expect(version).to.equal(expected);
      });
    });
    describe('DBQuery', () => {
      it('throws for shellBatchSize', () => {
        try {
          internalState.context.DBQuery.shellBatchSize();
        } catch (e) {
          expect(e.message).to.contain('deprecated');
          expect(e.message).to.contain('find().batchSize');
          return;
        }
        expect.fail();
      });
      it('throws for asPrintable', async() => {
        expect((await toShellResult(internalState.context.DBQuery)).printable).to.contain('deprecated');
      });
    });
    describe('exit', () => {
      it('instructs the shell to exit', async() => {
        const onExit = once(bus, 'mongosh:exit');
        try {
          await internalState.context.exit();
          expect.fail('missed exception');
        } catch (e) {
          // We should be getting an exception because we’re not actually exiting.
          expect(e.message).to.contain('exit not supported for current platform');
        }
        const [ exitCode ] = await onExit;
        expect(exitCode).to.equal(0);
        expect(mongo.close).to.have.been.calledWith(true);
      });
    });
    describe('enableTelemetry', () => {
      it('calls .toggleTelemetry() with true', () => {
        internalState.context.enableTelemetry();
        expect(evaluationListener.toggleTelemetry).to.have.been.calledWith(true);
      });
    });
    describe('disableTelemetry', () => {
      it('calls .toggleTelemetry() with false', () => {
        internalState.context.disableTelemetry();
        expect(evaluationListener.toggleTelemetry).to.have.been.calledWith(false);
      });
    });
    describe('passwordPrompt', () => {
      it('asks the evaluation listener for a password', async() => {
        evaluationListener.onPrompt.resolves('passw0rd');
        const pwd = await internalState.context.passwordPrompt();
        expect(pwd).to.equal('passw0rd');
        expect(evaluationListener.onPrompt).to.have.been.calledWith('Enter password', 'password');
      });
      it('fails for currently unsupported platforms', async() => {
        internalState.setEvaluationListener({});
        try {
          await internalState.context.passwordPrompt();
          expect.fail('missed exception');
        } catch (err) {
          expect(err.message).to.equal('passwordPrompt() is not available in this shell');
        }
      });
    });
  });
});
