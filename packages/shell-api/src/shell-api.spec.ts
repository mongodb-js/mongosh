import { expect } from 'chai';
import type { ShellConfig } from './shell-api';
import ShellApi from './shell-api';
import { signatures, toShellResult } from './index';
import type Cursor from './cursor';
import { nonAsyncFunctionsReturningPromises } from './decorators';
import {
  ALL_PLATFORMS,
  ALL_SERVER_VERSIONS,
  ALL_TOPOLOGIES,
  ALL_API_VERSIONS,
} from './enums';
import sinon from 'sinon';
import type { StubbedInstance } from 'ts-sinon';
import { stubInterface } from 'ts-sinon';
import Mongo from './mongo';
import type {
  ServiceProvider,
  MongoClient,
  Document,
} from '@mongosh/service-provider-core';
import { bson } from '@mongosh/service-provider-core';
import { EventEmitter } from 'events';
import type { EvaluationListener } from './shell-instance-state';
import ShellInstanceState from './shell-instance-state';
import { MONGOSH_VERSION } from './mongosh-version';

const b641234 = 'MTIzNA==';
const schemaMap = {
  'fle-example.people': {
    properties: {
      ssn: {
        encrypt: {
          keyId: '/keyAltName',
          bsonType: 'string',
          algorithm: 'AEAD_AES_256_CBC_HMAC_SHA_512-Random',
        },
      },
    },
    bsonType: 'object',
  },
};

describe('ShellApi', function () {
  describe('signatures', function () {
    it('type', function () {
      expect(signatures.ShellApi.type).to.equal('ShellApi');
    });
    it('attributes', function () {
      expect(signatures.ShellApi.attributes?.use).to.deep.equal({
        type: 'function',
        returnsPromise: false,
        deprecated: false,
        returnType: { type: 'unknown', attributes: {} },
        platforms: ALL_PLATFORMS,
        topologies: ALL_TOPOLOGIES,
        apiVersions: ALL_API_VERSIONS,
        serverVersions: ALL_SERVER_VERSIONS,
        isDirectShellCommand: true,
        acceptsRawInput: false,
        shellCommandCompleter:
          signatures.ShellApi.attributes?.use.shellCommandCompleter,
        newShellCommandCompleter:
          signatures.ShellApi.attributes?.use.newShellCommandCompleter,
      });
      expect(signatures.ShellApi.attributes?.show).to.deep.equal({
        type: 'function',
        returnsPromise: true,
        deprecated: false,
        returnType: { type: 'unknown', attributes: {} },
        platforms: ALL_PLATFORMS,
        topologies: ALL_TOPOLOGIES,
        apiVersions: ALL_API_VERSIONS,
        serverVersions: ALL_SERVER_VERSIONS,
        isDirectShellCommand: true,
        acceptsRawInput: false,
        shellCommandCompleter:
          signatures.ShellApi.attributes?.show.shellCommandCompleter,
        newShellCommandCompleter:
          signatures.ShellApi.attributes?.show.newShellCommandCompleter,
      });
      expect(signatures.ShellApi.attributes?.exit).to.deep.equal({
        type: 'function',
        returnsPromise: true,
        deprecated: false,
        returnType: { type: 'unknown', attributes: {} },
        platforms: ['CLI'],
        topologies: ALL_TOPOLOGIES,
        apiVersions: ALL_API_VERSIONS,
        serverVersions: ALL_SERVER_VERSIONS,
        isDirectShellCommand: true,
        acceptsRawInput: false,
        shellCommandCompleter: undefined,
        newShellCommandCompleter: undefined,
      });
      expect(signatures.ShellApi.attributes?.it).to.deep.equal({
        type: 'function',
        returnsPromise: true,
        deprecated: false,
        returnType: { type: 'unknown', attributes: {} },
        platforms: ALL_PLATFORMS,
        topologies: ALL_TOPOLOGIES,
        apiVersions: ALL_API_VERSIONS,
        serverVersions: ALL_SERVER_VERSIONS,
        isDirectShellCommand: true,
        acceptsRawInput: false,
        shellCommandCompleter: undefined,
        newShellCommandCompleter: undefined,
      });
      expect(signatures.ShellApi.attributes?.print).to.deep.equal({
        type: 'function',
        returnsPromise: true,
        deprecated: false,
        returnType: { type: 'unknown', attributes: {} },
        platforms: ALL_PLATFORMS,
        topologies: ALL_TOPOLOGIES,
        apiVersions: ALL_API_VERSIONS,
        serverVersions: ALL_SERVER_VERSIONS,
        isDirectShellCommand: false,
        acceptsRawInput: false,
        shellCommandCompleter: undefined,
        newShellCommandCompleter: undefined,
      });
      expect(signatures.ShellApi.attributes?.printjson).to.deep.equal({
        type: 'function',
        returnsPromise: true,
        deprecated: false,
        returnType: { type: 'unknown', attributes: {} },
        platforms: ALL_PLATFORMS,
        topologies: ALL_TOPOLOGIES,
        apiVersions: ALL_API_VERSIONS,
        serverVersions: ALL_SERVER_VERSIONS,
        isDirectShellCommand: false,
        acceptsRawInput: false,
        shellCommandCompleter: undefined,
        newShellCommandCompleter: undefined,
      });
      expect(signatures.ShellApi.attributes?.sleep).to.deep.equal({
        type: 'function',
        returnsPromise: true,
        deprecated: false,
        returnType: { type: 'unknown', attributes: {} },
        platforms: ALL_PLATFORMS,
        topologies: ALL_TOPOLOGIES,
        apiVersions: ALL_API_VERSIONS,
        serverVersions: ALL_SERVER_VERSIONS,
        isDirectShellCommand: false,
        acceptsRawInput: false,
        shellCommandCompleter: undefined,
        newShellCommandCompleter: undefined,
      });
      expect(signatures.ShellApi.attributes?.cls).to.deep.equal({
        type: 'function',
        returnsPromise: true,
        deprecated: false,
        returnType: { type: 'unknown', attributes: {} },
        platforms: ALL_PLATFORMS,
        topologies: ALL_TOPOLOGIES,
        apiVersions: ALL_API_VERSIONS,
        serverVersions: ALL_SERVER_VERSIONS,
        isDirectShellCommand: true,
        acceptsRawInput: false,
        shellCommandCompleter: undefined,
        newShellCommandCompleter: undefined,
      });
      expect(signatures.ShellApi.attributes?.Mongo).to.deep.equal({
        type: 'function',
        returnsPromise: true,
        deprecated: false,
        returnType: 'Mongo',
        platforms: ['CLI'],
        topologies: ALL_TOPOLOGIES,
        apiVersions: ALL_API_VERSIONS,
        serverVersions: ALL_SERVER_VERSIONS,
        isDirectShellCommand: false,
        acceptsRawInput: false,
        shellCommandCompleter: undefined,
        newShellCommandCompleter: undefined,
      });
      expect(signatures.ShellApi.attributes?.connect).to.deep.equal({
        type: 'function',
        returnsPromise: true,
        deprecated: false,
        returnType: 'Database',
        platforms: ['CLI'],
        topologies: ALL_TOPOLOGIES,
        apiVersions: ALL_API_VERSIONS,
        serverVersions: ALL_SERVER_VERSIONS,
        isDirectShellCommand: false,
        acceptsRawInput: false,
        shellCommandCompleter: undefined,
        newShellCommandCompleter: undefined,
      });
    });
  });
  describe('help', function () {
    const apiClass = new ShellApi({} as any);
    it('calls help function', async function () {
      expect((await toShellResult(apiClass.help())).type).to.equal('Help');
      expect((await toShellResult(apiClass.help)).type).to.equal('Help');
    });
  });
  describe('commands', function () {
    let serviceProvider: StubbedInstance<ServiceProvider>;
    let newSP: StubbedInstance<ServiceProvider>;
    let rawClientStub: StubbedInstance<MongoClient>;
    let bus: EventEmitter;
    let instanceState: ShellInstanceState;
    let mongo: Mongo;

    beforeEach(function () {
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
      serviceProvider.platform = 'CLI';
    });
    describe('use', function () {
      beforeEach(function () {
        instanceState.shellApi.use('testdb');
      });
      it('calls use with arg', function () {
        expect(mongo.use).to.have.been.calledWith('testdb');
      });
    });
    describe('show', function () {
      beforeEach(async function () {
        await instanceState.shellApi.show('databases');
      });
      it('calls show with arg', function () {
        expect(mongo.show).to.have.been.calledWith('databases');
      });
    });
    describe('_untrackedShow', function () {
      beforeEach(async function () {
        await instanceState.shellApi._untrackedShow('databases');
      });
      it('calls show with arg and without telemetry', function () {
        expect(mongo.show).to.have.been.calledWith(
          'databases',
          undefined,
          false
        );
      });
    });
    describe('it', function () {
      it('returns empty result if no current cursor', async function () {
        instanceState.currentCursor = null;
        const res: any = await instanceState.shellApi.it();
        expect((await toShellResult(res)).type).to.deep.equal(
          'CursorIterationResult'
        );
      });
      it('calls _it on current Cursor', async function () {
        instanceState.currentCursor = stubInterface<Cursor<M>>();
        await instanceState.shellApi.it();
        expect(instanceState.currentCursor._it).to.have.been.called;
      });
    });
    describe('Mongo', function () {
      beforeEach(function () {
        serviceProvider.platform = 'CLI';
      });
      it('returns a new Mongo object', async function () {
        const m = await instanceState.shellApi.Mongo('localhost:27017');
        expect((await toShellResult(m)).type).to.equal('Mongo');
        expect(m._uri).to.equal(
          'mongodb://localhost:27017/?directConnection=true&serverSelectionTimeoutMS=2000'
        );
      });
      it('fails for non-CLI', async function () {
        serviceProvider.platform = 'Browser';
        try {
          await instanceState.shellApi.Mongo('uri');
        } catch (e: any) {
          return expect(e.name).to.equal('MongoshUnimplementedError');
        }
        expect.fail('MongoshInvalidInputError not thrown for Mongo');
      });
      it('parses URI with mongodb://', async function () {
        const m = await instanceState.shellApi.Mongo(
          'mongodb://127.0.0.1:27017'
        );
        expect(m._uri).to.equal(
          'mongodb://127.0.0.1:27017/?directConnection=true&serverSelectionTimeoutMS=2000'
        );
      });
      it('parses URI with just db', async function () {
        const m = await instanceState.shellApi.Mongo('dbname');
        expect(m._uri).to.equal(
          'mongodb://127.0.0.1:27017/dbname?directConnection=true&serverSelectionTimeoutMS=2000'
        );
      });
      context('FLE', function () {
        [
          { type: 'base64 string', key: b641234, expectedKey: b641234 },
          {
            type: 'Buffer',
            key: Buffer.from(b641234, 'base64'),
            expectedKey: Buffer.from(b641234, 'base64'),
          },
          {
            type: 'BinData',
            key: new bson.Binary(Buffer.from(b641234, 'base64'), 128),
            expectedKey: Buffer.from(b641234, 'base64'),
          },
        ].forEach(({ type, key, expectedKey }) => {
          it(`local kms provider - key is ${type}`, async function () {
            await instanceState.shellApi.Mongo('dbname', {
              keyVaultNamespace: 'encryption.dataKeys',
              kmsProviders: {
                local: {
                  key: key,
                },
              },
            });
            expect(
              serviceProvider.getNewConnection
            ).to.have.been.calledOnceWithExactly(
              'mongodb://127.0.0.1:27017/dbname?directConnection=true&serverSelectionTimeoutMS=2000',
              {
                autoEncryption: {
                  extraOptions: {},
                  keyVaultClient: undefined,
                  keyVaultNamespace: 'encryption.dataKeys',
                  kmsProviders: { local: { key: expectedKey } },
                },
              }
            );
          });
        });
        it('aws kms provider', async function () {
          await instanceState.shellApi.Mongo('dbname', {
            keyVaultNamespace: 'encryption.dataKeys',
            kmsProviders: {
              aws: {
                accessKeyId: 'abc',
                secretAccessKey: '123',
              },
            },
          });
          expect(
            serviceProvider.getNewConnection
          ).to.have.been.calledOnceWithExactly(
            'mongodb://127.0.0.1:27017/dbname?directConnection=true&serverSelectionTimeoutMS=2000',
            {
              autoEncryption: {
                extraOptions: {},
                keyVaultClient: undefined,
                keyVaultNamespace: 'encryption.dataKeys',
                kmsProviders: {
                  aws: { accessKeyId: 'abc', secretAccessKey: '123' },
                },
              },
            }
          );
        });
        it('local kms provider with current as Mongo', async function () {
          await instanceState.shellApi.Mongo('dbname', {
            keyVaultNamespace: 'encryption.dataKeys',
            kmsProviders: {
              local: {
                key: Buffer.from(b641234, 'base64'),
              },
            },
            keyVaultClient: mongo,
          });
          expect(
            serviceProvider.getNewConnection
          ).to.have.been.calledOnceWithExactly(
            'mongodb://127.0.0.1:27017/dbname?directConnection=true&serverSelectionTimeoutMS=2000',
            {
              autoEncryption: {
                extraOptions: {},
                keyVaultClient: rawClientStub,
                keyVaultNamespace: 'encryption.dataKeys',
                kmsProviders: {
                  local: { key: Buffer.from(b641234, 'base64') },
                },
              },
            }
          );
        });
        it('local kms provider with different Mongo', async function () {
          const sp = stubInterface<ServiceProvider>();
          const rc = stubInterface<MongoClient>();
          sp.getRawClient.returns(rc);
          const m = new Mongo(
            { initialServiceProvider: sp } as any,
            'dbName',
            undefined,
            undefined,
            sp
          );
          await instanceState.shellApi.Mongo('dbname', {
            keyVaultNamespace: 'encryption.dataKeys',
            kmsProviders: {
              local: {
                key: Buffer.from(b641234, 'base64'),
              },
            },
            keyVaultClient: m,
          });
          expect(
            serviceProvider.getNewConnection
          ).to.have.been.calledOnceWithExactly(
            'mongodb://127.0.0.1:27017/dbname?directConnection=true&serverSelectionTimeoutMS=2000',
            {
              autoEncryption: {
                extraOptions: {},
                keyVaultClient: rc,
                keyVaultNamespace: 'encryption.dataKeys',
                kmsProviders: {
                  local: { key: Buffer.from(b641234, 'base64') },
                },
              },
            }
          );
        });
        it('throws if missing namespace', async function () {
          try {
            await instanceState.shellApi.Mongo('dbname', {
              kmsProviders: {
                aws: {
                  accessKeyId: 'abc',
                  secretAccessKey: '123',
                },
              },
            } as any);
          } catch (e: any) {
            return expect(e.message).to.contain('required property');
          }
          expect.fail('failed to throw expected error');
        });
        it('throws if missing kmsProviders', async function () {
          try {
            await instanceState.shellApi.Mongo('dbname', {
              keyVaultNamespace: 'encryption.dataKeys',
            } as any);
          } catch (e: any) {
            return expect(e.message).to.contain('required property');
          }
          expect.fail('failed to throw expected error');
        });
        it('throws for unknown args', async function () {
          try {
            await instanceState.shellApi.Mongo('dbname', {
              keyVaultNamespace: 'encryption.dataKeys',
              kmsProviders: {
                aws: {
                  accessKeyId: 'abc',
                  secretAccessKey: '123',
                },
              },
              unknownKey: 1,
            } as any);
          } catch (e: any) {
            return expect(e.message).to.contain('unknownKey');
          }
          expect.fail('failed to throw expected error');
        });
        it('passes along optional arguments', async function () {
          await instanceState.shellApi.Mongo('dbname', {
            keyVaultNamespace: 'encryption.dataKeys',
            kmsProviders: {
              local: {
                key: Buffer.from(b641234, 'base64'),
              },
            },
            schemaMap: schemaMap,
            bypassAutoEncryption: true,
          });
          expect(
            serviceProvider.getNewConnection
          ).to.have.been.calledOnceWithExactly(
            'mongodb://127.0.0.1:27017/dbname?directConnection=true&serverSelectionTimeoutMS=2000',
            {
              autoEncryption: {
                extraOptions: {},
                keyVaultClient: undefined,
                keyVaultNamespace: 'encryption.dataKeys',
                kmsProviders: {
                  local: { key: Buffer.from(b641234, 'base64') },
                },
                schemaMap: schemaMap,
                bypassAutoEncryption: true,
              },
            }
          );
        });
      });
    });
    describe('connect', function () {
      it('returns a new DB', async function () {
        serviceProvider.platform = 'CLI';
        const db = await instanceState.shellApi.connect(
          'localhost:27017',
          'username',
          'pwd'
        );
        expect((await toShellResult(db)).type).to.equal('Database');
        expect(db.getMongo()._uri).to.equal(
          'mongodb://username:pwd@localhost:27017/?directConnection=true&serverSelectionTimeoutMS=2000'
        );
      });
      it('fails with no arg', async function () {
        serviceProvider.platform = 'CLI';
        try {
          await (instanceState.shellApi as any).connect();
        } catch (e: any) {
          return expect(e.name).to.equal('MongoshInvalidInputError');
        }
        expect.fail('MongoshInvalidInputError not thrown for connect');
      });
    });
    describe('version', function () {
      it('returns a string for the version', function () {
        const version = instanceState.shellApi.version();
        const expected = MONGOSH_VERSION;
        expect(version).to.be.a('string');
        expect(version).to.equal(expected);
      });
    });
  });
  describe('from context', function () {
    let serviceProvider: StubbedInstance<ServiceProvider>;
    let bus: EventEmitter;
    let instanceState: ShellInstanceState;
    let mongo: Mongo;
    let evaluationListener: Required<StubbedInstance<EvaluationListener>>;

    beforeEach(function () {
      bus = new EventEmitter();
      const newSP = stubInterface<ServiceProvider>();
      newSP.initialDb = 'test';
      serviceProvider = stubInterface<ServiceProvider>({
        getNewConnection: newSP,
      });
      serviceProvider.initialDb = 'test';
      serviceProvider.platform = 'CLI';
      serviceProvider.bsonLibrary = bson;
      mongo = stubInterface<Mongo>();
      mongo._serviceProvider = serviceProvider;
      evaluationListener = stubInterface<EvaluationListener>() as Required<
        StubbedInstance<EvaluationListener>
      >;
      instanceState = new ShellInstanceState(serviceProvider, bus);
      instanceState.setCtx({});
      instanceState.mongos.push(mongo);
      instanceState.currentDb._mongo = mongo;
      instanceState.setEvaluationListener(evaluationListener);
    });
    it('calls help function', async function () {
      expect(
        (await toShellResult(instanceState.context.use.help())).type
      ).to.equal('Help');
      expect(
        (await toShellResult(instanceState.context.use.help)).type
      ).to.equal('Help');
    });
    describe('use', function () {
      beforeEach(function () {
        instanceState.context.use('testdb');
      });
      it('calls use with arg', function () {
        expect(mongo.use).to.have.been.calledWith('testdb');
      });
    });
    describe('show', function () {
      beforeEach(function () {
        instanceState.context.show('databases');
      });
      it('calls show with arg', function () {
        expect(mongo.show).to.have.been.calledWith('databases');
      });
    });
    describe('it', function () {
      it('returns empty result if no current cursor', async function () {
        instanceState.currentCursor = null;
        const res: any = await instanceState.context.it();
        expect((await toShellResult(res)).type).to.deep.equal(
          'CursorIterationResult'
        );
      });
      it('calls _it on current Cursor', async function () {
        instanceState.currentCursor = stubInterface<Cursor<M>>();
        await instanceState.context.it();
        expect(instanceState.currentCursor._it).to.have.been.called;
      });
    });
    describe('Mongo', function () {
      beforeEach(function () {
        serviceProvider.platform = 'CLI';
      });
      it('returns a new Mongo object', async function () {
        const m = await instanceState.context.Mongo(
          'mongodb://127.0.0.1:27017'
        );
        expect((await toShellResult(m)).type).to.equal('Mongo');
        expect(m._uri).to.equal(
          'mongodb://127.0.0.1:27017/?directConnection=true&serverSelectionTimeoutMS=2000'
        );
      });
      it('returns a new Mongo object with new', async function () {
        const m = await new instanceState.context.Mongo(
          'mongodb://127.0.0.1:27017'
        );
        expect((await toShellResult(m)).type).to.equal('Mongo');
        expect(m._uri).to.equal(
          'mongodb://127.0.0.1:27017/?directConnection=true&serverSelectionTimeoutMS=2000'
        );
      });
      it('fails for non-CLI', async function () {
        serviceProvider.platform = 'Browser';
        try {
          await instanceState.shellApi.Mongo('mongodb://127.0.0.1:27017');
        } catch (e: any) {
          return expect(e.name).to.equal('MongoshUnimplementedError');
        }
        expect.fail('MongoshInvalidInputError not thrown for Mongo');
      });
    });
    describe('connect', function () {
      it('returns a new DB', async function () {
        serviceProvider.platform = 'CLI';
        const db = await instanceState.context.connect(
          'mongodb://127.0.0.1:27017'
        );
        expect((await toShellResult(db)).type).to.equal('Database');
        expect(db.getMongo()._uri).to.equal(
          'mongodb://127.0.0.1:27017/?directConnection=true&serverSelectionTimeoutMS=2000'
        );
      });
      it('handles username/pwd', async function () {
        serviceProvider.platform = 'CLI';
        const db = await instanceState.context.connect(
          'mongodb://127.0.0.1:27017',
          'username',
          'pwd'
        );
        expect((await toShellResult(db)).type).to.equal('Database');
        expect(db.getMongo()._uri).to.equal(
          'mongodb://username:pwd@127.0.0.1:27017/?directConnection=true&serverSelectionTimeoutMS=2000'
        );
        expect(
          serviceProvider.getNewConnection
        ).to.have.been.calledOnceWithExactly(
          'mongodb://username:pwd@127.0.0.1:27017/?directConnection=true&serverSelectionTimeoutMS=2000',
          {}
        );
      });
    });
    describe('version', function () {
      it('returns a string for the version', function () {
        const version = instanceState.context.version();
        const expected = MONGOSH_VERSION;
        expect(version).to.be.a('string');
        expect(version).to.equal(expected);
      });
    });
    describe('isInteractive', function () {
      it('returns a boolean', function () {
        expect(instanceState.context.isInteractive()).to.equal(false);
        instanceState.isInteractive = true;
        expect(instanceState.context.isInteractive()).to.equal(true);
      });
    });
    for (const cmd of ['exit', 'quit']) {
      describe(cmd, function () {
        it('instructs the shell to exit', async function () {
          evaluationListener.onExit.resolves();
          try {
            await instanceState.context[cmd]();
            expect.fail('missed exception');
          } catch (e: any) {
            // We should be getting an exception because we’re not actually exiting.
            expect(e.message).to.contain('onExit listener returned');
          }
          expect(evaluationListener.onExit).to.have.been.calledWith();
        });
        it('passes on the exit code, if provided', async function () {
          evaluationListener.onExit.resolves();
          try {
            await instanceState.context[cmd](1);
            expect.fail('missed exception');
          } catch (e: any) {
            // We should be getting an exception because we’re not actually exiting.
            expect(e.message).to.contain('onExit listener returned');
          }
          expect(evaluationListener.onExit).to.have.been.calledWith(1);
        });
      });
    }
    describe('enableTelemetry', function () {
      it('calls .setConfig("enableTelemetry") with true', function () {
        instanceState.context.enableTelemetry();
        expect(evaluationListener.setConfig).to.have.been.calledWith(
          'enableTelemetry',
          true
        );
      });
    });
    describe('disableTelemetry', function () {
      it('calls .setConfig("enableTelemetry") with false', function () {
        instanceState.context.disableTelemetry();
        expect(evaluationListener.setConfig).to.have.been.calledWith(
          'enableTelemetry',
          false
        );
      });
    });
    describe('passwordPrompt', function () {
      it('asks the evaluation listener for a password', async function () {
        evaluationListener.onPrompt.resolves('passw0rd');
        const pwd = await instanceState.context.passwordPrompt();
        expect(pwd).to.equal('passw0rd');
        expect(evaluationListener.onPrompt).to.have.been.calledWith(
          'Enter password',
          'password'
        );
      });
      it('fails for currently unsupported platforms', async function () {
        instanceState.setEvaluationListener({});
        try {
          await instanceState.context.passwordPrompt();
          expect.fail('missed exception');
        } catch (err: any) {
          expect(err.message).to.equal(
            '[COMMON-90002] passwordPrompt() is not available in this shell'
          );
        }
      });
    });
    describe('sleep', function () {
      it('suspends execution', async function () {
        const now = Date.now();
        await instanceState.context.sleep(50);
        const then = Date.now();
        expect(then - now).to.be.greaterThan(40);
      });
    });
    describe('cls', function () {
      it('clears the screen', async function () {
        evaluationListener.onClearCommand.resolves();
        await instanceState.context.cls();
        expect(evaluationListener.onClearCommand).to.have.been.calledWith();
      });
    });
    describe('load', function () {
      it('asks the evaluation listener to load a file', async function () {
        const apiLoadFileListener = sinon.stub();
        bus.on('mongosh:api-load-file', apiLoadFileListener);
        // eslint-disable-next-line @typescript-eslint/require-await
        evaluationListener.onLoad.callsFake(async (filename: string) => {
          expect(filename).to.equal('abc.js');
          expect(instanceState.context.__filename).to.equal(undefined);
          expect(instanceState.context.__dirname).to.equal(undefined);
          return {
            resolvedFilename: '/resolved/abc.js',
            // eslint-disable-next-line @typescript-eslint/require-await
            evaluate: async () => {
              expect(instanceState.context.__filename).to.equal(
                '/resolved/abc.js'
              );
              expect(instanceState.context.__dirname).to.equal('/resolved');
            },
          };
        });
        await instanceState.context.load('abc.js');
        expect(evaluationListener.onLoad).to.have.callCount(1);
        expect(instanceState.context.__filename).to.equal(undefined);
        expect(instanceState.context.__dirname).to.equal(undefined);
        expect(apiLoadFileListener).to.have.been.calledWith({
          nested: false,
          filename: 'abc.js',
        });
      });
      it('emits different events depending on nesting level', async function () {
        const apiLoadFileListener = sinon.stub();
        bus.on('mongosh:api-load-file', apiLoadFileListener);
        // eslint-disable-next-line @typescript-eslint/require-await
        evaluationListener.onLoad.callsFake(async (filename: string) => {
          return {
            resolvedFilename: '/resolved/' + filename,
            evaluate: async () => {
              if (filename === 'def.js') {
                return;
              }
              await instanceState.context.load('def.js');
            },
          };
        });
        await instanceState.context.load('abc.js');
        expect(apiLoadFileListener).to.have.callCount(2);
        expect(apiLoadFileListener).to.have.been.calledWith({
          nested: false,
          filename: 'abc.js',
        });
        expect(apiLoadFileListener).to.have.been.calledWith({
          nested: true,
          filename: 'def.js',
        });
      });
    });
    for (const cmd of ['print', 'printjson']) {
      describe(cmd, function () {
        it('prints values', async function () {
          evaluationListener.onPrint?.resolves();
          await instanceState.context[cmd](1, 2);
          expect(evaluationListener.onPrint).to.have.been.calledOnceWithExactly(
            [
              { printable: 1, rawValue: 1, type: null },
              { printable: 2, rawValue: 2, type: null },
            ],
            cmd
          );
        });
      });
    }

    describe('config', function () {
      context('with a full-config evaluation listener', function () {
        let store: Document;
        let config: ShellConfig;
        let validators: Record<string, (value: any) => string | null>;

        beforeEach(function () {
          config = instanceState.shellApi.config;
          store = { somekey: '' };
          validators = {};
          // eslint-disable-next-line @typescript-eslint/require-await
          evaluationListener.setConfig.callsFake(async (key, value) => {
            if (key === ('ignoreme' as any)) return 'ignored';
            store[key] = value;
            return 'success';
          });
          // eslint-disable-next-line @typescript-eslint/require-await
          evaluationListener.resetConfig.callsFake((key: string): 'success' => {
            store[key] = '';
            return 'success';
          });
          // eslint-disable-next-line @typescript-eslint/require-await
          evaluationListener.getConfig.callsFake(async (key) => store[key]);
          // eslint-disable-next-line @typescript-eslint/require-await
          evaluationListener.validateConfig.callsFake(async (key, value) =>
            validators[key]?.(value)
          );
          evaluationListener.listConfigOptions.callsFake(() =>
            Object.keys(store)
          );
        });

        it('can get/set/list config keys', async function () {
          const value = { structuredData: 'value' };
          expect(await config.set('somekey' as any, value)).to.equal(
            'Setting "somekey" has been changed'
          );
          expect(await config.get('somekey' as any)).to.deep.equal(value);
          expect((await toShellResult(config)).printable).to.deep.equal(
            new Map([['somekey', value]])
          );
          expect(await config.reset('somekey' as any)).to.deep.equal(
            'Setting "somekey" has been reset to its default value'
          );
          expect(await config.get('somekey' as any)).to.deep.equal('');
        });

        it('will fall back to defaults', async function () {
          expect(await config.get('displayBatchSize')).to.equal(20);
        });

        it('rejects setting unavailable config keys', async function () {
          expect(await config.set('unavailable' as any, 'value')).to.equal(
            'Option "unavailable" is not available in this environment'
          );
        });

        it('rejects setting explicitly ignored config keys', async function () {
          expect(await config.set('ignoreme' as any, 'value')).to.equal(
            'Option "ignoreme" is not available in this environment'
          );
        });

        it('rejects setting explicitly invalid config values', async function () {
          store.badvalue = 1; // Make sure the config option exists
          validators.badvalue = (value) => `Bad value ${value} passed`;
          expect(await config.set('badvalue' as any, 'somevalue')).to.equal(
            'Cannot set option "badvalue": Bad value somevalue passed'
          );
        });
      });

      context('with a no-config evaluation listener', function () {
        let config: ShellConfig;

        beforeEach(function () {
          config = instanceState.shellApi.config;
        });

        it('will work with defaults', async function () {
          expect(await config.get('displayBatchSize')).to.equal(20);

          const shellResult = await toShellResult(config);
          const expectedResult = new Map([
            ['displayBatchSize', 20],
            ['maxTimeMS', null],
            ['enableTelemetry', false],
            ['editor', null],
          ] as any);

          expect(shellResult.printable).to.deep.equal(expectedResult);
        });

        it('rejects setting all config keys', async function () {
          expect(await config.set('somekey' as any, 'value')).to.equal(
            'Option "somekey" is not available in this environment'
          );
        });
      });
    });
  });
  describe('command completers', function () {
    const params = {
      getCollectionCompletionsForCurrentDb: () => [''],
      getDatabaseCompletions: (dbName: string) =>
        ['dbOne', 'dbTwo'].filter((s) => s.startsWith(dbName)),
    };

    it('provides completions for show', async function () {
      const completer =
        signatures.ShellApi.attributes!.show.shellCommandCompleter!;
      expect(await completer(params, ['show', ''])).to.contain('databases');
      expect(await completer(params, ['show', 'pro'])).to.deep.equal([
        'profile',
      ]);
    });

    it('provides completions for use', async function () {
      const completer =
        signatures.ShellApi.attributes!.use.shellCommandCompleter!;
      expect(await completer(params, ['use', ''])).to.deep.equal([
        'dbOne',
        'dbTwo',
      ]);
      expect(await completer(params, ['use', 'dbO'])).to.deep.equal(['dbOne']);
    });
  });
});

describe('returnsPromise marks async functions', function () {
  it('no non-async functions are marked returnsPromise', function () {
    expect(nonAsyncFunctionsReturningPromises).to.deep.equal([]);
  });
});
