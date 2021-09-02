import { expect } from 'chai';
import Mongo from './mongo';
import { ADMIN_DB, ALL_PLATFORMS, ALL_SERVER_VERSIONS, ALL_TOPOLOGIES } from './enums';
import { signatures, toShellResult } from './index';
import { StubbedInstance, stubInterface } from 'ts-sinon';
import {
  bson,
  ReadConcern,
  ReadPreference,
  ServiceProvider,
  WriteConcern
} from '@mongosh/service-provider-core';
import Database from './database';
import { EventEmitter } from 'events';
import ShellInstanceState from './shell-instance-state';
import Collection from './collection';
import Cursor from './cursor';
import ChangeStreamCursor from './change-stream-cursor';
import NoDatabase from './no-db';
import { MongoshDeprecatedError, MongoshInternalError, MongoshUnimplementedError } from '@mongosh/errors';
import { CliServiceProvider } from '../../service-provider-server';
import { startTestServer, skipIfServerVersion } from '../../../testing/integration-testing-hooks';

const sampleOpts = {
  causalConsistency: false,
  readConcern: { level: 'majority' } as ReadConcern,
  writeConcern: { w: 1, j: false, wtimeout: 0 } as WriteConcern,
  readPreference: { mode: 'primary', tagSet: [] } as unknown as ReadPreference
};

describe('Mongo', () => {
  describe('help', () => {
    const apiClass = new Mongo({} as any, '');
    it('calls help function', async() => {
      expect((await toShellResult(apiClass.help())).type).to.equal('Help');
      expect((await toShellResult(apiClass.help)).type).to.equal('Help');
    });
  });
  describe('signatures', () => {
    it('type', () => {
      expect(signatures.Mongo.type).to.equal('Mongo');
    });
    it('attributes', () => {
      expect(signatures.Mongo.attributes.show).to.deep.equal({
        type: 'function',
        returnsPromise: true,
        deprecated: false,
        returnType: { attributes: {}, type: 'unknown' },
        platforms: ALL_PLATFORMS,
        topologies: ALL_TOPOLOGIES,
        apiVersions: [ 1, Infinity ],
        serverVersions: ALL_SERVER_VERSIONS,
        isDirectShellCommand: false,
        shellCommandCompleter: undefined
      });
    });
  });
  describe('Metadata', () => {
    describe('toShellResult', () => {
      const mongo = new Mongo({} as any, 'localhost:37017');
      it('value', async() => {
        expect((await toShellResult(mongo)).printable).to.equal('mongodb://localhost:37017/test?directConnection=true&serverSelectionTimeoutMS=2000');
      });
      it('type', async() => {
        expect((await toShellResult(mongo)).type).to.equal('Mongo');
      });
    });
  });
  describe('commands', () => {
    const driverSession = { driverSession: 1 };
    let mongo: Mongo;
    let serviceProvider: StubbedInstance<ServiceProvider>;
    let database: StubbedInstance<Database>;
    let bus: StubbedInstance<EventEmitter>;
    let instanceState: ShellInstanceState;

    beforeEach(() => {
      bus = stubInterface<EventEmitter>();
      serviceProvider = stubInterface<ServiceProvider>();
      serviceProvider.initialDb = 'test';
      serviceProvider.bsonLibrary = bson;
      serviceProvider.runCommand.resolves({ ok: 1 });
      serviceProvider.startSession.returns({ driverSession: 1 } as any);
      instanceState = new ShellInstanceState(serviceProvider, bus);
      mongo = new Mongo(instanceState, undefined, undefined, undefined, serviceProvider);
      database = stubInterface<Database>();
      instanceState.currentDb = database;
    });
    describe('show', () => {
      ['databases', 'dbs'].forEach((t) => {
        describe(t, () => {
          it('calls serviceProvider.listDatabases on the admin database', async() => {
            const expectedResult = { ok: 1, databases: [] };
            serviceProvider.listDatabases.resolves(expectedResult);
            await mongo.show(t);
            expect(serviceProvider.listDatabases).to.have.been.calledWith(
              ADMIN_DB
            );
          });

          it('returns ShowDatabasesResult CommandResult', async() => {
            const expectedResult = { ok: 1, databases: ['a', 'b'] };
            serviceProvider.listDatabases.resolves(expectedResult);
            const result = await mongo.show(t);
            expect(result.value).to.deep.equal(expectedResult.databases);
            expect(result.type).to.equal('ShowDatabasesResult');
          });

          it('throws if serviceProvider.listCommands rejects', async() => {
            const expectedError = new Error();
            serviceProvider.listDatabases.rejects(expectedError);
            const caughtError = await mongo.show(t)
              .catch(e => e);
            expect(caughtError).to.equal(expectedError);
          });
        });
      });
      ['collections', 'tables'].forEach((t) => {
        describe(t, () => {
          it('calls database.getCollectionNames', async() => {
            const expectedResult = [
              { name: 'a', badge: '' },
              { name: 'b', badge: '' }
            ];
            database._getCollectionNamesWithTypes.resolves(expectedResult);
            await mongo.show(t);
            expect(database._getCollectionNamesWithTypes).to.have.been.calledWith({
              promoteLongs: true,
              readPreference: 'primaryPreferred'
            });
          });

          it('returns ShowCollectionsResult CommandResult', async() => {
            const expectedResult = [
              { name: 'a', badge: '' },
              { name: 'b', badge: '' }
            ];
            database._getCollectionNamesWithTypes.resolves(expectedResult);
            const result = await mongo.show(t);
            expect(result.value).to.deep.equal(expectedResult);
            expect(result.type).to.equal('ShowCollectionsResult');
          });

          it('throws if database.getCollectionNames rejects', async() => {
            const expectedError = new Error();
            database._getCollectionNamesWithTypes.rejects(expectedError);
            const caughtError = await mongo.show(t)
              .catch(e => e);
            expect(caughtError).to.equal(expectedError);
          });
        });
      });
      describe('users', () => {
        it('calls database.getUsers', async() => {
          const expectedResult = { ok: 1, users: [] };
          database.getUsers.resolves(expectedResult);
          await mongo.show('users');
          expect(database.getUsers).to.have.been.calledWith(

          );
        });

        it('returns ShowResult CommandResult', async() => {
          const expectedResult = { ok: 1, users: ['a', 'b'] };
          database.getUsers.resolves(expectedResult);
          const result = await mongo.show('users');
          expect(result.value).to.deep.equal(expectedResult.users);
          expect(result.type).to.equal('ShowResult');
        });

        it('throws if database.getUsers rejects', async() => {
          const expectedError = new Error();
          database.getUsers.rejects(expectedError);
          const caughtError = await mongo.show('users')
            .catch(e => e);
          expect(caughtError).to.equal(expectedError);
        });
      });
      describe('roles', () => {
        it('calls database.getRoles', async() => {
          const expectedResult = { ok: 1, roles: [] };
          database.getRoles.resolves(expectedResult);
          await mongo.show('roles');
          expect(database.getRoles).to.have.been.calledWith(
            { showBuiltinRoles: true }
          );
        });

        it('returns ShowResult CommandResult', async() => {
          const expectedResult = { ok: 1, roles: ['a', 'b'] };
          database.getRoles.resolves(expectedResult);
          const result = await mongo.show('roles');
          expect(result.value).to.deep.equal(expectedResult.roles);
          expect(result.type).to.equal('ShowResult');
        });

        it('throws if database.getRoles rejects', async() => {
          const expectedError = new Error();
          database.getRoles.rejects(expectedError);
          const caughtError = await mongo.show('roles')
            .catch(e => e);
          expect(caughtError).to.equal(expectedError);
        });
      });
      describe('log', () => {
        it('calls database.adminCommand without arg', async() => {
          const expectedResult = { ok: 1, log: [] };
          database.adminCommand.resolves(expectedResult);
          await mongo.show('log');
          expect(database.adminCommand).to.have.been.calledWith(
            { getLog: 'global' }
          );
        });
        it('calls database.adminCommand with arg', async() => {
          const expectedResult = { ok: 1, log: [] };
          database.adminCommand.resolves(expectedResult);
          await mongo.show('log', 'other');
          expect(database.adminCommand).to.have.been.calledWith(
            { getLog: 'other' }
          );
        });

        it('returns ShowResult CommandResult', async() => {
          const expectedResult = { ok: 1, log: ['a', 'b'] };
          database.adminCommand.resolves(expectedResult);
          const result = await mongo.show('log');
          expect(result.value).to.deep.equal(expectedResult.log);
          expect(result.type).to.equal('ShowResult');
        });

        it('throws if database.adminCommand rejects', async() => {
          const expectedError = new Error();
          database.adminCommand.rejects(expectedError);
          const caughtError = await mongo.show('log')
            .catch(e => e);
          expect(caughtError).to.equal(expectedError);
        });
      });
      describe('logs', () => {
        it('calls database.adminCommand', async() => {
          const expectedResult = { ok: 1, names: [] };
          database.adminCommand.resolves(expectedResult);
          await mongo.show('logs');
          expect(database.adminCommand).to.have.been.calledWith(
            { getLog: '*' }
          );
        });

        it('returns ShowResult CommandResult', async() => {
          const expectedResult = { ok: 1, names: ['a', 'b'] };
          database.adminCommand.resolves(expectedResult);
          const result = await mongo.show('logs');
          expect(result.value).to.deep.equal(expectedResult.names);
          expect(result.type).to.equal('ShowResult');
        });

        it('throws if database.adminCommand rejects', async() => {
          const expectedError = new Error();
          database.adminCommand.rejects(expectedError);
          const caughtError = await mongo.show('logs')
            .catch(e => e);
          expect(caughtError).to.equal(expectedError);
        });
      });
      describe('profile', () => {
        it('calls database.count but not find when count < 1', async() => {
          const syscoll = stubInterface<Collection>();
          database.getCollection.returns(syscoll);
          syscoll.countDocuments.resolves(0);
          syscoll.find.rejects(new Error());
          const result = await mongo.show('profile');
          expect(database.getCollection).to.have.been.calledWith('system.profile');
          expect(syscoll.countDocuments).to.have.been.calledWith({});
          expect(result.type).to.equal('ShowProfileResult');
          expect(result.value).to.deep.equal({ count: 0 });
        });
        it('calls database.count and find when count > 0', async() => {
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
          expect(database.getCollection).to.have.been.calledWith('system.profile');
          expect(syscoll.countDocuments).to.have.been.calledWith({});
          expect(cursor.sort).to.have.been.calledWith({ $natural: -1 });
          expect(cursor.limit).to.have.been.calledWith(5);
          expect(cursor.toArray).to.have.been.calledWith();
          expect(result.type).to.equal('ShowProfileResult');
          expect(result.value).to.deep.equal({ count: 1, result: expectedResult });
        });

        it('throws if collection.find throws', async() => {
          const syscoll = stubInterface<Collection>();
          database.getCollection.returns(syscoll);
          syscoll.countDocuments.resolves(1);
          const expectedError = new Error();
          syscoll.find.throws(expectedError);
          const caughtError = await mongo.show('profile')
            .catch(e => e);
          expect(caughtError).to.equal(expectedError);
        });
        it('throws if collection.countDocuments rejects', async() => {
          const syscoll = stubInterface<Collection>();
          database.getCollection.returns(syscoll);
          const expectedError = new Error();
          syscoll.countDocuments.rejects(expectedError);
          const caughtError = await mongo.show('profile')
            .catch(e => e);
          expect(caughtError).to.equal(expectedError);
        });
      });
      describe('invalid command', () => {
        it('throws an error', async() => {
          const caughtError = await mongo.show('aslkdjhekjghdskjhfds')
            .catch(e => e);
          expect(caughtError.name).to.equal('MongoshInvalidInputError');
        });
      });
    });
    describe('getReadPrefMode', () => {
      it('calls serviceProvider.getReadPreference', () => {
        const expectedResult = { mode: 'primary', tagSet: [] } as any;
        serviceProvider.getReadPreference.returns(expectedResult);
        const res = mongo.getReadPrefMode();
        expect(serviceProvider.getReadPreference).to.have.been.calledWith();
        expect(res).to.equal(expectedResult.mode);
      });
    });
    describe('getReadPref', () => {
      it('calls serviceProvider.getReadPreference', () => {
        const expectedResult = { mode: 'primary', tagSet: [] } as any;
        serviceProvider.getReadPreference.returns(expectedResult);
        const res = mongo.getReadPref();
        expect(serviceProvider.getReadPreference).to.have.been.calledWith();
        expect(res).to.equal(expectedResult);
      });
    });
    describe('getReadPrefTagSet', () => {
      it('calls serviceProvider.getReadPreference', () => {
        const expectedResult = { mode: 'primary', tagSet: [] } as any;
        serviceProvider.getReadPreference.returns(expectedResult);
        const res = mongo.getReadPrefTagSet();
        expect(serviceProvider.getReadPreference).to.have.been.calledWith();
        expect(res).to.equal(expectedResult.tags);
      });
    });
    describe('getReadConcern', () => {
      it('calls serviceProvider.getReadConcern', () => {
        const expectedResult = { level: 'majority' };
        serviceProvider.getReadConcern.returns(expectedResult as any);
        const res = mongo.getReadConcern();
        expect(serviceProvider.getReadConcern).to.have.been.calledWith();
        expect(res).to.equal('majority');
      });

      it('returns undefined if not set', () => {
        serviceProvider.getReadConcern.returns(undefined);
        const res = mongo.getReadConcern();
        expect(serviceProvider.getReadConcern).to.have.been.calledWith();
        expect(res).to.equal(undefined);
      });

      it('throws InternalError if getReadConcern errors', () => {
        const expectedError = new Error();
        serviceProvider.getReadConcern.throws(expectedError);
        try {
          mongo.getReadConcern();
        } catch (caughtError) {
          return expect(caughtError).to.be.instanceOf(MongoshInternalError);
        }
        expect.fail();
      });
    });
    describe('getWriteConcern', () => {
      it('calls serviceProvider.getWriteConcern', () => {
        const expectedResult: WriteConcern = { w: 'majority', wtimeout: 200 };
        serviceProvider.getWriteConcern.returns(expectedResult as any);
        const res = mongo.getWriteConcern();
        expect(serviceProvider.getWriteConcern).to.have.been.calledWith();
        expect(res).to.equal(expectedResult);
      });

      it('returns undefined if not set', () => {
        serviceProvider.getWriteConcern.returns(undefined);
        const res = mongo.getWriteConcern();
        expect(serviceProvider.getWriteConcern).to.have.been.calledWith();
        expect(res).to.equal(undefined);
      });

      it('throws InternalError if getWriteConcern errors', () => {
        const expectedError = new Error();
        serviceProvider.getWriteConcern.throws(expectedError);
        try {
          mongo.getWriteConcern();
        } catch (caughtError) {
          return expect(caughtError).to.be.instanceOf(MongoshInternalError);
        }
        expect.fail();
      });
    });
    describe('setReadPref', () => {
      it('calls serviceProvider.restConnectionOptions', async() => {
        serviceProvider.resetConnectionOptions.resolves();
        serviceProvider.readPreferenceFromOptions.callsFake(input => input as any);
        await mongo.setReadPref('primaryPreferred', []);
        expect(serviceProvider.resetConnectionOptions).to.have.been.calledWith({
          readPreference: {
            readPreference: 'primaryPreferred',
            readPreferenceTags: [],
            hedge: undefined
          }
        });
      });

      it('throws if resetConnectionOptions errors', async() => {
        const expectedError = new Error();
        serviceProvider.resetConnectionOptions.throws(expectedError);
        try {
          await mongo.setReadPref('primary');
        } catch (caughtError) {
          return expect(caughtError).to.equal(expectedError);
        }
        expect.fail();
      });
    });
    describe('setReadConcern', () => {
      it('calls serviceProvider.resetConnectionOptions', async() => {
        serviceProvider.resetConnectionOptions.resolves();
        await mongo.setReadConcern('majority');
        expect(serviceProvider.resetConnectionOptions).to.have.been.calledWith({
          readConcern: {
            level: 'majority'
          }
        });
      });

      it('throws if resetConnectionOptions errors', async() => {
        const expectedError = new Error();
        serviceProvider.resetConnectionOptions.throws(expectedError);
        try {
          await mongo.setReadConcern('majority');
        } catch (caughtError) {
          return expect(caughtError).to.equal(expectedError);
        }
        expect.fail();
      });
    });
    describe('setWriteConcern', () => {
      [
        { args: ['majority'], opts: { w: 'majority' } },
        { args: ['majority', 200], opts: { w: 'majority', wtimeoutMS: 200 } },
        { args: ['majority', 200, false], opts: { w: 'majority', wtimeoutMS: 200, journal: false } },
        { args: ['majority', undefined, false], opts: { w: 'majority', journal: false } },
        { args: [{ w: 'majority', wtimeout: 200, fsync: 1 }], opts: { w: 'majority', wtimeoutMS: 200, journal: true } }
      ].forEach(({ args, opts }) => {
        it(`calls serviceProvider.resetConnectionOptions for args ${JSON.stringify(args)}`, async() => {
          serviceProvider.resetConnectionOptions.resolves();
          await mongo.setWriteConcern.call(mongo, ...args); // tricking TS into thinking the arguments are correct
          expect(serviceProvider.resetConnectionOptions).to.have.been.calledWith(opts);
        });
      });

      it('throws if resetConnectionOptions errors', async() => {
        const expectedError = new Error();
        serviceProvider.resetConnectionOptions.throws(expectedError);
        try {
          await mongo.setWriteConcern('majority');
        } catch (caughtError) {
          return expect(caughtError).to.equal(expectedError);
        }
        expect.fail();
      });
    });
    describe('startSession', () => {
      beforeEach(() => {
        serviceProvider.startSession.returns(driverSession as any);
      });
      it('calls serviceProvider.startSession', () => {
        const opts = { causalConsistency: false };
        const s = mongo.startSession(opts);
        const driverOpts = { ...opts };
        expect(serviceProvider.startSession).to.have.been.calledWith(driverOpts);
        expect(s._session).to.deep.equal(driverSession);
        expect(s._options).to.deep.equal(driverOpts);
      });

      it('throws if startSession errors', () => {
        const expectedError = new Error();
        serviceProvider.startSession.throws(expectedError);
        try {
          mongo.startSession();
        } catch (caughtError) {
          return expect(caughtError).to.equal(expectedError);
        }
        expect.fail();
      });

      it('calls startSession without args', () => {
        const result = mongo.startSession();
        expect(serviceProvider.startSession).to.have.been.calledOnceWith({});
        expect(result._session).to.equal(driverSession);
      });
      it('can set default transaction options readconcern', () => {
        const result = mongo.startSession({
          readConcern: sampleOpts.readConcern
        });
        expect(serviceProvider.startSession).to.have.been.calledOnceWith({
          defaultTransactionOptions: {
            readConcern: sampleOpts.readConcern
          }
        });
        expect(result._session).to.equal(driverSession);
      });
      it('can set default transaction options writeConcern', () => {
        const result = mongo.startSession({
          writeConcern: sampleOpts.writeConcern
        });
        expect(serviceProvider.startSession).to.have.been.calledOnceWith({
          defaultTransactionOptions: {
            writeConcern: sampleOpts.writeConcern
          }
        });
        expect(result._session).to.equal(driverSession);
      });
      it('can set default transaction options readPreference', () => {
        const result = mongo.startSession({
          readPreference: sampleOpts.readPreference as any
        });
        expect(serviceProvider.startSession).to.have.been.calledOnceWith({
          defaultTransactionOptions: {
            readPreference: sampleOpts.readPreference
          }
        });
        expect(result._session).to.equal(driverSession);
      });
      it('can set causalConsistency', () => {
        const result = mongo.startSession({
          causalConsistency: false
        });
        expect(serviceProvider.startSession).to.have.been.calledOnceWith({
          causalConsistency: false
        });
        expect(result._session).to.equal(driverSession);
      });
      it('sets everything', () => {
        const result = mongo.startSession(sampleOpts as any);
        expect(serviceProvider.startSession).to.have.been.calledOnceWith({
          causalConsistency: sampleOpts.causalConsistency,
          defaultTransactionOptions: {
            readPreference: sampleOpts.readPreference,
            readConcern: sampleOpts.readConcern,
            writeConcern: sampleOpts.writeConcern
          }
        });
        expect(result._session).to.equal(driverSession);
      });
    });
    describe('setCausalConsistency', () => {
      it('throws because it is unsupported by the driver', () => {
        try {
          mongo.setCausalConsistency();
          expect.fail('expected error');
        } catch (e) {
          expect(e).to.be.instanceOf(MongoshUnimplementedError);
          expect(e.metadata?.driverCaused).to.equal(true);
          expect(e.metadata?.api).to.equal('Mongo.setCausalConsistency');
        }
      });
    });
    describe('isCausalConsistency', () => {
      it('throws because it is unsupported by the driver', () => {
        try {
          mongo.isCausalConsistency();
          expect.fail('expected error');
        } catch (e) {
          expect(e).to.be.instanceOf(MongoshUnimplementedError);
          expect(e.metadata?.driverCaused).to.equal(true);
          expect(e.metadata?.api).to.equal('Mongo.isCausalConsistency');
        }
      });
    });
    describe('use', () => {
      it('sets the current db', () => {
        const msg = mongo.use('moo');
        expect(msg).to.equal('switched to db moo');
        expect(instanceState.context.db.getName()).to.equal('moo');
      });
      it('reports if no db switch has taken place', () => {
        mongo.use('moo1');
        const msg = mongo.use('moo1');
        expect(msg).to.equal('already on db moo1');
        expect(instanceState.context.db.getName()).to.equal('moo1');
      });
      it('reports if db has the same name but different Mongo objects', () => {
        instanceState.context.db = new Mongo(instanceState, undefined, undefined, undefined, serviceProvider).getDB('moo1');
        expect(instanceState.context.db.getName()).to.equal('moo1');
        const msg = mongo.use('moo1');
        expect(msg).to.equal('switched to db moo1');
        expect(instanceState.context.db.getName()).to.equal('moo1');
      });
      it('works if previously there was no db', () => {
        instanceState.context.db = new NoDatabase();
        const msg = mongo.use('moo1');
        expect(msg).to.equal('switched to db moo1');
        expect(instanceState.context.db.getName()).to.equal('moo1');
      });
    });
    describe('deprecated mongo methods', () => {
      ['setSlaveOk', 'setSecondaryOk'].forEach((t) => {
        it(t, () => {
          try {
            mongo[t]();
          } catch (e) {
            return expect(e).to.be.instanceOf(MongoshDeprecatedError);
          }
          expect.fail();
        });
      });
    });
    describe('watch', () => {
      let fakeSpCursor: any;
      beforeEach(() => {
        fakeSpCursor = {
          closed: false,
          tryNext: async() => {}
        };
        serviceProvider.watch.returns(fakeSpCursor);
      });
      it('calls serviceProvider.watch when given no args', async() => {
        await mongo.watch();
        expect(serviceProvider.watch).to.have.been.calledWith([], {});
      });
      it('calls serviceProvider.watch when given pipeline arg', async() => {
        const pipeline = [{ $match: { operationType: 'insertOne' } }];
        await mongo.watch(pipeline);
        expect(serviceProvider.watch).to.have.been.calledWith(pipeline, {});
      });
      it('calls serviceProvider.watch when given no args', async() => {
        const pipeline = [{ $match: { operationType: 'insertOne' } }];
        const ops = { batchSize: 1 };
        await mongo.watch(pipeline, ops);
        expect(serviceProvider.watch).to.have.been.calledWith(pipeline, ops);
      });

      it('returns whatever serviceProvider.watch returns', async() => {
        const result = await mongo.watch();
        expect(result).to.deep.equal(new ChangeStreamCursor(fakeSpCursor, 'mongodb://localhost/?directConnection=true&serverSelectionTimeoutMS=2000', mongo));
        expect(mongo._instanceState.currentCursor).to.equal(result);
      });

      it('throws if serviceProvider.watch throws', async() => {
        const expectedError = new Error();
        serviceProvider.watch.throws(expectedError);
        try {
          await mongo.watch();
        } catch (e) {
          expect(e).to.equal(expectedError);
          return;
        }
        expect.fail('Failed to throw');
      });
    });
    describe('getClientEncryption()', () => {
      it('throws an error if no FLE options were provided', () => {
        try {
          mongo.getClientEncryption();
        } catch (e) {
          expect(e.name).to.equal('MongoshInvalidInputError');
          return;
        }
        expect.fail('Failed to throw');
      });
    });
    describe('getCollection', () => {
      it('returns a collection for the database', () => {
        const coll = mongo.getCollection('db1.coll');
        expect(coll).to.be.instanceOf(Collection);
        expect(coll._name).to.equal('coll');
        expect(coll._database._name).to.equal('db1');
      });

      it('returns a collection for the database with multiple .', () => {
        const coll = mongo.getCollection('db1.coll.subcoll');
        expect(coll).to.be.instanceOf(Collection);
        expect(coll._name).to.equal('coll.subcoll');
        expect(coll._database._name).to.equal('db1');
      });

      it('throws if name is not a valid connection string', () => {
        expect(() => {
          mongo.getCollection('db');
        }).to.throw('Collection must be of the format <db>.<collection>');
      });

      it('throws if name is empty', () => {
        expect(() => {
          mongo.getCollection('');
        }).to.throw('Collection must be of the format <db>.<collection>');
      });

      it('throws if name starts with dot', () => {
        expect(() => {
          mongo.getCollection('.coll');
        }).to.throw('Collection must be of the format <db>.<collection>');
      });
    });
  });

  describe('integration', () => {
    const testServer = startTestServer('shared');
    let serviceProvider;
    let instanceState: ShellInstanceState;
    let uri: string;

    beforeEach(async() => {
      uri = await testServer.connectionString();
      serviceProvider = await CliServiceProvider.connect(uri, {}, {}, new EventEmitter());
      instanceState = new ShellInstanceState(serviceProvider);
    });

    afterEach(async() => {
      await instanceState.close(true);
    });

    describe('versioned API', () => {
      context('pre-4.4', () => {
        skipIfServerVersion(testServer, '> 4.4');

        it('errors if an API version is specified', async() => {
          try {
            // eslint-disable-next-line new-cap
            const mongo = await instanceState.shellApi.Mongo(uri, null, {
              api: { version: '1' }
            });
            await (await mongo.getDB('test').getCollection('coll').find()).toArray();
            expect.fail('missed exception');
          } catch (err) {
            expect(err.name).to.match(/MongoServer(Selection)?Error/);
          }
        });
      });

      context('post-4.4', () => {
        skipIfServerVersion(testServer, '<= 4.4');

        it('can specify an API version', async() => {
          // eslint-disable-next-line new-cap
          const mongo = await instanceState.shellApi.Mongo(uri, null, {
            api: { version: '1' }
          });
          expect(mongo._apiOptions).to.deep.equal({ version: '1' });
          // Does not throw, unlike the 4.4 test case above:
          await (await mongo.getDB('test').getCollection('coll').find()).toArray();
        });
      });
    });
  });
});
