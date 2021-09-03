/* eslint-disable new-cap */
import { expect } from 'chai';
import ShellApi from './shell-api';
import { signatures, toShellResult } from './index';
import Cursor from './cursor';
import { nonAsyncFunctionsReturningPromises } from './decorators';
import { ALL_PLATFORMS, ALL_SERVER_VERSIONS, ALL_TOPOLOGIES, ALL_API_VERSIONS } from './enums';
import sinon, { StubbedInstance, stubInterface } from 'ts-sinon';
import Mongo from './mongo';
import { ReplPlatform, ServiceProvider, bson, MongoClient } from '@mongosh/service-provider-core';
import { EventEmitter } from 'events';
import ShellInstanceState, { EvaluationListener } from './shell-instance-state';

const b641234 = 'MTIzNA==';
const schemaMap = {
  'fle-example.people': {
    'properties': {
      'ssn': {
        'encrypt': {
          'keyId': '/keyAltName',
          'bsonType': 'string',
          'algorithm': 'AEAD_AES_256_CBC_HMAC_SHA_512-Random'
        }
      }
    },
    'bsonType': 'object'
  }
};

describe('ShellApi', () => {
  describe('signatures', () => {
    it('type', () => {
      expect(signatures.ShellApi.type).to.equal('ShellApi');
    });
    it('attributes', () => {
      expect(signatures.ShellApi.attributes.use).to.deep.equal({
        type: 'function',
        returnsPromise: false,
        deprecated: false,
        returnType: { type: 'unknown', attributes: {} },
        platforms: ALL_PLATFORMS,
        topologies: ALL_TOPOLOGIES,
        apiVersions: ALL_API_VERSIONS,
        serverVersions: ALL_SERVER_VERSIONS,
        isDirectShellCommand: true,
        shellCommandCompleter: signatures.ShellApi.attributes.use.shellCommandCompleter
      });
      expect(signatures.ShellApi.attributes.show).to.deep.equal({
        type: 'function',
        returnsPromise: true,
        deprecated: false,
        returnType: { type: 'unknown', attributes: {} },
        platforms: ALL_PLATFORMS,
        topologies: ALL_TOPOLOGIES,
        apiVersions: ALL_API_VERSIONS,
        serverVersions: ALL_SERVER_VERSIONS,
        isDirectShellCommand: true,
        shellCommandCompleter: signatures.ShellApi.attributes.show.shellCommandCompleter
      });
      expect(signatures.ShellApi.attributes.exit).to.deep.equal({
        type: 'function',
        returnsPromise: true,
        deprecated: false,
        returnType: { type: 'unknown', attributes: {} },
        platforms: [ ReplPlatform.CLI ],
        topologies: ALL_TOPOLOGIES,
        apiVersions: ALL_API_VERSIONS,
        serverVersions: ALL_SERVER_VERSIONS,
        isDirectShellCommand: true,
        shellCommandCompleter: undefined
      });
      expect(signatures.ShellApi.attributes.it).to.deep.equal({
        type: 'function',
        returnsPromise: true,
        deprecated: false,
        returnType: { type: 'unknown', attributes: {} },
        platforms: ALL_PLATFORMS,
        topologies: ALL_TOPOLOGIES,
        apiVersions: ALL_API_VERSIONS,
        serverVersions: ALL_SERVER_VERSIONS,
        isDirectShellCommand: true,
        shellCommandCompleter: undefined
      });
      expect(signatures.ShellApi.attributes.print).to.deep.equal({
        type: 'function',
        returnsPromise: true,
        deprecated: false,
        returnType: { type: 'unknown', attributes: {} },
        platforms: ALL_PLATFORMS,
        topologies: ALL_TOPOLOGIES,
        apiVersions: ALL_API_VERSIONS,
        serverVersions: ALL_SERVER_VERSIONS,
        isDirectShellCommand: false,
        shellCommandCompleter: undefined
      });
      expect(signatures.ShellApi.attributes.printjson).to.deep.equal({
        type: 'function',
        returnsPromise: true,
        deprecated: false,
        returnType: { type: 'unknown', attributes: {} },
        platforms: ALL_PLATFORMS,
        topologies: ALL_TOPOLOGIES,
        apiVersions: ALL_API_VERSIONS,
        serverVersions: ALL_SERVER_VERSIONS,
        isDirectShellCommand: false,
        shellCommandCompleter: undefined
      });
      expect(signatures.ShellApi.attributes.sleep).to.deep.equal({
        type: 'function',
        returnsPromise: true,
        deprecated: false,
        returnType: { type: 'unknown', attributes: {} },
        platforms: ALL_PLATFORMS,
        topologies: ALL_TOPOLOGIES,
        apiVersions: ALL_API_VERSIONS,
        serverVersions: ALL_SERVER_VERSIONS,
        isDirectShellCommand: false,
        shellCommandCompleter: undefined
      });
      expect(signatures.ShellApi.attributes.cls).to.deep.equal({
        type: 'function',
        returnsPromise: true,
        deprecated: false,
        returnType: { type: 'unknown', attributes: {} },
        platforms: ALL_PLATFORMS,
        topologies: ALL_TOPOLOGIES,
        apiVersions: ALL_API_VERSIONS,
        serverVersions: ALL_SERVER_VERSIONS,
        isDirectShellCommand: true,
        shellCommandCompleter: undefined
      });
      expect(signatures.ShellApi.attributes.Mongo).to.deep.equal({
        type: 'function',
        returnsPromise: true,
        deprecated: false,
        returnType: 'Mongo',
        platforms: [ ReplPlatform.CLI ],
        topologies: ALL_TOPOLOGIES,
        apiVersions: ALL_API_VERSIONS,
        serverVersions: ALL_SERVER_VERSIONS,
        isDirectShellCommand: false,
        shellCommandCompleter: undefined
      });
      expect(signatures.ShellApi.attributes.connect).to.deep.equal({
        type: 'function',
        returnsPromise: true,
        deprecated: false,
        returnType: 'Database',
        platforms: [ ReplPlatform.CLI ],
        topologies: ALL_TOPOLOGIES,
        apiVersions: ALL_API_VERSIONS,
        serverVersions: ALL_SERVER_VERSIONS,
        isDirectShellCommand: false,
        shellCommandCompleter: undefined
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
    let newSP: StubbedInstance<ServiceProvider>;
    let rawClientStub: StubbedInstance<MongoClient>;
    let bus: EventEmitter;
    let instanceState: ShellInstanceState;
    let mongo: Mongo;

    beforeEach(() => {
      bus = new EventEmitter();
      rawClientStub = stubInterface<MongoClient>();
      newSP = stubInterface<ServiceProvider>();
      newSP.initialDb = 'test';
      newSP.bsonLibrary = bson;
      serviceProvider = stubInterface<ServiceProvider>();
      serviceProvider.getNewConnection.resolves(newSP);
      serviceProvider.initialDb = 'test';
      serviceProvider.bsonLibrary = bson;
      serviceProvider.getRawClient.returns(rawClientStub);
      mongo = stubInterface<Mongo>();
      mongo._serviceProvider = serviceProvider;
      instanceState = new ShellInstanceState(serviceProvider, bus);
      instanceState.currentDb._mongo = mongo;
      serviceProvider.platform = ReplPlatform.CLI;
    });
    describe('use', () => {
      beforeEach(() => {
        instanceState.shellApi.use('testdb');
      });
      it('calls use with arg', () => {
        expect(mongo.use).to.have.been.calledWith('testdb');
      });
    });
    describe('show', () => {
      beforeEach(async() => {
        await instanceState.shellApi.show('databases');
      });
      it('calls show with arg', () => {
        expect(mongo.show).to.have.been.calledWith('databases');
      });
    });
    describe('it', () => {
      it('returns empty result if no current cursor', async() => {
        instanceState.currentCursor = null;
        const res: any = await instanceState.shellApi.it();
        expect((await toShellResult(res)).type).to.deep.equal('CursorIterationResult');
      });
      it('calls _it on current Cursor', async() => {
        instanceState.currentCursor = stubInterface<Cursor>();
        await instanceState.shellApi.it();
        expect(instanceState.currentCursor._it).to.have.been.called;
      });
    });
    describe('Mongo', () => {
      beforeEach(() => {
        serviceProvider.platform = ReplPlatform.CLI;
      });
      it('returns a new Mongo object', async() => {
        const m = await instanceState.shellApi.Mongo('localhost:27017');
        expect((await toShellResult(m)).type).to.equal('Mongo');
        expect(m._uri).to.equal('mongodb://localhost:27017/test?directConnection=true&serverSelectionTimeoutMS=2000');
      });
      it('fails for non-CLI', async() => {
        serviceProvider.platform = ReplPlatform.Browser;
        try {
          await instanceState.shellApi.Mongo('uri');
        } catch (e) {
          return expect(e.name).to.equal('MongoshUnimplementedError');
        }
        expect.fail('MongoshInvalidInputError not thrown for Mongo');
      });
      it('parses URI with mongodb://', async() => {
        const m = await instanceState.shellApi.Mongo('mongodb://127.0.0.1:27017');
        expect(m._uri).to.equal('mongodb://127.0.0.1:27017/?directConnection=true&serverSelectionTimeoutMS=2000');
      });
      it('parses URI with just db', async() => {
        const m = await instanceState.shellApi.Mongo('dbname');
        expect(m._uri).to.equal('mongodb://127.0.0.1:27017/dbname?directConnection=true&serverSelectionTimeoutMS=2000');
      });
      context('FLE', () => {
        [
          { type: 'base64 string', key: b641234, expectedKey: b641234 },
          { type: 'Buffer', key: Buffer.from(b641234, 'base64'), expectedKey: Buffer.from(b641234, 'base64') },
          { type: 'BinData', key: new bson.Binary(Buffer.from(b641234, 'base64'), 128), expectedKey: Buffer.from(b641234, 'base64') }
        ].forEach(({ type, key, expectedKey }) => {
          it(`local kms provider - key is ${type}`, async() => {
            await instanceState.shellApi.Mongo('dbname', {
              keyVaultNamespace: 'encryption.dataKeys',
              kmsProviders: {
                local: {
                  key: key
                }
              }
            });
            expect(serviceProvider.getNewConnection).to.have.been.calledOnceWithExactly(
              'mongodb://127.0.0.1:27017/dbname?directConnection=true&serverSelectionTimeoutMS=2000',
              {
                autoEncryption: {
                  extraOptions: {},
                  keyVaultClient: undefined,
                  keyVaultNamespace: 'encryption.dataKeys',
                  kmsProviders: { local: { key: expectedKey } }
                }
              });
          });
        });
        it('aws kms provider', async() => {
          await instanceState.shellApi.Mongo('dbname', {
            keyVaultNamespace: 'encryption.dataKeys',
            kmsProviders: {
              aws: {
                accessKeyId: 'abc',
                secretAccessKey: '123'
              }
            }
          });
          expect(serviceProvider.getNewConnection).to.have.been.calledOnceWithExactly(
            'mongodb://127.0.0.1:27017/dbname?directConnection=true&serverSelectionTimeoutMS=2000',
            {
              autoEncryption: {
                extraOptions: {},
                keyVaultClient: undefined,
                keyVaultNamespace: 'encryption.dataKeys',
                kmsProviders: { aws: { accessKeyId: 'abc', secretAccessKey: '123' } }
              }
            });
        });
        it('local kms provider with current as Mongo', async() => {
          await instanceState.shellApi.Mongo('dbname', {
            keyVaultNamespace: 'encryption.dataKeys',
            kmsProviders: {
              local: {
                key: Buffer.from(b641234, 'base64')
              }
            },
            keyVaultClient: mongo
          });
          expect(serviceProvider.getNewConnection).to.have.been.calledOnceWithExactly(
            'mongodb://127.0.0.1:27017/dbname?directConnection=true&serverSelectionTimeoutMS=2000',
            {
              autoEncryption: {
                extraOptions: {},
                keyVaultClient: rawClientStub,
                keyVaultNamespace: 'encryption.dataKeys',
                kmsProviders: { local: { key: Buffer.from(b641234, 'base64') } }
              }
            });
        });
        it('local kms provider with different Mongo', async() => {
          const sp = stubInterface<ServiceProvider>();
          const rc = stubInterface<MongoClient>();
          sp.getRawClient.returns(rc);
          const m = new Mongo({ initialServiceProvider: sp } as any, 'dbName', undefined, undefined, sp);
          await instanceState.shellApi.Mongo('dbname', {
            keyVaultNamespace: 'encryption.dataKeys',
            kmsProviders: {
              local: {
                key: Buffer.from(b641234, 'base64')
              }
            },
            keyVaultClient: m
          });
          expect(serviceProvider.getNewConnection).to.have.been.calledOnceWithExactly(
            'mongodb://127.0.0.1:27017/dbname?directConnection=true&serverSelectionTimeoutMS=2000',
            {
              autoEncryption: {
                extraOptions: {},
                keyVaultClient: rc,
                keyVaultNamespace: 'encryption.dataKeys',
                kmsProviders: { local: { key: Buffer.from(b641234, 'base64') } }
              }
            });
        });
        it('throws if missing namespace', async() => {
          try {
            await instanceState.shellApi.Mongo('dbname', {
              kmsProviders: {
                aws: {
                  accessKeyId: 'abc',
                  secretAccessKey: '123'
                }
              }
            } as any);
          } catch (e) {
            return expect(e.message).to.contain('required property');
          }
          expect.fail('failed to throw expected error');
        });
        it('throws if missing kmsProviders', async() => {
          try {
            await instanceState.shellApi.Mongo('dbname', {
              keyVaultNamespace: 'encryption.dataKeys'
            } as any);
          } catch (e) {
            return expect(e.message).to.contain('required property');
          }
          expect.fail('failed to throw expected error');
        });
        it('throws for unknown args', async() => {
          try {
            await instanceState.shellApi.Mongo('dbname', {
              keyVaultNamespace: 'encryption.dataKeys',
              kmsProviders: {
                aws: {
                  accessKeyId: 'abc',
                  secretAccessKey: '123'
                }
              },
              unknownKey: 1
            } as any);
          } catch (e) {
            return expect(e.message).to.contain('unknownKey');
          }
          expect.fail('failed to throw expected error');
        });
        it('passes along optional arguments', async() => {
          await instanceState.shellApi.Mongo('dbname', {
            keyVaultNamespace: 'encryption.dataKeys',
            kmsProviders: {
              local: {
                key: Buffer.from(b641234, 'base64')
              }
            },
            schemaMap: schemaMap,
            bypassAutoEncryption: true
          });
          expect(serviceProvider.getNewConnection).to.have.been.calledOnceWithExactly(
            'mongodb://127.0.0.1:27017/dbname?directConnection=true&serverSelectionTimeoutMS=2000',
            {
              autoEncryption: {
                extraOptions: {},
                keyVaultClient: undefined,
                keyVaultNamespace: 'encryption.dataKeys',
                kmsProviders: { local: { key: Buffer.from(b641234, 'base64') } },
                schemaMap: schemaMap,
                bypassAutoEncryption: true
              }
            });
        });
      });
    });
    describe('connect', () => {
      it('returns a new DB', async() => {
        serviceProvider.platform = ReplPlatform.CLI;
        const db = await instanceState.shellApi.connect('localhost:27017', 'username', 'pwd');
        expect((await toShellResult(db)).type).to.equal('Database');
        expect(db.getMongo()._uri).to.equal('mongodb://localhost:27017/test?directConnection=true&serverSelectionTimeoutMS=2000');
      });
      it('fails with no arg', async() => {
        serviceProvider.platform = ReplPlatform.CLI;
        try {
          await (instanceState.shellApi as any).connect();
        } catch (e) {
          return expect(e.name).to.equal('MongoshInvalidInputError');
        }
        expect.fail('MongoshInvalidInputError not thrown for connect');
      });
    });
    describe('version', () => {
      it('returns a string for the version', () => {
        const version = instanceState.shellApi.version();
        const expected = require('../package.json').version;
        expect(version).to.be.a('string');
        expect(version).to.equal(expected);
      });
    });
  });
  describe('from context', () => {
    let serviceProvider: StubbedInstance<ServiceProvider>;
    let bus: EventEmitter;
    let instanceState: ShellInstanceState;
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
      instanceState = new ShellInstanceState(serviceProvider, bus);
      instanceState.setCtx({});
      instanceState.mongos.push(mongo);
      instanceState.currentDb._mongo = mongo;
      instanceState.setEvaluationListener(evaluationListener);
    });
    it('calls help function', async() => {
      expect((await toShellResult(instanceState.context.use.help())).type).to.equal('Help');
      expect((await toShellResult(instanceState.context.use.help)).type).to.equal('Help');
    });
    describe('use', () => {
      beforeEach(() => {
        instanceState.context.use('testdb');
      });
      it('calls use with arg', () => {
        expect(mongo.use).to.have.been.calledWith('testdb');
      });
    });
    describe('show', () => {
      beforeEach(() => {
        instanceState.context.show('databases');
      });
      it('calls show with arg', () => {
        expect(mongo.show).to.have.been.calledWith('databases');
      });
    });
    describe('it', () => {
      it('returns empty result if no current cursor', async() => {
        instanceState.currentCursor = null;
        const res: any = await instanceState.context.it();
        expect((await toShellResult(res)).type).to.deep.equal('CursorIterationResult');
      });
      it('calls _it on current Cursor', async() => {
        instanceState.currentCursor = stubInterface<Cursor>();
        await instanceState.context.it();
        expect(instanceState.currentCursor._it).to.have.been.called;
      });
    });
    describe('Mongo', () => {
      beforeEach(() => {
        serviceProvider.platform = ReplPlatform.CLI;
      });
      it('returns a new Mongo object', async() => {
        const m = await instanceState.context.Mongo('mongodb://127.0.0.1:27017');
        expect((await toShellResult(m)).type).to.equal('Mongo');
        expect(m._uri).to.equal('mongodb://127.0.0.1:27017/?directConnection=true&serverSelectionTimeoutMS=2000');
      });
      it('returns a new Mongo object with new', async() => {
        const m = await new instanceState.context.Mongo('mongodb://127.0.0.1:27017');
        expect((await toShellResult(m)).type).to.equal('Mongo');
        expect(m._uri).to.equal('mongodb://127.0.0.1:27017/?directConnection=true&serverSelectionTimeoutMS=2000');
      });
      it('fails for non-CLI', async() => {
        serviceProvider.platform = ReplPlatform.Browser;
        try {
          await instanceState.shellApi.Mongo('mongodb://127.0.0.1:27017');
        } catch (e) {
          return expect(e.name).to.equal('MongoshUnimplementedError');
        }
        expect.fail('MongoshInvalidInputError not thrown for Mongo');
      });
    });
    describe('connect', () => {
      it('returns a new DB', async() => {
        serviceProvider.platform = ReplPlatform.CLI;
        const db = await instanceState.context.connect('mongodb://127.0.0.1:27017');
        expect((await toShellResult(db)).type).to.equal('Database');
        expect(db.getMongo()._uri).to.equal('mongodb://127.0.0.1:27017/?directConnection=true&serverSelectionTimeoutMS=2000');
      });
      it('handles username/pwd', async() => {
        serviceProvider.platform = ReplPlatform.CLI;
        const db = await instanceState.context.connect('mongodb://127.0.0.1:27017', 'username', 'pwd');
        expect((await toShellResult(db)).type).to.equal('Database');
        expect(db.getMongo()._uri).to.equal('mongodb://127.0.0.1:27017/?directConnection=true&serverSelectionTimeoutMS=2000');
        expect(serviceProvider.getNewConnection).to.have.been.calledOnceWithExactly(
          'mongodb://127.0.0.1:27017/?directConnection=true&serverSelectionTimeoutMS=2000',
          { auth: { username: 'username', password: 'pwd' } });
      });
    });
    describe('version', () => {
      it('returns a string for the version', () => {
        const version = instanceState.context.version();
        const expected = require('../package.json').version;
        expect(version).to.be.a('string');
        expect(version).to.equal(expected);
      });
    });
    describe('isInteractive', () => {
      it('returns a boolean', () => {
        expect(instanceState.context.isInteractive()).to.equal(false);
        instanceState.isInteractive = true;
        expect(instanceState.context.isInteractive()).to.equal(true);
      });
    });
    for (const cmd of ['exit', 'quit']) {
      // eslint-disable-next-line no-loop-func
      describe(cmd, () => {
        it('instructs the shell to exit', async() => {
          evaluationListener.onExit.resolves();
          try {
            await instanceState.context[cmd]();
            expect.fail('missed exception');
          } catch (e) {
            // We should be getting an exception because we’re not actually exiting.
            expect(e.message).to.contain('onExit listener returned');
          }
          expect(evaluationListener.onExit).to.have.been.calledWith();
        });
        it('passes on the exit code, if provided', async() => {
          evaluationListener.onExit.resolves();
          try {
            await instanceState.context[cmd](1);
            expect.fail('missed exception');
          } catch (e) {
            // We should be getting an exception because we’re not actually exiting.
            expect(e.message).to.contain('onExit listener returned');
          }
          expect(evaluationListener.onExit).to.have.been.calledWith(1);
        });
      });
    }
    describe('enableTelemetry', () => {
      it('calls .setConfig("enableTelemetry") with true', () => {
        instanceState.context.enableTelemetry();
        expect(evaluationListener.setConfig).to.have.been.calledWith('enableTelemetry', true);
      });
    });
    describe('disableTelemetry', () => {
      it('calls .setConfig("enableTelemetry") with false', () => {
        instanceState.context.disableTelemetry();
        expect(evaluationListener.setConfig).to.have.been.calledWith('enableTelemetry', false);
      });
    });
    describe('passwordPrompt', () => {
      it('asks the evaluation listener for a password', async() => {
        evaluationListener.onPrompt.resolves('passw0rd');
        const pwd = await instanceState.context.passwordPrompt();
        expect(pwd).to.equal('passw0rd');
        expect(evaluationListener.onPrompt).to.have.been.calledWith('Enter password', 'password');
      });
      it('fails for currently unsupported platforms', async() => {
        instanceState.setEvaluationListener({});
        try {
          await instanceState.context.passwordPrompt();
          expect.fail('missed exception');
        } catch (err) {
          expect(err.message).to.equal('[COMMON-90002] passwordPrompt() is not available in this shell');
        }
      });
    });
    describe('sleep', () => {
      it('suspends execution', async() => {
        const now = Date.now();
        await instanceState.context.sleep(50);
        const then = Date.now();
        expect(then - now).to.be.greaterThan(40);
      });
    });
    describe('cls', () => {
      it('clears the screen', async() => {
        evaluationListener.onClearCommand.resolves();
        await instanceState.context.cls();
        expect(evaluationListener.onClearCommand).to.have.been.calledWith();
      });
    });
    describe('load', () => {
      it('asks the evaluation listener to load a file', async() => {
        const apiLoadFileListener = sinon.stub();
        bus.on('mongosh:api-load-file', apiLoadFileListener);
        // eslint-disable-next-line @typescript-eslint/require-await
        evaluationListener.onLoad.callsFake(async(filename: string) => {
          expect(filename).to.equal('abc.js');
          expect(instanceState.context.__filename).to.equal(undefined);
          expect(instanceState.context.__dirname).to.equal(undefined);
          return {
            resolvedFilename: '/resolved/abc.js',
            // eslint-disable-next-line @typescript-eslint/require-await
            evaluate: async() => {
              expect(instanceState.context.__filename).to.equal('/resolved/abc.js');
              expect(instanceState.context.__dirname).to.equal('/resolved');
            }
          };
        });
        await instanceState.context.load('abc.js');
        expect(evaluationListener.onLoad).to.have.callCount(1);
        expect(instanceState.context.__filename).to.equal(undefined);
        expect(instanceState.context.__dirname).to.equal(undefined);
        expect(apiLoadFileListener).to.have.been.calledWith({ nested: false, filename: 'abc.js' });
      });
      it('emits different events depending on nesting level', async() => {
        const apiLoadFileListener = sinon.stub();
        bus.on('mongosh:api-load-file', apiLoadFileListener);
        // eslint-disable-next-line @typescript-eslint/require-await
        evaluationListener.onLoad.callsFake(async(filename: string) => {
          return {
            resolvedFilename: '/resolved/' + filename,
            evaluate: async() => {
              if (filename === 'def.js') {
                return;
              }
              await instanceState.context.load('def.js');
            }
          };
        });
        await instanceState.context.load('abc.js');
        expect(apiLoadFileListener).to.have.callCount(2);
        expect(apiLoadFileListener).to.have.been.calledWith({ nested: false, filename: 'abc.js' });
        expect(apiLoadFileListener).to.have.been.calledWith({ nested: true, filename: 'def.js' });
      });
    });
    for (const cmd of ['print', 'printjson']) {
      // eslint-disable-next-line no-loop-func
      describe(cmd, () => {
        it('prints values', async() => {
          evaluationListener.onPrint.resolves();
          await instanceState.context[cmd](1, 2);
          expect(evaluationListener.onPrint).to.have.been.calledWith([
            { printable: 1, rawValue: 1, type: null },
            { printable: 2, rawValue: 2, type: null }
          ]);
        });
      });
    }

    describe('config', () => {
      context('with a full-config evaluation listener', () => {
        let store;
        let config;
        let validators;

        beforeEach(() => {
          config = instanceState.context.config;
          store = { somekey: '' };
          validators = {};
          // eslint-disable-next-line @typescript-eslint/require-await
          evaluationListener.setConfig.callsFake(async(key, value) => {
            if (key === 'ignoreme' as any) return 'ignored';
            store[key] = value;
            return 'success';
          });
          // eslint-disable-next-line @typescript-eslint/require-await
          evaluationListener.getConfig.callsFake(async key => store[key]);
          // eslint-disable-next-line @typescript-eslint/require-await
          evaluationListener.validateConfig.callsFake(async(key, value) => validators[key]?.(value));
          evaluationListener.listConfigOptions.callsFake(() => Object.keys(store));
        });

        it('can get/set/list config keys', async() => {
          const value = { structuredData: 'value' };
          expect(await config.set('somekey', value)).to.equal('Setting "somekey" has been changed');
          expect(await config.get('somekey')).to.deep.equal(value);
          expect((await toShellResult(config)).printable).to.deep.equal(
            new Map([['somekey', value]]));
        });

        it('will fall back to defaults', async() => {
          expect(await config.get('displayBatchSize')).to.equal(20);
        });

        it('rejects setting unavailable config keys', async() => {
          expect(await config.set('unavailable', 'value')).to.equal('Option "unavailable" is not available in this environment');
        });

        it('rejects setting explicitly ignored config keys', async() => {
          expect(await config.set('ignoreme', 'value')).to.equal('Option "ignoreme" is not available in this environment');
        });

        it('rejects setting explicitly invalid config values', async() => {
          store.badvalue = 1; // Make sure the config option exists
          validators.badvalue = (value) => `Bad value ${value} passed`;
          expect(await config.set('badvalue', 'somevalue')).to.equal('Cannot set option "badvalue": Bad value somevalue passed');
        });
      });

      context('with a no-config evaluation listener', () => {
        let config;

        beforeEach(() => {
          config = instanceState.context.config;
        });

        it('will work with defaults', async() => {
          expect(await config.get('displayBatchSize')).to.equal(20);
          expect((await toShellResult(config)).printable).to.deep.equal(
            new Map([['displayBatchSize', 20], ['maxTimeMS', null], ['enableTelemetry', false]] as any));
        });

        it('rejects setting all config keys', async() => {
          expect(await config.set('somekey', 'value')).to.equal('Option "somekey" is not available in this environment');
        });
      });
    });
  });
  describe('command completers', () => {
    const params = {
      getCollectionCompletionsForCurrentDb: () => [''],
      getDatabaseCompletions: (dbName) => ['dbOne', 'dbTwo'].filter(s => s.startsWith(dbName))
    };

    it('provides completions for show', async() => {
      const completer = signatures.ShellApi.attributes.show.shellCommandCompleter;
      expect(await completer(params, ['show', ''])).to.contain('databases');
      expect(await completer(params, ['show', 'pro'])).to.deep.equal(['profile']);
    });

    it('provides completions for use', async() => {
      const completer = signatures.ShellApi.attributes.use.shellCommandCompleter;
      expect(await completer(params, ['use', ''])).to.deep.equal(['dbOne', 'dbTwo']);
      expect(await completer(params, ['use', 'dbO'])).to.deep.equal(['dbOne']);
    });
  });
});

describe('returnsPromise marks async functions', () => {
  it('no non-async functions are marked returnsPromise', () => {
    expect(nonAsyncFunctionsReturningPromises).to.deep.equal([]);
  });
});
