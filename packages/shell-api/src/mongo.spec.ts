import { expect } from 'chai';
import Mongo from './mongo';
import { ADMIN_DB, ALL_PLATFORMS, ALL_SERVER_VERSIONS, ALL_TOPOLOGIES, asShellResult } from './enums';
import { signatures } from './decorators';
import { StubbedInstance, stubInterface } from 'ts-sinon';
import { bson, ServiceProvider } from '@mongosh/service-provider-core';
import Database from './database';
import { EventEmitter } from 'events';
import ShellInternalState from './shell-internal-state';
import Collection from './collection';
import Cursor from './cursor';

describe('Mongo', () => {
  describe('help', () => {
    const apiClass: any = new Mongo({} as any, '');
    it('calls help function', async() => {
      expect((await apiClass.help()[asShellResult]()).type).to.equal('Help');
      expect((await apiClass.help[asShellResult]()).type).to.equal('Help');
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
        returnType: { attributes: {}, type: 'unknown' },
        platforms: ALL_PLATFORMS,
        topologies: ALL_TOPOLOGIES,
        serverVersions: ALL_SERVER_VERSIONS
      });
    });
    it('hasAsyncChild', () => {
      expect(signatures.Mongo.hasAsyncChild).to.equal(true);
    });
  });
  describe('Metadata', () => {
    describe('asShellResult', () => {
      const mongo = new Mongo({} as any, 'localhost:37017');
      it('value', async() => {
        expect((await mongo[asShellResult]()).value).to.equal('mongodb://localhost:37017/test');
      });
      it('type', async() => {
        expect((await mongo[asShellResult]()).type).to.equal('Mongo');
      });
    });
  });
  describe('commands', () => {
    let mongo: Mongo;
    let serviceProvider: StubbedInstance<ServiceProvider>;
    let database: StubbedInstance<Database>;
    let bus: StubbedInstance<EventEmitter>;
    let internalState: ShellInternalState;

    beforeEach(() => {
      bus = stubInterface<EventEmitter>();
      serviceProvider = stubInterface<ServiceProvider>();
      serviceProvider.initialDb = 'test';
      serviceProvider.bsonLibrary = bson;
      serviceProvider.runCommand.resolves({ ok: 1 });
      internalState = new ShellInternalState(serviceProvider, bus);
      mongo = new Mongo(internalState);
      database = stubInterface<Database>();
      internalState.currentDb = database;
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
            const catchedError = await mongo.show(t)
              .catch(e => e);
            expect(catchedError).to.equal(expectedError);
          });
        });
      });
      ['collections', 'tables'].forEach((t) => {
        describe(t, () => {
          it('calls database.getCollectionNames', async() => {
            const expectedResult = ['a', 'b'];
            database.getCollectionNames.resolves(expectedResult);
            await mongo.show(t);
            expect(database.getCollectionNames).to.have.been.calledWith();
          });

          it('returns ShowCollectionsResult CommandResult', async() => {
            const expectedResult = ['a', 'b'];
            database.getCollectionNames.resolves(expectedResult);
            const result = await mongo.show(t);
            expect(result.value).to.deep.equal(expectedResult);
            expect(result.type).to.equal('ShowCollectionsResult');
          });

          it('throws if database.getCollectionNames rejects', async() => {
            const expectedError = new Error();
            database.getCollectionNames.rejects(expectedError);
            const catchedError = await mongo.show(t)
              .catch(e => e);
            expect(catchedError).to.equal(expectedError);
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
            const catchedError = await mongo.show('users')
              .catch(e => e);
            expect(catchedError).to.equal(expectedError);
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
            const catchedError = await mongo.show('roles')
              .catch(e => e);
            expect(catchedError).to.equal(expectedError);
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
            const catchedError = await mongo.show('log')
              .catch(e => e);
            expect(catchedError).to.equal(expectedError);
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
            const catchedError = await mongo.show('logs')
              .catch(e => e);
            expect(catchedError).to.equal(expectedError);
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
            syscoll.find.returns(cursor);
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
            const catchedError = await mongo.show('profile')
              .catch(e => e);
            expect(catchedError).to.equal(expectedError);
          });
          it('throws if collection.countDocuments rejects', async() => {
            const syscoll = stubInterface<Collection>();
            database.getCollection.returns(syscoll);
            const expectedError = new Error();
            syscoll.countDocuments.rejects(expectedError);
            const catchedError = await mongo.show('profile')
              .catch(e => e);
            expect(catchedError).to.equal(expectedError);
          });
        });
      });
    });
    describe('getReadPrefMode', () => {
      it('throws unimplemented error for now', () => {
        try {
          mongo.getReadPrefMode();
        } catch (e) {
          return expect(e.name).to.equal('MongoshUnimplementedError');
        }
        expect.fail();
      });
    });
    describe('getReadPref', () => {
      it('throws unimplemented error for now', () => {
        try {
          mongo.getReadPref();
        } catch (e) {
          return expect(e.name).to.equal('MongoshUnimplementedError');
        }
        expect.fail();
      });
    });
    describe('getReadPrefTagSet', () => {
      it('throws unimplemented error for now', () => {
        try {
          mongo.getReadPrefTagSet();
        } catch (e) {
          return expect(e.name).to.equal('MongoshUnimplementedError');
        }
        expect.fail();
      });
    });
    describe('getReadConcern', () => {
      it('calls serviceProvider.getReadConcern', async() => {
        const expectedResult = { level: 'majority' };
        serviceProvider.getReadConcern.returns(expectedResult);
        const res = await mongo.getReadConcern();
        expect(serviceProvider.getReadConcern).to.have.been.calledWith();
        expect(res).to.equal('majority');
      });

      it('returns undefined if not set', async() => {
        serviceProvider.getReadConcern.returns(undefined);
        const res = await mongo.getReadConcern();
        expect(serviceProvider.getReadConcern).to.have.been.calledWith();
        expect(res).to.equal(undefined);
      });

      it('throws InternalError if getReadConcern errors', async() => {
        const expectedError = new Error();
        serviceProvider.getReadConcern.throws(expectedError);
        try {
          mongo.getReadConcern();
        } catch (catchedError) {
          return expect(catchedError.name).to.equal('MongoshInternalError');
        }
        expect.fail();
      });
    });
    describe('setReadPref', () => {
      it('calls serviceProvider.restConnectionOptions', async() => {
        serviceProvider.resetConnectionOptions.resolves();
        await mongo.setReadPref('primaryPreferred', []);
        expect(serviceProvider.resetConnectionOptions).to.have.been.calledWith({
          readPreference: {
            mode: 'primaryPreferred',
            tagSet: [],
            hedgeOptions: undefined
          }
        });
      });

      it('throws if resetConnectionOptions errors', async() => {
        const expectedError = new Error();
        serviceProvider.resetConnectionOptions.throws(expectedError);
        try {
          await mongo.setReadPref('primary');
        } catch (catchedError) {
          return expect(catchedError).to.equal(expectedError);
        }
        expect.fail();
      });
    });
    describe('setReadConcern', () => {
      it('calls serviceProvider.restConnectionOptions', async() => {
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
        } catch (catchedError) {
          return expect(catchedError).to.equal(expectedError);
        }
        expect.fail();
      });
    });
  });
});
