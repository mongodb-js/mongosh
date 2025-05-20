import { expect } from 'chai';
import Mongo from './mongo';
import {
  ADMIN_DB,
  ALL_PLATFORMS,
  ALL_SERVER_VERSIONS,
  ALL_TOPOLOGIES,
} from './enums';
import { signatures, toShellResult } from './index';
import type { StubbedInstance } from 'ts-sinon';
import { stubInterface } from 'ts-sinon';
import type {
  MongoClientOptions,
  ReadConcern,
  ReadPreference,
  ServiceProvider,
  WriteConcern,
} from '@mongosh/service-provider-core';
import { bson } from '@mongosh/service-provider-core';
import type { DatabaseWithSchema } from './database';
import { EventEmitter } from 'events';
import ShellInstanceState from './shell-instance-state';
import { Collection } from './collection';
import type Cursor from './cursor';
import ChangeStreamCursor from './change-stream-cursor';
import NoDatabase from './no-db';
import {
  MongoshDeprecatedError,
  MongoshInternalError,
  MongoshUnimplementedError,
} from '@mongosh/errors';
import { NodeDriverServiceProvider } from '../../service-provider-node-driver';
import {
  skipIfServerVersion,
  startSharedTestServer,
} from '../../../testing/integration-testing-hooks';
import { dummyOptions } from './helpers.spec';
import { ClientBulkWriteResult } from './result';

const sampleOpts = {
  causalConsistency: false,
  readConcern: { level: 'majority' } as ReadConcern,
  writeConcern: { w: 1, j: false, wtimeout: 0 } as WriteConcern,
  readPreference: { mode: 'primary', tagSet: [] } as unknown as ReadPreference,
};

describe('Mongo', function () {
  describe('help', function () {
    const apiClass = new Mongo({} as any, '');
    it('calls help function', async function () {
      expect((await toShellResult(apiClass.help())).type).to.equal('Help');
      expect((await toShellResult(apiClass.help)).type).to.equal('Help');
    });
  });
  describe('signatures', function () {
    it('type', function () {
      expect(signatures.Mongo.type).to.equal('Mongo');
    });
    it('attributes', function () {
      expect(signatures.Mongo.attributes?.show).to.deep.equal({
        type: 'function',
        returnsPromise: true,
        deprecated: false,
        returnType: { attributes: {}, type: 'unknown' },
        platforms: ALL_PLATFORMS,
        topologies: ALL_TOPOLOGIES,
        apiVersions: [1, Infinity],
        serverVersions: ALL_SERVER_VERSIONS,
        isDirectShellCommand: false,
        acceptsRawInput: false,
        shellCommandCompleter: undefined,
      });
    });
  });
  describe('Metadata', function () {
    const MONGO_URI = 'localhost:37017';
    const MONGO_CONNECTION_STRING =
      'mongodb://localhost:37017/?directConnection=true&serverSelectionTimeoutMS=2000';
    const mongo = new Mongo({} as any, MONGO_URI);

    describe('toShellResult', function () {
      it('value', async function () {
        expect((await toShellResult(mongo)).printable).to.equal(
          MONGO_CONNECTION_STRING
        );
      });
      it('type', async function () {
        expect((await toShellResult(mongo)).type).to.equal('Mongo');
      });
    });

    describe('getURI', function () {
      it('returns the connection string of active connection', function () {
        expect(mongo.getURI()).to.equal(MONGO_CONNECTION_STRING);
      });
    });
  });
  describe('commands', function () {
    const driverSession = { driverSession: 1 };
    let mongo: Mongo;
    let serviceProvider: StubbedInstance<ServiceProvider>;
    let database: StubbedInstance<DatabaseWithSchema>;
    let bus: StubbedInstance<EventEmitter>;
    let instanceState: ShellInstanceState;

    beforeEach(function () {
      bus = stubInterface<EventEmitter>();
      serviceProvider = stubInterface<ServiceProvider>();
      serviceProvider.initialDb = 'test';
      serviceProvider.bsonLibrary = bson;
      serviceProvider.runCommand.resolves({ ok: 1 });
      serviceProvider.startSession.returns({ driverSession: 1 } as any);
      instanceState = new ShellInstanceState(serviceProvider, bus);
      mongo = new Mongo(
        instanceState,
        undefined,
        undefined,
        undefined,
        serviceProvider
      );
      database = stubInterface<DatabaseWithSchema>();
      instanceState.currentDb = database;
    });
    describe('show', function () {
      it('should send telemetry by default', async function () {
        serviceProvider.listDatabases.resolves({ ok: 1, databases: [] });
        await mongo.show('dbs');

        expect(bus.emit).to.have.been.calledWith('mongosh:show', {
          method: 'show dbs',
        });
      });

      it('should not send telemetry when disabled', async function () {
        serviceProvider.listDatabases.resolves({ ok: 1, databases: [] });
        await mongo.show('dbs', undefined, false);

        expect(bus.emit).to.not.have.been.calledWith('mongosh:show', {
          method: 'show dbs',
        });
      });

      ['databases', 'dbs'].forEach((t) => {
        describe(t, function () {
          it('calls serviceProvider.listDatabases on the admin database', async function () {
            const expectedResult = { ok: 1, databases: [] };
            serviceProvider.listDatabases.resolves(expectedResult);
            await mongo.show(t);
            expect(serviceProvider.listDatabases).to.have.been.calledWith(
              ADMIN_DB
            );
          });

          it('returns ShowDatabasesResult CommandResult', async function () {
            const expectedResult = { ok: 1, databases: ['a', 'b'] };
            serviceProvider.listDatabases.resolves(expectedResult);
            const result = await mongo.show(t);
            expect(result.value).to.deep.equal(expectedResult.databases);
            expect(result.type).to.equal('ShowDatabasesResult');
          });

          it('throws if serviceProvider.listCommands rejects', async function () {
            const expectedError = new Error();
            serviceProvider.listDatabases.rejects(expectedError);
            const caughtError = await mongo.show(t).catch((e) => e);
            expect(caughtError).to.equal(expectedError);
          });
        });
      });
      ['collections', 'tables'].forEach((t) => {
        describe(t, function () {
          it('calls database.getCollectionNames', async function () {
            const expectedResult = [
              { name: 'a', badge: '' },
              { name: 'b', badge: '' },
            ];
            database._getCollectionNamesWithTypes.resolves(expectedResult);
            await mongo.show(t);
            expect(
              database._getCollectionNamesWithTypes
            ).to.have.been.calledWith({
              promoteLongs: true,
              readPreference: 'primaryPreferred',
            });
          });

          it('returns ShowCollectionsResult CommandResult', async function () {
            const expectedResult = [
              { name: 'a', badge: '' },
              { name: 'b', badge: '' },
            ];
            database._getCollectionNamesWithTypes.resolves(expectedResult);
            const result = await mongo.show(t);
            expect(result.value).to.deep.equal(expectedResult);
            expect(result.type).to.equal('ShowCollectionsResult');
          });

          it('throws if database.getCollectionNames rejects', async function () {
            const expectedError = new Error();
            database._getCollectionNamesWithTypes.rejects(expectedError);
            const caughtError = await mongo.show(t).catch((e) => e);
            expect(caughtError).to.equal(expectedError);
          });
        });
      });
      describe('users', function () {
        it('calls database.getUsers', async function () {
          const expectedResult = { ok: 1, users: [] };
          database.getUsers.resolves(expectedResult);
          await mongo.show('users');
          expect(database.getUsers).to.have.been.calledWith();
        });

        it('returns ShowResult CommandResult', async function () {
          const expectedResult = { ok: 1, users: ['a', 'b'] };
          database.getUsers.resolves(expectedResult);
          const result = await mongo.show('users');
          expect(result.value).to.deep.equal(expectedResult.users);
          expect(result.type).to.equal('ShowResult');
        });

        it('throws if database.getUsers rejects', async function () {
          const expectedError = new Error();
          database.getUsers.rejects(expectedError);
          const caughtError = await mongo.show('users').catch((e) => e);
          expect(caughtError).to.equal(expectedError);
        });
      });
      describe('roles', function () {
        it('calls database.getRoles', async function () {
          const expectedResult = { ok: 1, roles: [] };
          database.getRoles.resolves(expectedResult);
          await mongo.show('roles');
          expect(database.getRoles).to.have.been.calledWith({
            showBuiltinRoles: true,
          });
        });

        it('returns ShowResult CommandResult', async function () {
          const expectedResult = { ok: 1, roles: ['a', 'b'] };
          database.getRoles.resolves(expectedResult);
          const result = await mongo.show('roles');
          expect(result.value).to.deep.equal(expectedResult.roles);
          expect(result.type).to.equal('ShowResult');
        });

        it('throws if database.getRoles rejects', async function () {
          const expectedError = new Error();
          database.getRoles.rejects(expectedError);
          const caughtError = await mongo.show('roles').catch((e) => e);
          expect(caughtError).to.equal(expectedError);
        });
      });
      describe('log', function () {
        it('calls database.adminCommand without arg', async function () {
          const expectedResult = { ok: 1, log: [] };
          database.adminCommand.resolves(expectedResult);
          await mongo.show('log');
          expect(database.adminCommand).to.have.been.calledWith({
            getLog: 'global',
          });
        });
        it('calls database.adminCommand with arg', async function () {
          const expectedResult = { ok: 1, log: [] };
          database.adminCommand.resolves(expectedResult);
          await mongo.show('log', 'other');
          expect(database.adminCommand).to.have.been.calledWith({
            getLog: 'other',
          });
        });

        it('returns ShowResult CommandResult', async function () {
          const expectedResult = { ok: 1, log: ['a', 'b'] };
          database.adminCommand.resolves(expectedResult);
          const result = await mongo.show('log');
          expect(result.value).to.deep.equal(expectedResult.log);
          expect(result.type).to.equal('ShowResult');
        });

        it('throws if database.adminCommand rejects', async function () {
          const expectedError = new Error();
          database.adminCommand.rejects(expectedError);
          const caughtError = await mongo.show('log').catch((e) => e);
          expect(caughtError).to.equal(expectedError);
        });
      });
      describe('logs', function () {
        it('calls database.adminCommand', async function () {
          const expectedResult = { ok: 1, names: [] };
          database.adminCommand.resolves(expectedResult);
          await mongo.show('logs');
          expect(database.adminCommand).to.have.been.calledWith({
            getLog: '*',
          });
        });

        it('returns ShowResult CommandResult', async function () {
          const expectedResult = { ok: 1, names: ['a', 'b'] };
          database.adminCommand.resolves(expectedResult);
          const result = await mongo.show('logs');
          expect(result.value).to.deep.equal(expectedResult.names);
          expect(result.type).to.equal('ShowResult');
        });

        it('throws if database.adminCommand rejects', async function () {
          const expectedError = new Error();
          database.adminCommand.rejects(expectedError);
          const caughtError = await mongo.show('logs').catch((e) => e);
          expect(caughtError).to.equal(expectedError);
        });
      });
      describe('profile', function () {
        it('calls database.count but not find when count < 1', async function () {
          const syscoll = stubInterface<Collection>();
          database.getCollection.returns(syscoll);
          syscoll.countDocuments.resolves(0);
          syscoll.find.rejects(new Error());
          const result = await mongo.show('profile');
          expect(database.getCollection).to.have.been.calledWith(
            'system.profile'
          );
          expect(syscoll.countDocuments).to.have.been.calledWith({});
          expect(result.type).to.equal('ShowProfileResult');
          expect(result.value).to.deep.equal({ count: 0 });
        });
        it('calls database.count and find when count > 0', async function () {
          const expectedResult = [{ a: 'a' }, { b: 'b' }];
          const syscoll = stubInterface<Collection>();
          const cursor = stubInterface<Cursor>();
          cursor.sort.returns(cursor);
          cursor.limit.returns(cursor);
          cursor.toArray.resolves(expectedResult);
          database.getCollection.returns(syscoll);
          syscoll.countDocuments.resolves(1);
          syscoll.find.resolves(cursor);
          const result = await mongo.show('profile');
          expect(database.getCollection).to.have.been.calledWith(
            'system.profile'
          );
          expect(syscoll.countDocuments).to.have.been.calledWith({});
          expect(cursor.sort).to.have.been.calledWith({ $natural: -1 });
          expect(cursor.limit).to.have.been.calledWith(5);
          expect(cursor.toArray).to.have.been.calledWith();
          expect(result.type).to.equal('ShowProfileResult');
          expect(result.value).to.deep.equal({
            count: 1,
            result: expectedResult,
          });
        });

        it('throws if collection.find throws', async function () {
          const syscoll = stubInterface<Collection>();
          database.getCollection.returns(syscoll);
          syscoll.countDocuments.resolves(1);
          const expectedError = new Error();
          syscoll.find.throws(expectedError);
          const caughtError = await mongo.show('profile').catch((e) => e);
          expect(caughtError).to.equal(expectedError);
        });
        it('throws if collection.countDocuments rejects', async function () {
          const syscoll = stubInterface<Collection>();
          database.getCollection.returns(syscoll);
          const expectedError = new Error();
          syscoll.countDocuments.rejects(expectedError);
          const caughtError = await mongo.show('profile').catch((e) => e);
          expect(caughtError).to.equal(expectedError);
        });
      });

      describe('startupWarnings', function () {
        it('calls database.adminCommand', async function () {
          const expectedResult = { ok: 1, log: [] };
          database.adminCommand.resolves(expectedResult);
          await mongo.show('startupWarnings');
          expect(database.adminCommand).to.have.been.calledWith({
            getLog: 'startupWarnings',
          });
        });

        it('returns ShowBannerResult CommandResult', async function () {
          const expectedResult = {
            ok: 1,
            log: [
              '{"t":{"$date":"2022-05-17T11:16:16.597+02:00"},"s":"I",  "c":"STORAGE",  "id":22297,   "ctx":"initandlisten","msg":"Using the XFS filesystem is strongly recommended with the WiredTiger storage engine. See http://dochub.mongodb.org/core/prodnotes-filesystem","tags":["startupWarnings"]}\n',
              '{"t":{"$date":"2022-05-17T11:16:16.778+02:00"},"s":"W",  "c":"CONTROL",  "id":22120,   "ctx":"initandlisten","msg":"Access control is not enabled for the database. Read and write access to data and configuration is unrestricted","tags":["startupWarnings"]}\n',
            ],
          };
          database.adminCommand.resolves(expectedResult);
          const result = await mongo.show('startupWarnings');
          expect(result.value).to.deep.equal({
            header: 'The server generated these startup warnings when booting',
            content:
              '2022-05-17T11:16:16.597+02:00: Using the XFS filesystem is strongly recommended with the WiredTiger storage engine. See http://dochub.mongodb.org/core/prodnotes-filesystem\n' +
              '2022-05-17T11:16:16.778+02:00: Access control is not enabled for the database. Read and write access to data and configuration is unrestricted',
          });
          expect(result.type).to.equal('ShowBannerResult');
        });

        it('returns null database.adminCommand rejects', async function () {
          const expectedError = new Error();
          database.adminCommand.rejects(expectedError);
          const result = await mongo.show('startupWarnings');
          expect(result.value).to.equal(null);
          expect(result.type).to.equal('ShowBannerResult');
        });
      });

      describe('automationNotices', function () {
        it('calls database.hello', async function () {
          const expectedResult = { ok: 1 };
          database.hello.resolves(expectedResult);
          await mongo.show('automationNotices');
          expect(database.hello).to.have.been.calledWith();
        });

        it('returns ShowBannerResult CommandResult', async function () {
          const expectedResult = {
            ok: 1,
            automationServiceDescriptor: 'some_service',
          };
          database.hello.resolves(expectedResult);
          const result = await mongo.show('automationNotices');
          expect(result.value).to.deep.equal({
            content:
              "This server is managed by automation service 'some_service'.\n" +
              'Many administrative actions are inappropriate, and may be automatically reverted.',
          });
          expect(result.type).to.equal('ShowBannerResult');
        });

        it('returns null database.hello rejects', async function () {
          const expectedError = new Error();
          database.hello.rejects(expectedError);
          const result = await mongo.show('automationNotices');
          expect(result.value).to.equal(null);
          expect(result.type).to.equal('ShowBannerResult');
        });
      });

      describe('nonGenuineMongoDBCheck', function () {
        it('returns no warnings for a genuine mongodb connection', async function () {
          serviceProvider.getConnectionInfo.resolves({
            extraInfo: { is_genuine: true, uri: '' },
            buildInfo: {},
          });

          const result = await mongo.show('nonGenuineMongoDBCheck');
          expect(result.type).to.equal('ShowBannerResult');
          expect(result.value).to.be.null;
        });

        context(
          'when connected deployment is not a genuine mongodb deployment',
          function () {
            beforeEach(function () {
              serviceProvider.getConnectionInfo.resolves({
                extraInfo: { is_genuine: false, uri: '' },
                buildInfo: {},
              });
            });

            const warning = [
              'This server or service appears to be an emulation of MongoDB rather than an official MongoDB product.',
              'Some documented MongoDB features may work differently, be entirely missing or incomplete, or have unexpected performance characteristics.',
              'To learn more please visit: https://dochub.mongodb.org/core/non-genuine-mongodb-server-warning.',
            ].join('\n');

            context('and can be determined by serverBuildInfo', function () {
              it('returns warnings', async function () {
                const result = await mongo.show('nonGenuineMongoDBCheck');
                expect(result.type).to.equal('ShowBannerResult');
                expect(result.value).to.deep.equal({
                  header: 'Warning: Non-Genuine MongoDB Detected',
                  content: warning,
                });
              });
            });

            context('and can be determined by serverCmdLineOpts', function () {
              it('returns warnings', async function () {
                const result = await mongo.show('nonGenuineMongoDBCheck');
                expect(result.type).to.equal('ShowBannerResult');
                expect(result.value).to.deep.equal({
                  header: 'Warning: Non-Genuine MongoDB Detected',
                  content: warning,
                });
              });
            });
          }
        );
      });

      describe('invalid command', function () {
        it('throws an error', async function () {
          const caughtError = await mongo
            .show('aslkdjhekjghdskjhfds')
            .catch((e) => e);
          expect(caughtError.name).to.equal('MongoshInvalidInputError');
        });
      });
    });
    describe('getReadPrefMode', function () {
      it('calls serviceProvider.getReadPreference', function () {
        const expectedResult = { mode: 'primary', tagSet: [] } as any;
        serviceProvider.getReadPreference.returns(expectedResult);
        const res = mongo.getReadPrefMode();
        expect(serviceProvider.getReadPreference).to.have.been.calledWith();
        expect(res).to.equal(expectedResult.mode);
      });
    });
    describe('getReadPref', function () {
      it('calls serviceProvider.getReadPreference', function () {
        const expectedResult = { mode: 'primary', tagSet: [] } as any;
        serviceProvider.getReadPreference.returns(expectedResult);
        const res = mongo.getReadPref();
        expect(serviceProvider.getReadPreference).to.have.been.calledWith();
        expect(res).to.equal(expectedResult);
      });
    });
    describe('getReadPrefTagSet', function () {
      it('calls serviceProvider.getReadPreference', function () {
        const expectedResult = { mode: 'primary', tagSet: [] } as any;
        serviceProvider.getReadPreference.returns(expectedResult);
        const res = mongo.getReadPrefTagSet();
        expect(serviceProvider.getReadPreference).to.have.been.calledWith();
        expect(res).to.equal(expectedResult.tags);
      });
    });
    describe('getReadConcern', function () {
      it('calls serviceProvider.getReadConcern', function () {
        const expectedResult = { level: 'majority' };
        serviceProvider.getReadConcern.returns(expectedResult as any);
        const res = mongo.getReadConcern();
        expect(serviceProvider.getReadConcern).to.have.been.calledWith();
        expect(res).to.equal('majority');
      });

      it('returns undefined if not set', function () {
        serviceProvider.getReadConcern.returns(undefined);
        const res = mongo.getReadConcern();
        expect(serviceProvider.getReadConcern).to.have.been.calledWith();
        expect(res).to.equal(undefined);
      });

      it('throws InternalError if getReadConcern errors', function () {
        const expectedError = new Error();
        serviceProvider.getReadConcern.throws(expectedError);
        try {
          mongo.getReadConcern();
        } catch (caughtError: any) {
          return expect(caughtError).to.be.instanceOf(MongoshInternalError);
        }
        expect.fail();
      });
    });
    describe('getWriteConcern', function () {
      it('calls serviceProvider.getWriteConcern', function () {
        const expectedResult: WriteConcern = { w: 'majority', wtimeout: 200 };
        serviceProvider.getWriteConcern.returns(expectedResult as any);
        const res = mongo.getWriteConcern();
        expect(serviceProvider.getWriteConcern).to.have.been.calledWith();
        expect(res).to.equal(expectedResult);
      });

      it('returns undefined if not set', function () {
        serviceProvider.getWriteConcern.returns(undefined);
        const res = mongo.getWriteConcern();
        expect(serviceProvider.getWriteConcern).to.have.been.calledWith();
        expect(res).to.equal(undefined);
      });

      it('throws InternalError if getWriteConcern errors', function () {
        const expectedError = new Error();
        serviceProvider.getWriteConcern.throws(expectedError);
        try {
          mongo.getWriteConcern();
        } catch (caughtError: any) {
          return expect(caughtError).to.be.instanceOf(MongoshInternalError);
        }
        expect.fail();
      });
    });
    describe('setReadPref', function () {
      it('calls serviceProvider.restConnectionOptions', async function () {
        serviceProvider.resetConnectionOptions.resolves();
        serviceProvider.readPreferenceFromOptions.callsFake(
          (input) => input as any
        );
        await mongo.setReadPref('primaryPreferred', []);
        expect(serviceProvider.resetConnectionOptions).to.have.been.calledWith({
          readPreference: {
            readPreference: 'primaryPreferred',
            readPreferenceTags: [],
            hedge: undefined,
          },
        });
      });

      it('throws if resetConnectionOptions errors', async function () {
        const expectedError = new Error();
        serviceProvider.resetConnectionOptions.throws(expectedError);
        try {
          await mongo.setReadPref('primary');
        } catch (caughtError: any) {
          return expect(caughtError).to.equal(expectedError);
        }
        expect.fail();
      });
    });
    describe('setReadConcern', function () {
      it('calls serviceProvider.resetConnectionOptions', async function () {
        serviceProvider.resetConnectionOptions.resolves();
        await mongo.setReadConcern('majority');
        expect(serviceProvider.resetConnectionOptions).to.have.been.calledWith({
          readConcern: {
            level: 'majority',
          },
        });
      });

      it('throws if resetConnectionOptions errors', async function () {
        const expectedError = new Error();
        serviceProvider.resetConnectionOptions.throws(expectedError);
        try {
          await mongo.setReadConcern('majority');
        } catch (caughtError: any) {
          return expect(caughtError).to.equal(expectedError);
        }
        expect.fail();
      });
    });
    describe('setWriteConcern', function () {
      for (const { args, opts } of [
        { args: ['majority'], opts: { w: 'majority' } },
        { args: ['majority', 200], opts: { w: 'majority', wtimeoutMS: 200 } },
        {
          args: ['majority', 200, false],
          opts: { w: 'majority', wtimeoutMS: 200, journal: false },
        },
        {
          args: ['majority', undefined, false],
          opts: { w: 'majority', journal: false },
        },
        {
          args: [{ w: 'majority', wtimeout: 200, fsync: 1 }],
          opts: { w: 'majority', wtimeoutMS: 200, journal: true },
        },
      ] as {
        args: Parameters<typeof mongo.setWriteConcern>;
        opts: MongoClientOptions;
      }[]) {
        it(`calls serviceProvider.resetConnectionOptions for args ${JSON.stringify(
          args
        )}`, async function () {
          serviceProvider.resetConnectionOptions.resolves();
          await mongo.setWriteConcern(...args);
          expect(
            serviceProvider.resetConnectionOptions
          ).to.have.been.calledWith(opts);
        });
      }

      it('throws if resetConnectionOptions errors', async function () {
        const expectedError = new Error();
        serviceProvider.resetConnectionOptions.throws(expectedError);
        try {
          await mongo.setWriteConcern('majority');
        } catch (caughtError: any) {
          return expect(caughtError).to.equal(expectedError);
        }
        expect.fail();
      });
    });
    describe('startSession', function () {
      beforeEach(function () {
        serviceProvider.startSession.returns(driverSession as any);
      });
      it('calls serviceProvider.startSession', function () {
        const opts = { causalConsistency: false };
        const s = mongo.startSession(opts);
        const driverOpts = { ...opts };
        expect(serviceProvider.startSession).to.have.been.calledWith(
          driverOpts
        );
        expect(s._session).to.deep.equal(driverSession);
        expect(s._options).to.deep.equal(driverOpts);
      });

      it('throws if startSession errors', function () {
        const expectedError = new Error();
        serviceProvider.startSession.throws(expectedError);
        try {
          mongo.startSession();
        } catch (caughtError: any) {
          return expect(caughtError).to.equal(expectedError);
        }
        expect.fail();
      });

      it('calls startSession without args', function () {
        const result = mongo.startSession();
        expect(serviceProvider.startSession).to.have.been.calledOnceWith({});
        expect(result._session).to.equal(driverSession);
      });
      it('can set default transaction options readconcern', function () {
        const result = mongo.startSession({
          readConcern: sampleOpts.readConcern,
        });
        expect(serviceProvider.startSession).to.have.been.calledOnceWith({
          defaultTransactionOptions: {
            readConcern: sampleOpts.readConcern,
          },
        });
        expect(result._session).to.equal(driverSession);
      });
      it('can set default transaction options writeConcern', function () {
        const result = mongo.startSession({
          writeConcern: sampleOpts.writeConcern,
        });
        expect(serviceProvider.startSession).to.have.been.calledOnceWith({
          defaultTransactionOptions: {
            writeConcern: sampleOpts.writeConcern,
          },
        });
        expect(result._session).to.equal(driverSession);
      });
      it('can set default transaction options readPreference', function () {
        const result = mongo.startSession({
          readPreference: sampleOpts.readPreference as any,
        });
        expect(serviceProvider.startSession).to.have.been.calledOnceWith({
          defaultTransactionOptions: {
            readPreference: sampleOpts.readPreference,
          },
        });
        expect(result._session).to.equal(driverSession);
      });
      it('can set causalConsistency', function () {
        const result = mongo.startSession({
          causalConsistency: false,
        });
        expect(serviceProvider.startSession).to.have.been.calledOnceWith({
          causalConsistency: false,
        });
        expect(result._session).to.equal(driverSession);
      });
      it('sets everything', function () {
        const result = mongo.startSession(sampleOpts as any);
        expect(serviceProvider.startSession).to.have.been.calledOnceWith({
          causalConsistency: sampleOpts.causalConsistency,
          defaultTransactionOptions: {
            readPreference: sampleOpts.readPreference,
            readConcern: sampleOpts.readConcern,
            writeConcern: sampleOpts.writeConcern,
          },
        });
        expect(result._session).to.equal(driverSession);
      });
    });
    describe('setCausalConsistency', function () {
      it('throws because it is unsupported by the driver', function () {
        try {
          mongo.setCausalConsistency();
          expect.fail('expected error');
        } catch (e: any) {
          expect(e).to.be.instanceOf(MongoshUnimplementedError);
          expect(e.metadata?.driverCaused).to.equal(true);
          expect(e.metadata?.api).to.equal('Mongo.setCausalConsistency');
        }
      });
    });
    describe('isCausalConsistency', function () {
      it('throws because it is unsupported by the driver', function () {
        try {
          mongo.isCausalConsistency();
          expect.fail('expected error');
        } catch (e: any) {
          expect(e).to.be.instanceOf(MongoshUnimplementedError);
          expect(e.metadata?.driverCaused).to.equal(true);
          expect(e.metadata?.api).to.equal('Mongo.isCausalConsistency');
        }
      });
    });
    describe('use', function () {
      it('sets the current db', function () {
        const msg = mongo.use('moo');
        expect(msg).to.equal('switched to db moo');
        expect(instanceState.context.db.getName()).to.equal('moo');
      });
      it('reports if no db switch has taken place', function () {
        mongo.use('moo1');
        const msg = mongo.use('moo1');
        expect(msg).to.equal('already on db moo1');
        expect(instanceState.context.db.getName()).to.equal('moo1');
      });
      it('reports if db has the same name but different Mongo objects', function () {
        instanceState.context.db = new Mongo(
          instanceState,
          undefined,
          undefined,
          undefined,
          serviceProvider
        ).getDB('moo1');
        expect(instanceState.context.db.getName()).to.equal('moo1');
        const msg = mongo.use('moo1');
        expect(msg).to.equal('switched to db moo1');
        expect(instanceState.context.db.getName()).to.equal('moo1');
      });
      it('works if previously there was no db', function () {
        instanceState.context.db = new NoDatabase();
        const msg = mongo.use('moo1');
        expect(msg).to.equal('switched to db moo1');
        expect(instanceState.context.db.getName()).to.equal('moo1');
      });
      it('works if the db name conflicts with Object.prototype', function () {
        instanceState.context.db = new NoDatabase();
        const msg = mongo.use('toString');
        expect(msg).to.equal('switched to db toString');
        expect(instanceState.context.db.getName()).to.equal('toString');
      });
    });
    describe('deprecated mongo methods', function () {
      it('setSlaveOk', function () {
        try {
          mongo.setSlaveOk();
        } catch (e: any) {
          return expect(e).to.be.instanceOf(MongoshDeprecatedError);
        }
        expect.fail();
      });
      it('setSecondaryOk (starts as primary)', async function () {
        const printCalls: any[][] = [];
        instanceState.setEvaluationListener({
          onPrint(...args: any[]) {
            printCalls.push(args);
          },
        });
        serviceProvider.getReadPreference.returns({ mode: 'primary' } as any);
        serviceProvider.resetConnectionOptions.resolves();
        await mongo.setSecondaryOk();
        expect((mongo as any)._readPreferenceWasExplicitlyRequested).to.equal(
          true
        );
        expect(printCalls.map((call) => call[0][0].printable)).to.deep.equal([
          'DeprecationWarning: .setSecondaryOk() is deprecated. Use .setReadPref("primaryPreferred") instead',
          'Setting read preference from "primary" to "primaryPreferred"',
        ]);
      });
      it('setSecondaryOk (starts as secondary)', async function () {
        const printCalls: any[][] = [];
        instanceState.setEvaluationListener({
          onPrint(...args: any[]) {
            printCalls.push(args);
          },
        });
        serviceProvider.getReadPreference.returns({ mode: 'secondary' } as any);
        serviceProvider.resetConnectionOptions.resolves();
        await mongo.setSecondaryOk();
        expect((mongo as any)._readPreferenceWasExplicitlyRequested).to.equal(
          false
        );
        expect(printCalls.map((call) => call[0][0].printable)).to.deep.equal([
          'DeprecationWarning: .setSecondaryOk() is deprecated. Use .setReadPref("primaryPreferred") instead',
          'Leaving read preference unchanged (is already "secondary")',
        ]);
      });
    });
    describe('watch', function () {
      let fakeSpCursor: any;
      beforeEach(function () {
        fakeSpCursor = {
          closed: false,
          tryNext: async () => {},
        };
        serviceProvider.watch.returns(fakeSpCursor);
      });
      it('calls serviceProvider.watch when given no args', async function () {
        await mongo.watch();
        expect(serviceProvider.watch).to.have.been.calledWith([], {});
      });
      it('calls serviceProvider.watch when given pipeline arg', async function () {
        const pipeline = [{ $match: { operationType: 'insertOne' } }];
        await mongo.watch(pipeline);
        expect(serviceProvider.watch).to.have.been.calledWith(pipeline, {});
      });
      it('calls serviceProvider.watch when given pipeline and ops args', async function () {
        const pipeline = [{ $match: { operationType: 'insertOne' } }];
        const ops = { batchSize: 1 };
        await mongo.watch(pipeline, ops);
        expect(serviceProvider.watch).to.have.been.calledWith(pipeline, ops);
      });

      it('returns whatever serviceProvider.watch returns', async function () {
        const result = await mongo.watch();
        expect(result).to.deep.equal(
          new ChangeStreamCursor(
            fakeSpCursor,
            'mongodb://localhost/?directConnection=true&serverSelectionTimeoutMS=2000',
            mongo
          )
        );
        expect(mongo._instanceState.currentCursor).to.equal(result);
      });

      it('throws if serviceProvider.watch throws', async function () {
        const expectedError = new Error();
        serviceProvider.watch.throws(expectedError);
        try {
          await mongo.watch();
        } catch (e: any) {
          expect(e).to.equal(expectedError);
          return;
        }
        expect.fail('Failed to throw');
      });
    });
    describe('getClientEncryption()', function () {
      it('throws an error if no FLE options were provided', function () {
        try {
          mongo.getClientEncryption();
        } catch (e: any) {
          expect(e.name).to.equal('MongoshInvalidInputError');
          return;
        }
        expect.fail('Failed to throw');
      });
    });
    describe('getCollection', function () {
      it('returns a collection for the database', function () {
        const coll = mongo.getCollection('db1.coll');
        expect(coll).to.be.instanceOf(Collection);
        expect(coll._name).to.equal('coll');
        expect(coll._database._name).to.equal('db1');
      });

      it('returns a collection for the database with multiple .', function () {
        const coll = mongo.getCollection('db1.coll.subcoll');
        expect(coll).to.be.instanceOf(Collection);
        expect(coll._name).to.equal('coll.subcoll');
        expect(coll._database._name).to.equal('db1');
      });

      it('throws if name is not a valid collection string', function () {
        expect(() => {
          // @ts-expect-error db is not valid, but that's the point of the test
          mongo.getCollection('db');
        }).to.throw('Collection must be of the format <db>.<collection>');
      });

      it('throws if name is empty', function () {
        expect(() => {
          // @ts-expect-error db is not valid, but that's the point of the test
          mongo.getCollection('');
        }).to.throw('Collection must be of the format <db>.<collection>');
      });

      it('throws if name starts with dot', function () {
        expect(() => {
          mongo.getCollection('.coll');
        }).to.throw('Collection must be of the format <db>.<collection>');
      });
    });
  });

  describe('integration', function () {
    const testServer = startSharedTestServer();
    let serviceProvider;
    let instanceState: ShellInstanceState;
    let uri: string;

    beforeEach(async function () {
      uri = await testServer.connectionString();
      serviceProvider = await NodeDriverServiceProvider.connect(
        uri,
        dummyOptions,
        {},
        new EventEmitter()
      );
      instanceState = new ShellInstanceState(serviceProvider);
    });

    afterEach(async function () {
      await instanceState.close(true);
    });

    describe('versioned API', function () {
      context('pre-4.4', function () {
        skipIfServerVersion(testServer, '> 4.4');

        it('errors if an API version is specified', async function () {
          try {
            const mongo = await instanceState.shellApi.Mongo(uri, undefined, {
              api: { version: '1' },
            });
            await (
              await mongo.getDB('test').getCollection('coll').find()
            ).toArray();
            expect.fail('missed exception');
          } catch (err: any) {
            expect(err.name).to.match(/MongoServer(Selection)?Error/);
          }
        });
      });

      context('post-4.4', function () {
        skipIfServerVersion(testServer, '<= 4.4');

        it('can specify an API version', async function () {
          const mongo = await instanceState.shellApi.Mongo(uri, undefined, {
            api: { version: '1' },
          });
          expect(mongo._connectionInfo.driverOptions).to.deep.equal({
            serverApi: { version: '1' },
          });
          // Does not throw, unlike the 4.4 test case above:
          await (
            await mongo.getDB('test').getCollection('coll').find()
          ).toArray();
        });
      });

      context('post-8.0', function () {
        skipIfServerVersion(testServer, '< 8.0');
        let mongo: Mongo;

        describe('bulkWrite', function () {
          beforeEach(async function () {
            mongo = await instanceState.shellApi.Mongo(uri, undefined, {
              api: { version: '1' },
            });
          });

          it('should allow inserts across collections and databases', async function () {
            expect(
              await mongo.bulkWrite([
                {
                  name: 'insertOne',
                  namespace: 'db.authors',
                  document: { name: 'King' },
                },
                {
                  name: 'deleteOne',
                  namespace: 'db.authors',
                  filter: { name: 'King' },
                },
                {
                  name: 'insertOne',
                  namespace: 'db.moreAuthors',
                  document: { name: 'Queen' },
                },
                {
                  name: 'insertOne',
                  namespace: 'otherDb.authors',
                  document: { name: 'Prince' },
                },
              ])
            ).deep.equals(
              new ClientBulkWriteResult({
                acknowledged: true,
                insertedCount: 3,
                upsertedCount: 0,
                matchedCount: 0,
                modifiedCount: 0,
                deletedCount: 1,
                insertResults: undefined,
                updateResults: undefined,
                deleteResults: undefined,
              })
            );

            expect(
              await mongo.getDB('db').getCollection('authors').count()
            ).equals(0);

            expect(
              await mongo
                .getDB('db')
                .getCollection('moreAuthors')
                .count({ name: 'Queen' })
            ).equals(1);

            expect(
              await mongo
                .getDB('otherDb')
                .getCollection('authors')
                .count({ name: 'Prince' })
            ).equals(1);
          });
        });
      });
    });
  });
});
