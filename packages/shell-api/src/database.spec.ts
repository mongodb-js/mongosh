import * as chai from 'chai';
import { expect } from 'chai';
import sinonChai from 'sinon-chai';
import sinon from 'sinon';
import type { StubbedInstance } from 'ts-sinon';
import { stubInterface } from 'ts-sinon';
import type { EventEmitter } from 'events';
import { ALL_PLATFORMS, ALL_SERVER_VERSIONS, ALL_TOPOLOGIES } from './enums';
import { signatures, toShellResult } from './index';
import { Database } from './database';
import { Collection } from './collection';
import Mongo from './mongo';
import type {
  AggregationCursor as ServiceProviderAggCursor,
  FindCursor as ServiceProviderCursor,
  RunCommandCursor as ServiceProviderRunCommandCursor,
  ServiceProvider,
  ClientSession as ServiceProviderSession,
  Document,
  ClientEncryptionDataKeyProvider,
} from '@mongosh/service-provider-core';
import * as bson from 'bson';
import ShellInstanceState from './shell-instance-state';
import crypto from 'crypto';
import { ADMIN_DB } from './enums';
import ChangeStreamCursor from './change-stream-cursor';
import {
  CommonErrors,
  MongoshDeprecatedError,
  MongoshInvalidInputError,
  MongoshRuntimeError,
  MongoshUnimplementedError,
} from '@mongosh/errors';
import type { ClientEncryption } from './field-level-encryption';
import type { MongoServerError } from 'mongodb';

chai.use(sinonChai);

describe('Database', function () {
  const MD5_HASH = crypto
    .createHash('md5')
    .update('anna:mongo:pwd')
    .digest('hex');
  describe('help', function () {
    const apiClass: any = new Database({} as any, 'name');
    it('calls help function', async function () {
      expect((await toShellResult(apiClass.help())).type).to.equal('Help');
      expect((await toShellResult(apiClass.help)).type).to.equal('Help');
    });
    it('calls help function for methods', async function () {
      expect((await toShellResult(apiClass.runCommand.help())).type).to.equal(
        'Help'
      );
      expect((await toShellResult(apiClass.runCommand.help)).type).to.equal(
        'Help'
      );
    });
  });
  describe('collections', function () {
    it('allows to get a collection as property if is not one of the existing methods', function () {
      const database: any = new Database({} as any, 'db1');
      expect(database.someCollection).to.have.instanceOf(Collection);
      expect(database.someCollection._name).to.equal('someCollection');
    });

    it('reuses collections', function () {
      const database: any = new Database({} as any, 'db1');
      expect(database.someCollection).to.equal(database.someCollection);
    });

    it('does not return a collection starting with _', function () {
      // this is the behaviour in the old shell

      const database: any = new Database({} as any, 'db1');
      expect(database._someProperty).to.equal(undefined);
    });

    it('does not return a collection for symbols', function () {
      const database: any = new Database({} as any, 'db1');
      expect(database[Symbol('someProperty')]).to.equal(undefined);
    });

    it('does not return a collection with invalid name', function () {
      const database: any = new Database({} as any, 'db1');
      expect(database.foo$bar).to.equal(undefined);
    });

    it('allows to access _name', function () {
      const database: any = new Database({} as any, 'db1');
      expect(database._name).to.equal('db1');
    });

    it('allows to access collections', function () {
      const database: any = new Database({} as any, 'db1');
      expect(database._collections).to.deep.equal({});
    });
  });
  describe('signatures', function () {
    it('type', function () {
      expect(signatures.Database.type).to.equal('Database');
    });
    it('attributes', function () {
      expect(signatures.Database.attributes?.aggregate).to.deep.equal({
        type: 'function',
        returnsPromise: true,
        deprecated: false,
        returnType: 'AggregationCursor',
        platforms: ALL_PLATFORMS,
        topologies: ALL_TOPOLOGIES,
        apiVersions: [1, Infinity],
        serverVersions: ALL_SERVER_VERSIONS,
        isDirectShellCommand: false,
        acceptsRawInput: false,
        shellCommandCompleter: undefined,
        newShellCommandCompleter: undefined,
      });
    });
  });
  describe('Metadata', function () {
    describe('toShellResult', function () {
      const mongo = sinon.spy();
      const db = new Database(mongo as any, 'myDB');
      it('value', async function () {
        expect((await toShellResult(db)).printable).to.equal('myDB');
      });
      it('type', async function () {
        expect((await toShellResult(db)).type).to.equal('Database');
      });
    });
  });
  describe('attributes', function () {
    const mongo = sinon.spy();
    const db = new Database(mongo as any, 'myDB') as any;
    it('creates new collection for attribute', async function () {
      expect((await toShellResult(db.coll)).type).to.equal('Collection');
    });
  });
  describe('commands', function () {
    let mongo: Mongo;
    let serviceProvider: StubbedInstance<ServiceProvider>;
    let database: Database;
    let bus: StubbedInstance<EventEmitter>;
    let instanceState: ShellInstanceState;

    beforeEach(function () {
      bus = stubInterface<EventEmitter>();
      serviceProvider = stubInterface<ServiceProvider>();
      serviceProvider.initialDb = 'test';
      serviceProvider.bsonLibrary = bson;
      serviceProvider.runCommand.resolves({ ok: 1 });
      serviceProvider.runCommandWithCheck.resolves({ ok: 1 });
      instanceState = new ShellInstanceState(serviceProvider, bus);
      mongo = new Mongo(
        instanceState,
        undefined,
        undefined,
        undefined,
        serviceProvider
      );
      database = new Database(mongo, 'db1');
    });
    describe('getCollectionInfos', function () {
      it('returns the result of serviceProvider.listCollections', async function () {
        const filter = { name: 'abc' };
        const options = { nameOnly: true };
        const result = [{ name: 'coll1' }];

        serviceProvider.listCollections.resolves(result);

        expect(
          await database.getCollectionInfos(filter, options)
        ).to.deep.equal(result);

        expect(serviceProvider.listCollections).to.have.been.calledOnceWith(
          'db1',
          filter,
          options
        );
      });
    });

    describe('getCollectionNames', function () {
      it('returns the result of serviceProvider.listCollections', async function () {
        const result = [{ name: 'coll1', type: 'collection' }];

        serviceProvider.listCollections.resolves(result);

        expect(await database.getCollectionNames()).to.deep.equal(['coll1']);

        expect(serviceProvider.listCollections).to.have.been.calledOnceWith(
          'db1',
          {},
          { nameOnly: true }
        );
      });
    });

    describe('_getCollectionNamesWithTypes', function () {
      it('returns sorted list of collections with their types', async function () {
        const result = [
          { name: 'coll3', type: 'view' },
          { name: 'coll1', type: 'collection' },
          { name: 'coll2', type: 'newtype' },
          { name: 'coll4', type: 'collection' },
          { name: 'enxcol_.coll4.esc', type: 'collection' },
          { name: 'enxcol_.coll4.ecc', type: 'collection' },
          { name: 'enxcol_.coll4.ecoc', type: 'collection' },
          { name: 'enxcol_.coll5.esc', type: 'collection' },
          { name: 'coll6', type: 'timeseries' },
        ];

        serviceProvider.listCollections.resolves(result);

        expect(await database._getCollectionNamesWithTypes()).to.deep.equal([
          { name: 'coll1', badge: '' },
          { name: 'coll2', badge: '' },
          { name: 'coll3', badge: '[view]' },
          { name: 'coll4', badge: '[queryable-encryption]' },
          { name: 'coll6', badge: '[time-series]' },
          { name: 'enxcol_.coll4.ecc', badge: '' },
          { name: 'enxcol_.coll4.ecoc', badge: '' },
          { name: 'enxcol_.coll4.esc', badge: '' },
          { name: 'enxcol_.coll5.esc', badge: '' },
        ]);

        expect(serviceProvider.listCollections).to.have.been.calledOnceWith(
          'db1',
          {},
          { nameOnly: true }
        );
      });
    });

    describe('getName', function () {
      it('returns the name of the DB', function () {
        expect(database.getName()).to.equal('db1');
      });
    });

    describe('getMongo', function () {
      it('returns the name of the DB', function () {
        expect(database.getMongo()).to.equal(mongo);
      });
    });

    describe('runCommand', function () {
      it('calls serviceProvider.runCommand on the database', async function () {
        await database.runCommand({ someCommand: 'someCollection' });

        expect(serviceProvider.runCommandWithCheck).to.have.been.calledWith(
          database._name,
          {
            someCommand: 'someCollection',
          }
        );
      });

      it('transforms a string argument into the command document', async function () {
        await database.runCommand('isMaster');

        expect(serviceProvider.runCommandWithCheck).to.have.been.calledWith(
          database._name,
          {
            isMaster: 1,
          }
        );
      });

      it('returns whatever serviceProvider.runCommand returns', async function () {
        const expectedResult = { ok: 1 };
        serviceProvider.runCommandWithCheck.resolves(expectedResult);
        const result = await database.runCommand({
          someCommand: 'someCollection',
        });
        expect(result).to.deep.equal(expectedResult);
      });

      it('throws if serviceProvider.runCommand rejects', async function () {
        const expectedError = new Error();
        serviceProvider.runCommandWithCheck.rejects(expectedError);
        const caughtError = await database
          .runCommand({ someCommand: 'someCollection' })
          .catch((e) => e);
        expect(caughtError).to.equal(expectedError);
      });

      it('automatically adjusts replSetResizeOplog parameter types', async function () {
        await database.runCommand({
          replSetResizeOplog: 1,
          size: 990,
          minRetentionHours: 3,
        });

        expect(serviceProvider.runCommandWithCheck).to.have.been.calledWith(
          database._name,
          {
            replSetResizeOplog: 1,
            minRetentionHours: new bson.Double(3),
            size: new bson.Double(990),
          }
        );
      });

      it('automatically adjusts profile parameter types', async function () {
        await database.runCommand({ profile: 0, sampleRate: 0 });

        expect(serviceProvider.runCommandWithCheck).to.have.been.calledWith(
          database._name,
          {
            profile: 0,
            sampleRate: new bson.Double(0),
          }
        );
      });

      it('automatically adjusts mirrorReads.samplingRate types', async function () {
        await database.runCommand({
          setParameter: 1,
          mirrorReads: { samplingRate: 0 },
        });

        expect(serviceProvider.runCommandWithCheck).to.have.been.calledWith(
          database._name,
          {
            setParameter: 1,
            mirrorReads: { samplingRate: new bson.Double(0) },
          }
        );
      });

      it('rephrases the "NotPrimaryNoSecondaryOk" error', async function () {
        const originalError: Partial<MongoServerError> = {
          message: 'old message',
          codeName: 'NotPrimaryNoSecondaryOk',
          code: 13435,
        };
        serviceProvider.runCommandWithCheck.rejects(originalError);
        const caughtError = await database
          .runCommand({ someCommand: 'someCollection' })
          .catch((e) => e);
        expect(caughtError.message).to.contain(
          'e.g. db.runCommand({ command }, { readPreference: "secondaryPreferred" })'
        );
      });
    });

    describe('adminCommand', function () {
      it('calls serviceProvider.runCommand with the admin database', async function () {
        await database.adminCommand({ someCommand: 'someCollection' });

        expect(serviceProvider.runCommandWithCheck).to.have.been.calledWith(
          'admin',
          {
            someCommand: 'someCollection',
          }
        );
      });

      it('transforms a string argument into the command document', async function () {
        await database.adminCommand('command');

        expect(serviceProvider.runCommandWithCheck).to.have.been.calledWith(
          'admin',
          {
            command: 1,
          }
        );
      });

      it('returns whatever serviceProvider.runCommand returns', async function () {
        const expectedResult = { ok: 1 };
        serviceProvider.runCommandWithCheck.resolves(expectedResult);
        const result = await database.adminCommand({
          someCommand: 'someCollection',
        });
        expect(result).to.deep.equal(expectedResult);
      });
      it('throws if serviceProvider.runCommand rejects', async function () {
        const expectedError = new Error();
        serviceProvider.runCommandWithCheck.rejects(expectedError);
        const caughtError = await database
          .adminCommand({ someCommand: 'someCollection' })
          .catch((e) => e);
        expect(caughtError).to.equal(expectedError);
      });
    });

    describe('aggregate', function () {
      let serviceProviderCursor: StubbedInstance<ServiceProviderAggCursor>;

      beforeEach(function () {
        serviceProviderCursor = stubInterface<ServiceProviderAggCursor>();
      });

      it('calls serviceProvider.aggregateDb with pipleline and options', async function () {
        await database.aggregate([{ $piplelineStage: {} }], { options: true });

        expect(serviceProvider.aggregateDb).to.have.been.calledWith(
          database._name,
          [{ $piplelineStage: {} }],
          { options: true }
        );
      });

      it('supports a single aggregation stage', async function () {
        await database.aggregate({ $piplelineStage: {} });

        expect(serviceProvider.aggregateDb).to.have.been.calledWith(
          database._name,
          [{ $piplelineStage: {} }],
          {}
        );
      });

      it('supports passing args as aggregation stages', async function () {
        await database.aggregate(
          { $piplelineStage: {} },
          { $piplelineStage2: {} }
        );

        expect(serviceProvider.aggregateDb).to.have.been.calledWith(
          database._name,
          [{ $piplelineStage: {} }, { $piplelineStage2: {} }],
          {}
        );
      });

      it('calls serviceProvider.aggregateDb with explicit batchSize', async function () {
        await database.aggregate([{ $piplelineStage: {} }], {
          options: true,
          batchSize: 10,
        });

        expect(serviceProvider.aggregateDb).to.have.been.calledWith(
          database._name,
          [{ $piplelineStage: {} }],
          { options: true, batchSize: 10 }
        );
      });

      it('returns an AggregationCursor that wraps the service provider one', async function () {
        const toArrayResult = [{ foo: 'bar' }];
        serviceProviderCursor.toArray.resolves(toArrayResult);
        serviceProvider.aggregateDb.returns(serviceProviderCursor);

        const cursor = await database.aggregate([{ $piplelineStage: {} }]);
        expect(await cursor.toArray()).to.deep.equal(toArrayResult);
      });

      it('throws if serviceProvider.aggregateDb rejects', async function () {
        const expectedError = new Error();
        serviceProvider.aggregateDb.throws(expectedError);

        expect(
          await database.aggregate([{ $piplelineStage: {} }]).catch((e) => e)
        ).to.equal(expectedError);
      });

      it('pass readConcern and writeConcern as dbOption', async function () {
        await database.aggregate([], {
          otherOption: true,
          readConcern: { level: 'majority' },
          writeConcern: { w: 1 },
        });

        expect(serviceProvider.aggregateDb).to.have.been.calledWith(
          database._name,
          [],
          { otherOption: true },
          { readConcern: { level: 'majority' }, w: 1 }
        );
      });

      it('runs explain if explain true is passed', async function () {
        const expectedExplainResult = {};
        serviceProviderCursor.explain.resolves(expectedExplainResult);
        serviceProvider.aggregateDb.returns(serviceProviderCursor as any);

        const explainResult = await database.aggregate([], { explain: true });

        expect(explainResult).to.deep.equal(expectedExplainResult);
        expect(serviceProviderCursor.explain).to.have.been.calledOnce;
      });

      it('wont run explain if explain is not passed', async function () {
        serviceProvider.aggregateDb.returns(serviceProviderCursor as any);

        const cursor = await database.aggregate([], {});

        expect((await toShellResult(cursor)).type).to.equal(
          'AggregationCursor'
        );
        expect(serviceProviderCursor.explain).not.to.have.been.called;
      });
    });
    describe('getSiblingDB', function () {
      it('returns a database', function () {
        const otherDb = database.getSiblingDB('otherdb');
        expect(otherDb).to.be.instanceOf(Database);
        expect(otherDb._name).to.equal('otherdb');
      });

      it('throws if name is not a string', function () {
        expect(() => {
          database.getSiblingDB(undefined as any);
        }).to.throw('Missing required argument');
      });

      it('throws if name is empty', function () {
        expect(() => {
          database.getSiblingDB('');
        }).to.throw('Invalid database name:');
      });

      it('throws if name contains invalid characters', function () {
        expect(() => {
          database.getSiblingDB('foo"bar');
        }).to.throw('Invalid database name: foo"bar');
      });

      it('reuses db instances', function () {
        const otherDb = database.getSiblingDB('otherdb');
        expect(database.getSiblingDB('otherdb')).to.equal(otherDb);
      });
    });

    describe('getCollection', function () {
      it('returns a collection for the database', function () {
        const coll = database.getCollection('coll');
        expect(coll).to.be.instanceOf(Collection);
        expect(coll._name).to.equal('coll');
        expect(coll._database).to.equal(database);
      });

      it('returns a collection for Object.prototype keys', function () {
        {
          const coll = database.getCollection('__proto__');
          expect(coll).to.be.instanceOf(Collection);
          expect(coll._name).to.equal('__proto__');
        }
        {
          const coll = database.getCollection('hasOwnProperty');
          expect(coll).to.be.instanceOf(Collection);
          expect(coll._name).to.equal('hasOwnProperty');
        }
      });

      it('throws if name is not a string', function () {
        expect(() => {
          database.getCollection(undefined as any);
        }).to.throw('Missing required argument');
      });

      it('throws if name is empty', function () {
        try {
          database.getCollection('');
          expect.fail('expected error');
        } catch (e: any) {
          expect(e).to.be.instanceOf(MongoshInvalidInputError);
          expect(e.message).to.contain('Invalid collection name:');
          expect(e.code).to.equal(CommonErrors.InvalidArgument);
        }
      });

      it('throws if name contains $', function () {
        try {
          database.getCollection('foo$bar');
          expect.fail('expected error');
        } catch (e: any) {
          expect(e).to.be.instanceOf(MongoshInvalidInputError);
          expect(e.message).to.contain('Invalid collection name:');
          expect(e.code).to.equal(CommonErrors.InvalidArgument);
        }
      });

      it('throws if name contains \\0', function () {
        try {
          database.getCollection('foo\0bar');
          expect.fail('expected error');
        } catch (e: any) {
          expect(e).to.be.instanceOf(MongoshInvalidInputError);
          expect(e.message).to.contain('Invalid collection name:');
          expect(e.code).to.equal(CommonErrors.InvalidArgument);
        }
      });

      it('allows to use collection names that would collide with methods', function () {
        const coll = database.getCollection('getCollection');
        expect(coll).to.be.instanceOf(Collection);
        expect(coll._name).to.equal('getCollection');
      });

      it('allows to use collection names that starts with _', function () {
        const coll = database.getCollection('_coll1');
        expect(coll).to.be.instanceOf(Collection);
        expect(coll._name).to.equal('_coll1');
      });

      it('reuses collections', function () {
        expect(database.getCollection('coll')).to.equal(
          database.getCollection('coll')
        );
      });
    });

    describe('dropDatabase', function () {
      it('calls serviceProvider.dropDatabase on the database', async function () {
        await database.dropDatabase({ w: 1 });

        expect(serviceProvider.dropDatabase).to.have.been.calledWith(
          database._name,
          { writeConcern: { w: 1 } }
        );
      });

      it('returns whatever serviceProvider.dropDatabase returns', async function () {
        const expectedResult = { ok: 1 };
        serviceProvider.dropDatabase.resolves(expectedResult);
        const result = await database.dropDatabase();
        expect(result).to.deep.equal(expectedResult);
      });

      it('throws if serviceProvider.dropDatabase rejects', async function () {
        const expectedError = new Error();
        serviceProvider.dropDatabase.rejects(expectedError);
        const caughtError = await database.dropDatabase().catch((e) => e);
        expect(caughtError).to.equal(expectedError);
      });
    });
    describe('createUser', function () {
      it('calls serviceProvider.runCommandWithCheck on the database with extra fields but not digestPassword', async function () {
        await database.createUser(
          {
            user: 'anna',
            pwd: 'pwd',
            customData: { anything: true },
            roles: [],
          },
          { w: 1 }
        );

        expect(serviceProvider.runCommandWithCheck).to.have.been.calledWith(
          database._name,
          {
            createUser: 'anna',
            pwd: 'pwd',
            customData: { anything: true },
            roles: [],
            writeConcern: { w: 1 },
          }
        );
      });

      it('calls serviceProvider.runCommandWithCheck on the database with extra fields and passwordDigestor=server', async function () {
        await database.createUser(
          {
            user: 'anna',
            pwd: 'pwd',
            customData: { anything: true },
            roles: [],
            passwordDigestor: 'server',
          },
          { w: 1 }
        );

        expect(serviceProvider.runCommandWithCheck).to.have.been.calledWith(
          database._name,
          {
            createUser: 'anna',
            pwd: 'pwd',
            customData: { anything: true },
            roles: [],
            writeConcern: { w: 1 },
            digestPassword: true,
          }
        );
      });

      it('calls serviceProvider.runCommandWithCheck on the database with extra fields and passwordDigestor=client', async function () {
        await database.createUser(
          {
            user: 'anna',
            pwd: 'pwd',
            customData: { anything: true },
            roles: [],
            passwordDigestor: 'client',
          },
          { w: 1 }
        );

        expect(serviceProvider.runCommandWithCheck).to.have.been.calledWith(
          database._name,
          {
            createUser: 'anna',
            pwd: MD5_HASH,
            customData: { anything: true },
            roles: [],
            writeConcern: { w: 1 },
            digestPassword: false,
          }
        );
      });

      it('returns whatever serviceProvider.runCommandWithCheck returns', async function () {
        const expectedResult = { ok: 1 };
        serviceProvider.runCommandWithCheck.resolves(expectedResult);
        const result = await database.createUser(
          {
            user: 'anna',
            pwd: 'pwd',
            customData: { anything: true },
            roles: [],
          },
          { w: 1 }
        );
        expect(result).to.deep.equal(expectedResult);
      });

      it('throws if serviceProvider.runCommandWithCheck rejects', async function () {
        const expectedError = new Error();
        serviceProvider.runCommandWithCheck.rejects(expectedError);
        const caughtError = await database
          .createUser(
            {
              user: 'anna',
              pwd: 'pwd',
              customData: { anything: true },
              roles: [],
            },
            { w: 1 }
          )
          .catch((e) => e);
        expect(caughtError).to.equal(expectedError);
      });

      it('throws if roles is not provided', async function () {
        const caughtError = await database
          .createUser({
            user: 'anna',
            pwd: 'pwd',
          })
          .catch((e) => e);
        expect(caughtError).to.be.instanceOf(MongoshInvalidInputError);
        expect(caughtError.message).to.contain(
          'Missing required property: "roles"'
        );
        expect(caughtError.code).to.equal(CommonErrors.InvalidArgument);
      });

      it('throws if password is missing on database other than $external', async function () {
        const caughtError = await database
          .createUser({
            user: 'anna',
          })
          .catch((e) => e);
        expect(caughtError).to.be.instanceOf(MongoshInvalidInputError);
        expect(caughtError.message).to.contain(
          'Missing required property: "roles"'
        );
        expect(caughtError.code).to.equal(CommonErrors.InvalidArgument);
      });

      it('throws if createUser option is provided', async function () {
        const caughtError = await database
          .createUser({
            user: 'anna',
            pwd: 'pwd',
            createUser: 1,
            roles: [],
          })
          .catch((e) => e);
        expect(caughtError).to.be.instanceOf(MongoshInvalidInputError);
        expect(caughtError.message).to.contain(
          'Cannot set createUser field in helper method'
        );
        expect(caughtError.code).to.equal(CommonErrors.InvalidArgument);
      });

      context('on $external database', function () {
        beforeEach(function () {
          database = new Database(mongo, '$external');
        });

        it('can create a user without password', async function () {
          await database.createUser({
            user: 'CN=Client,OU=Public-Client,O=MongoDB',
            roles: [{ role: 'root', db: 'admin' }],
          });
          expect(serviceProvider.runCommandWithCheck).to.have.been.calledWith(
            database._name,
            {
              createUser: 'CN=Client,OU=Public-Client,O=MongoDB',
              roles: [{ role: 'root', db: 'admin' }],
            }
          );
        });

        it('throws an error when a password is specified', async function () {
          try {
            await database.createUser({
              user: 'CN=Client,OU=Public-Client,O=MongoDB',
              pwd: 'nope',
              roles: [{ role: 'root', db: 'admin' }],
            });
          } catch (e: any) {
            expect(e).to.be.instanceOf(MongoshInvalidInputError);
            expect(e.message).to.contain('Cannot set password');
            return;
          }
          expect.fail('Expected error');
        });
      });
    });
    describe('updateUser', function () {
      it('calls serviceProvider.runCommandWithCheck on the database with extra fields and no passwordDigestor', async function () {
        await database.updateUser(
          'anna',
          {
            pwd: 'pwd',
            customData: { anything: true },
            roles: [],
          },
          { w: 1 }
        );

        expect(serviceProvider.runCommandWithCheck).to.have.been.calledWith(
          database._name,
          {
            updateUser: 'anna',
            pwd: 'pwd',
            customData: { anything: true },
            roles: [],
            writeConcern: { w: 1 },
          }
        );
      });
      it('calls serviceProvider.runCommandWithCheck on the database with extra fields and passwordDigestor=client', async function () {
        await database.updateUser(
          'anna',
          {
            pwd: 'pwd',
            customData: { anything: true },
            roles: [],
            passwordDigestor: 'client',
          },
          { w: 1 }
        );

        expect(serviceProvider.runCommandWithCheck).to.have.been.calledWith(
          database._name,
          {
            updateUser: 'anna',
            pwd: MD5_HASH,
            customData: { anything: true },
            roles: [],
            writeConcern: { w: 1 },
            digestPassword: false,
          }
        );
      });

      it('calls serviceProvider.runCommandWithCheck on the database with extra fields and passwordDigestor=server', async function () {
        await database.updateUser(
          'anna',
          {
            pwd: 'pwd',
            customData: { anything: true },
            roles: [],
            passwordDigestor: 'server',
          },
          { w: 1 }
        );

        expect(serviceProvider.runCommandWithCheck).to.have.been.calledWith(
          database._name,
          {
            updateUser: 'anna',
            pwd: 'pwd',
            customData: { anything: true },
            roles: [],
            writeConcern: { w: 1 },
            digestPassword: true,
          }
        );
      });

      it('returns whatever serviceProvider.runCommandWithCheck returns', async function () {
        const expectedResult = { ok: 1 };
        serviceProvider.runCommandWithCheck.resolves(expectedResult);
        const result = await database.updateUser(
          'anna',
          {
            user: 'anna',
            pwd: 'pwd',
            customData: { anything: true },
            roles: [],
          },
          { w: 1 }
        );
        expect(result).to.deep.equal(expectedResult);
      });

      it('throws if serviceProvider.runCommandWithCheck rejects', async function () {
        const expectedError = new Error();
        serviceProvider.runCommandWithCheck.rejects(expectedError);
        const caughtError = await database
          .updateUser(
            'anna',
            {
              user: 'anna',
              pwd: 'pwd',
              customData: { anything: true },
              roles: [],
            },
            { w: 1 }
          )
          .catch((e) => e);
        expect(caughtError).to.equal(expectedError);
      });

      it('throws if an invalid passwordDigestor is provided', async function () {
        const caughtError = await database
          .updateUser(
            'anna',
            {
              user: 'anna',
              pwd: 'pwd',
              customData: { anything: true },
              roles: [],
              passwordDigestor: 'whatever',
            },
            { w: 1 }
          )
          .catch((e) => e);
        expect(caughtError).to.be.instanceOf(MongoshInvalidInputError);
        expect(caughtError.message).to.contain(
          "passwordDigestor must be 'client' or 'server'"
        );
        expect(caughtError.code).to.equal(CommonErrors.InvalidArgument);
      });
    });
    describe('changeUserPassword', function () {
      it('calls serviceProvider.runCommandWithCheck on the database with extra fields', async function () {
        await database.changeUserPassword('anna', 'pwd');

        expect(serviceProvider.runCommandWithCheck).to.have.been.calledWith(
          database._name,
          {
            updateUser: 'anna',
            pwd: 'pwd',
          }
        );
      });

      it('returns whatever serviceProvider.runCommandWithCheck returns', async function () {
        const expectedResult = { ok: 1 };
        serviceProvider.runCommandWithCheck.resolves(expectedResult);
        const result = await database.changeUserPassword('anna', 'pwd');
        expect(result).to.deep.equal(expectedResult);
      });

      it('throws if serviceProvider.runCommandWithCheck rejects', async function () {
        const expectedError = new Error();
        serviceProvider.runCommandWithCheck.rejects(expectedError);
        const caughtError = await database
          .changeUserPassword('anna', 'pwd')
          .catch((e) => e);
        expect(caughtError).to.equal(expectedError);
      });
    });
    describe('logout', function () {
      it('calls serviceProvider.runCommandWithCheck on the database with extra fields', async function () {
        await database.logout();

        expect(serviceProvider.runCommandWithCheck).to.have.been.calledWith(
          database._name,
          { logout: 1 }
        );
      });

      it('returns whatever serviceProvider.runCommandWithCheck returns', async function () {
        const expectedResult = { ok: 1 };
        serviceProvider.runCommandWithCheck.resolves(expectedResult);
        const result = await database.logout();
        expect(result).to.deep.equal(expectedResult);
      });

      it('throws if serviceProvider.runCommandWithCheck rejects', async function () {
        const expectedError = new Error();
        serviceProvider.runCommandWithCheck.rejects(expectedError);
        const caughtError = await database.logout().catch((e) => e);
        expect(caughtError).to.equal(expectedError);
      });
    });
    describe('dropUser', function () {
      it('calls serviceProvider.runCommandWithCheck on the database', async function () {
        await database.dropUser('anna');

        expect(serviceProvider.runCommandWithCheck).to.have.been.calledWith(
          database._name,
          { dropUser: 'anna' }
        );
      });

      it('returns whatever serviceProvider.runCommandWithCheck returns', async function () {
        const expectedResult = { ok: 1 };
        serviceProvider.runCommandWithCheck.resolves(expectedResult);
        const result = await database.dropUser('anna');
        expect(result).to.deep.equal(expectedResult);
      });

      it('throws if serviceProvider.runCommandWithCheck rejects', async function () {
        const expectedError = new Error();
        serviceProvider.runCommandWithCheck.rejects(expectedError);
        const caughtError = await database.dropUser('anna').catch((e) => e);
        expect(caughtError).to.equal(expectedError);
      });
    });
    describe('dropAllUsers', function () {
      it('calls serviceProvider.runCommandWithCheck on the database', async function () {
        await database.dropAllUsers();

        expect(serviceProvider.runCommandWithCheck).to.have.been.calledWith(
          database._name,
          { dropAllUsersFromDatabase: 1 }
        );
      });

      it('returns whatever serviceProvider.runCommandWithCheck returns', async function () {
        const expectedResult = { ok: 1 };
        serviceProvider.runCommandWithCheck.resolves(expectedResult);
        const result = await database.dropAllUsers();
        expect(result).to.deep.equal(expectedResult);
      });

      it('throws if serviceProvider.runCommandWithCheck rejects', async function () {
        const expectedError = new Error();
        serviceProvider.runCommandWithCheck.rejects(expectedError);
        const caughtError = await database.dropAllUsers().catch((e) => e);
        expect(caughtError).to.equal(expectedError);
      });
    });
    describe('auth', function () {
      it('calls serviceProvider.authenticate on the database when one arg provided', async function () {
        await database.auth({
          user: 'anna',
          pwd: 'pwd',
          mechanism: 'mech',
        });

        expect(serviceProvider.authenticate).to.have.been.calledWith({
          user: 'anna',
          pwd: 'pwd',
          mechanism: 'mech',
          authDb: 'db1',
        });
      });
      it('calls serviceProvider.authenticate on the database when two args provided', async function () {
        await database.auth('anna', 'pwd');

        expect(serviceProvider.authenticate).to.have.been.calledWith({
          user: 'anna',
          pwd: 'pwd',
          authDb: 'db1',
        });
      });

      it('returns whatever serviceProvider.authenticate returns', async function () {
        const expectedResult = { ok: 1 } as any;
        serviceProvider.authenticate.resolves(expectedResult);
        const result = await database.auth('anna', 'pwd');
        expect(result).to.deep.equal(expectedResult);
      });

      it('throws if serviceProvider.runCommandWithCheck rejects', async function () {
        const expectedError = new Error();
        serviceProvider.authenticate.rejects(expectedError);
        const caughtError = await database.auth('anna', 'pwd').catch((e) => e);
        expect(caughtError).to.equal(expectedError);
      });

      [[{}], [{ user: 'anna', pass: 'pwd' }], ['name', 'pwd', 'hmm']].forEach(
        (args) => {
          it('throws for invalid arguments', async function () {
            const caughtError = await database
              .auth(...(args as any))
              .catch((e) => e);
            expect(caughtError).to.be.instanceOf(MongoshInvalidInputError);
            expect(caughtError.code).to.equal(CommonErrors.InvalidArgument);
          });
        }
      );

      it('throws if digestPassword is specified', async function () {
        const caughtError = await database
          .auth({
            user: 'anna',
            pwd: 'pwd',
            digestPassword: 'nope',
          } as any)
          .catch((e) => e);
        expect(caughtError).to.be.instanceOf(MongoshUnimplementedError);
        expect(caughtError.code).to.equal(CommonErrors.NotImplemented);
      });

      it('asks for password if only username is passed', async function () {
        instanceState.setEvaluationListener({
          onPrompt: () => 'superSecretPassword',
        });
        const expectedResult = { ok: 1 } as any;
        serviceProvider.authenticate.resolves(expectedResult);
        const result = await database.auth('anna');
        expect(result).to.deep.equal(expectedResult);
        expect(serviceProvider.authenticate).to.have.been.calledWith({
          user: 'anna',
          pwd: 'superSecretPassword',
          authDb: 'db1',
        });
      });
    });
    describe('grantRolesToUser', function () {
      it('calls serviceProvider.runCommandWithCheck on the database', async function () {
        await database.grantRolesToUser('anna', ['role1']);

        expect(serviceProvider.runCommandWithCheck).to.have.been.calledWith(
          database._name,
          { grantRolesToUser: 'anna', roles: ['role1'] }
        );
      });

      it('returns whatever serviceProvider.runCommandWithCheck returns', async function () {
        const expectedResult = { ok: 1 };
        serviceProvider.runCommandWithCheck.resolves(expectedResult);
        const result = await database.grantRolesToUser('anna', ['role1']);
        expect(result).to.deep.equal(expectedResult);
      });

      it('throws if serviceProvider.runCommandWithCheck rejects', async function () {
        const expectedError = new Error();
        serviceProvider.runCommandWithCheck.rejects(expectedError);
        const caughtError = await database
          .grantRolesToUser('anna', ['role1'])
          .catch((e) => e);
        expect(caughtError).to.equal(expectedError);
      });
    });
    describe('revokeRolesFromUser', function () {
      it('calls serviceProvider.runCommandWithCheck on the database', async function () {
        await database.revokeRolesFromUser('anna', ['role1']);

        expect(serviceProvider.runCommandWithCheck).to.have.been.calledWith(
          database._name,
          { revokeRolesFromUser: 'anna', roles: ['role1'] }
        );
      });

      it('returns whatever serviceProvider.runCommandWithCheck returns', async function () {
        const expectedResult = { ok: 1 };
        serviceProvider.runCommandWithCheck.resolves(expectedResult);
        const result = await database.revokeRolesFromUser('anna', ['role1']);
        expect(result).to.deep.equal(expectedResult);
      });

      it('throws if serviceProvider.runCommandWithCheck rejects', async function () {
        const expectedError = new Error();
        serviceProvider.runCommandWithCheck.rejects(expectedError);
        const caughtError = await database
          .revokeRolesFromUser('anna', ['role1'])
          .catch((e) => e);
        expect(caughtError).to.equal(expectedError);
      });
    });
    describe('getUser', function () {
      it('calls serviceProvider.runCommandWithCheck on the database without options', async function () {
        const expectedResult = { ok: 1, users: [] };
        serviceProvider.runCommandWithCheck.resolves(expectedResult);
        await database.getUser('anna');

        expect(serviceProvider.runCommandWithCheck).to.have.been.calledWith(
          database._name,
          { usersInfo: { user: 'anna', db: 'db1' } }
        );
      });
      it('calls serviceProvider.runCommandWithCheck on the database with options', async function () {
        const expectedResult = { ok: 1, users: [] };
        serviceProvider.runCommandWithCheck.resolves(expectedResult);
        await database.getUser('anna', {
          showCredentials: false,
          showPrivileges: true,
          filter: { f: 1 },
        });

        expect(serviceProvider.runCommandWithCheck).to.have.been.calledWith(
          database._name,
          {
            usersInfo: { user: 'anna', db: 'db1' },
            showCredentials: false,
            showPrivileges: true,
            filter: { f: 1 },
          }
        );
      });

      it('returns whatever serviceProvider.runCommandWithCheck returns', async function () {
        const expectedResult = { ok: 1, users: [{ user: 'anna' }] };
        serviceProvider.runCommandWithCheck.resolves(expectedResult);
        const result = await database.getUser('anna');
        expect(result).to.deep.equal({ user: 'anna' });
      });
      it('returns whatever serviceProvider.runCommandWithCheck returns if user does not exist', async function () {
        const expectedResult = { ok: 1, users: [] };
        serviceProvider.runCommandWithCheck.resolves(expectedResult);
        const result = await database.getUser('anna');
        expect(result).to.deep.equal(null);
      });

      it('throws if serviceProvider.runCommandWithCheck rejects', async function () {
        const expectedError = new Error();
        serviceProvider.runCommandWithCheck.rejects(expectedError);
        const caughtError = await database.getUser('anna').catch((e) => e);
        expect(caughtError).to.equal(expectedError);
      });
    });
    describe('getUsers', function () {
      it('calls serviceProvider.runCommandWithCheck on the database without options', async function () {
        await database.getUsers();

        expect(serviceProvider.runCommandWithCheck).to.have.been.calledWith(
          database._name,
          { usersInfo: 1 }
        );
      });
      it('calls serviceProvider.runCommandWithCheck on the database with options', async function () {
        await database.getUsers({
          showCredentials: false,
          filter: {},
        });

        expect(serviceProvider.runCommandWithCheck).to.have.been.calledWith(
          database._name,
          {
            usersInfo: 1,
            showCredentials: false,
            filter: {},
          }
        );
      });

      it('returns whatever serviceProvider.runCommandWithCheck returns', async function () {
        const expectedResult = { ok: 1 };
        serviceProvider.runCommandWithCheck.resolves(expectedResult);
        const result = await database.getUsers();
        expect(result).to.deep.equal(expectedResult);
      });

      it('throws if serviceProvider.runCommandWithCheck rejects', async function () {
        const expectedError = new Error();
        serviceProvider.runCommandWithCheck.rejects(expectedError);
        const caughtError = await database.getUsers().catch((e) => e);
        expect(caughtError).to.equal(expectedError);
      });
    });
    describe('createCollection', function () {
      it('calls serviceProvider.createCollection on the database without options', async function () {
        await database.createCollection('newcoll');

        expect(serviceProvider.createCollection).to.have.been.calledWith(
          database._name,
          'newcoll',
          {}
        );
      });
      it('calls serviceProvider.createCollection on the database with options', async function () {
        await database.createCollection('newcoll', {
          capped: false,
          max: 100,
          writeConcern: { w: 1 },
        });

        expect(serviceProvider.createCollection).to.have.been.calledWith(
          database._name,
          'newcoll',
          {
            capped: false,
            max: 100,
            writeConcern: { w: 1 },
          }
        );
      });

      it('returns whatever serviceProvider.createCollection returns', async function () {
        const expectedResult = { ok: 1 } as any;
        serviceProvider.createCollection.resolves(expectedResult);
        const result = await database.createCollection('newcoll');
        expect(result).to.deep.equal(expectedResult);
      });

      it('throws if serviceProvider.createCollection rejects', async function () {
        const expectedError = new Error();
        serviceProvider.createCollection.rejects(expectedError);
        const caughtError = await database
          .createCollection('newcoll')
          .catch((e) => e);
        expect(caughtError).to.equal(expectedError);
      });
    });
    describe('createEncryptedCollection', function () {
      let clientEncryption: StubbedInstance<ClientEncryption>;
      const createCollectionOptions = {
        provider: 'local' as ClientEncryptionDataKeyProvider,
        createCollectionOptions: {
          encryptedFields: {
            fields: [],
          },
        },
      };
      beforeEach(function () {
        clientEncryption = stubInterface<ClientEncryption>();
        sinon
          .stub(database._mongo, 'getClientEncryption')
          .returns(clientEncryption);
      });
      it('calls ClientEncryption.createEncryptedCollection with the provided options', async function () {
        await database.createEncryptedCollection(
          'secretCollection',
          createCollectionOptions
        );
        expect(
          clientEncryption.createEncryptedCollection
        ).calledOnceWithExactly(
          database._name,
          'secretCollection',
          createCollectionOptions
        );
      });

      it('returns whatever ClientEncryption.createEncryptedCollection returns', async function () {
        const resolvedValue = {
          collection: { name: 'secretCol' },
          encryptedFields: [],
        } as any;
        clientEncryption.createEncryptedCollection.resolves(resolvedValue);
        const returnValue = await database.createEncryptedCollection(
          'secretCollection',
          createCollectionOptions
        );
        expect(returnValue).to.deep.equal(resolvedValue);
      });
    });
    describe('createView', function () {
      it('calls serviceProvider.createCollection on the database without options', async function () {
        await database.createView('newcoll', 'sourcecoll', [
          { $match: { x: 1 } },
        ]);

        expect(serviceProvider.createCollection).to.have.been.calledWith(
          database._name,
          'newcoll',
          {
            viewOn: 'sourcecoll',
            pipeline: [{ $match: { x: 1 } }],
          }
        );
      });
      it('calls serviceProvider.createCollection on the database with options', async function () {
        await database.createView('newcoll', 'sourcecoll', [], {
          collation: { x: 1 },
        } as any);

        expect(serviceProvider.createCollection).to.have.been.calledWith(
          database._name,
          'newcoll',
          {
            viewOn: 'sourcecoll',
            pipeline: [],
            collation: { x: 1 },
          }
        );
      });

      it('returns whatever serviceProvider.createCollection returns', async function () {
        const expectedResult = { ok: 1 };
        serviceProvider.createCollection.resolves(expectedResult);
        const result = await database.createView('newcoll', 'sourcecoll', []);
        expect(result).to.deep.equal(expectedResult);
      });

      it('throws if serviceProvider.createCollection rejects', async function () {
        const expectedError = new Error();
        serviceProvider.createCollection.rejects(expectedError);
        const caughtError = await database
          .createView('newcoll', 'sourcecoll', [])
          .catch((e) => e);
        expect(caughtError).to.equal(expectedError);
      });
    });
    describe('createRole', function () {
      it('calls serviceProvider.runCommandWithCheck on the database with extra fields', async function () {
        await database.createRole(
          {
            role: 'anna',
            roles: [
              { role: 'clusterAdmin', db: 'db1' },
              { role: 'hostManager' },
            ],
            privileges: ['remove', 'update', 'find'],
            authenticationRestrictions: [1, 2],
          },
          { w: 2 }
        );

        expect(serviceProvider.runCommandWithCheck).to.have.been.calledWith(
          database._name,
          {
            createRole: 'anna',
            roles: [
              { role: 'clusterAdmin', db: 'db1' },
              { role: 'hostManager' },
            ],
            privileges: ['remove', 'update', 'find'],
            authenticationRestrictions: [1, 2],
            writeConcern: { w: 2 },
          }
        );
      });

      it('calls serviceProvider.runCommandWithCheck on the database without extra fields', async function () {
        await database.createRole(
          {
            role: 'anna',
            roles: [],
            privileges: [],
          },
          { w: 3 }
        );

        expect(serviceProvider.runCommandWithCheck).to.have.been.calledWith(
          database._name,
          {
            createRole: 'anna',
            roles: [],
            privileges: [],
            writeConcern: { w: 3 },
          }
        );
      });

      it('returns whatever serviceProvider.runCommandWithCheck returns', async function () {
        const expectedResult = { ok: 1 };
        serviceProvider.runCommandWithCheck.resolves(expectedResult);
        const result = await database.createRole(
          {
            role: 'anna',
            roles: [],
            privileges: [],
          },
          { w: 1 }
        );
        expect(result).to.deep.equal(expectedResult);
      });

      it('throws if serviceProvider.runCommandWithCheck rejects', async function () {
        const expectedError = new Error();
        serviceProvider.runCommandWithCheck.rejects(expectedError);
        const caughtError = await database
          .createRole(
            {
              role: 'anna',
              roles: [],
              privileges: [],
            },
            { w: 1 }
          )
          .catch((e) => e);
        expect(caughtError).to.equal(expectedError);
      });

      it('throws if createRole is specified', async function () {
        const caughtError = await database
          .createRole(
            {
              createRole: 1,
              role: 'anna',
              roles: [],
              privileges: [],
            },
            { w: 1 }
          )
          .catch((e) => e);
        expect(caughtError).to.be.instanceOf(MongoshInvalidInputError);
        expect(caughtError.code).to.equal(CommonErrors.InvalidArgument);
      });
    });
    describe('updateRole', function () {
      it('calls serviceProvider.runCommandWithCheck on the database with no extra fields', async function () {
        await database.updateRole(
          'anna',
          {
            roles: [],
          },
          { w: 1 }
        );

        expect(serviceProvider.runCommandWithCheck).to.have.been.calledWith(
          database._name,
          {
            updateRole: 'anna',
            roles: [],
            writeConcern: { w: 1 },
          }
        );
      });
      it('calls serviceProvider.runCommandWithCheck on the database with extra fields and passwordDigestor=server', async function () {
        await database.updateRole(
          'anna',
          {
            roles: [{ role: 'dbAdmin', db: 'db1' }],
            privileges: ['find'],
            authenticationRestrictions: [1],
          },
          { w: 1 }
        );

        expect(serviceProvider.runCommandWithCheck).to.have.been.calledWith(
          database._name,
          {
            updateRole: 'anna',
            roles: [{ role: 'dbAdmin', db: 'db1' }],
            privileges: ['find'],
            authenticationRestrictions: [1],
            writeConcern: { w: 1 },
          }
        );
      });

      it('returns whatever serviceProvider.runCommandWithCheck returns', async function () {
        const expectedResult = { ok: 1 };
        serviceProvider.runCommandWithCheck.resolves(expectedResult);
        const result = await database.updateRole(
          'anna',
          {
            role: 'anna',
            privileges: [],
            roles: [],
          },
          { w: 1 }
        );
        expect(result).to.deep.equal(expectedResult);
      });

      it('throws if serviceProvider.runCommandWithCheck rejects', async function () {
        const expectedError = new Error();
        serviceProvider.runCommandWithCheck.rejects(expectedError);
        const caughtError = await database
          .updateRole(
            'anna',
            {
              role: 'anna',
              privileges: [],
              roles: [],
            },
            { w: 1 }
          )
          .catch((e) => e);
        expect(caughtError).to.equal(expectedError);
      });
    });
    describe('dropRole', function () {
      it('calls serviceProvider.runCommandWithCheck on the database', async function () {
        await database.dropRole('anna');

        expect(serviceProvider.runCommandWithCheck).to.have.been.calledWith(
          database._name,
          { dropRole: 'anna' }
        );
      });

      it('returns whatever serviceProvider.runCommandWithCheck returns', async function () {
        const expectedResult = { ok: 1 };
        serviceProvider.runCommandWithCheck.resolves(expectedResult);
        const result = await database.dropRole('anna');
        expect(result).to.deep.equal(expectedResult);
      });

      it('throws if serviceProvider.runCommandWithCheck rejects', async function () {
        const expectedError = new Error();
        serviceProvider.runCommandWithCheck.rejects(expectedError);
        const caughtError = await database.dropRole('anna').catch((e) => e);
        expect(caughtError).to.equal(expectedError);
      });
    });
    describe('dropAllRoles', function () {
      it('calls serviceProvider.runCommandWithCheck on the database', async function () {
        await database.dropAllRoles();

        expect(serviceProvider.runCommandWithCheck).to.have.been.calledWith(
          database._name,
          { dropAllRolesFromDatabase: 1 }
        );
      });

      it('returns whatever serviceProvider.runCommandWithCheck returns', async function () {
        const expectedResult = { ok: 1 };
        serviceProvider.runCommandWithCheck.resolves(expectedResult);
        const result = await database.dropAllRoles();
        expect(result).to.deep.equal(expectedResult);
      });

      it('throws if serviceProvider.runCommandWithCheck rejects', async function () {
        const expectedError = new Error();
        serviceProvider.runCommandWithCheck.rejects(expectedError);
        const caughtError = await database.dropAllRoles().catch((e) => e);
        expect(caughtError).to.equal(expectedError);
      });
    });
    describe('grantRolesToRole', function () {
      it('calls serviceProvider.runCommandWithCheck on the database', async function () {
        await database.grantRolesToRole('anna', ['role1']);

        expect(serviceProvider.runCommandWithCheck).to.have.been.calledWith(
          database._name,
          { grantRolesToRole: 'anna', roles: ['role1'] }
        );
      });

      it('returns whatever serviceProvider.runCommandWithCheck returns', async function () {
        const expectedResult = { ok: 1 };
        serviceProvider.runCommandWithCheck.resolves(expectedResult);
        const result = await database.grantRolesToRole('anna', ['role1']);
        expect(result).to.deep.equal(expectedResult);
      });

      it('throws if serviceProvider.runCommandWithCheck rejects', async function () {
        const expectedError = new Error();
        serviceProvider.runCommandWithCheck.rejects(expectedError);
        const caughtError = await database
          .grantRolesToRole('anna', ['role1'])
          .catch((e) => e);
        expect(caughtError).to.equal(expectedError);
      });
    });
    describe('revokeRolesFromRole', function () {
      it('calls serviceProvider.runCommandWithCheck on the database', async function () {
        await database.revokeRolesFromRole('anna', ['role1']);

        expect(serviceProvider.runCommandWithCheck).to.have.been.calledWith(
          database._name,
          { revokeRolesFromRole: 'anna', roles: ['role1'] }
        );
      });

      it('returns whatever serviceProvider.runCommandWithCheck returns', async function () {
        const expectedResult = { ok: 1 };
        serviceProvider.runCommandWithCheck.resolves(expectedResult);
        const result = await database.revokeRolesFromRole('anna', ['role1']);
        expect(result).to.deep.equal(expectedResult);
      });

      it('throws if serviceProvider.runCommandWithCheck rejects', async function () {
        const expectedError = new Error();
        serviceProvider.runCommandWithCheck.rejects(expectedError);
        const caughtError = await database
          .revokeRolesFromRole('anna', ['role1'])
          .catch((e) => e);
        expect(caughtError).to.equal(expectedError);
      });
    });

    describe('grantPrivilegesToRole', function () {
      it('calls serviceProvider.runCommandWithCheck on the database', async function () {
        await database.grantPrivilegesToRole('anna', ['privilege1']);

        expect(serviceProvider.runCommandWithCheck).to.have.been.calledWith(
          database._name,
          { grantPrivilegesToRole: 'anna', privileges: ['privilege1'] }
        );
      });

      it('returns whatever serviceProvider.runCommandWithCheck returns', async function () {
        const expectedResult = { ok: 1 };
        serviceProvider.runCommandWithCheck.resolves(expectedResult);
        const result = await database.grantPrivilegesToRole('anna', [
          'privilege1',
        ]);
        expect(result).to.deep.equal(expectedResult);
      });

      it('throws if serviceProvider.runCommandWithCheck rejects', async function () {
        const expectedError = new Error();
        serviceProvider.runCommandWithCheck.rejects(expectedError);
        const caughtError = await database
          .grantPrivilegesToRole('anna', ['privilege1'])
          .catch((e) => e);
        expect(caughtError).to.equal(expectedError);
      });
    });
    describe('revokePrivilegesFromRole', function () {
      it('calls serviceProvider.runCommandWithCheck on the database', async function () {
        await database.revokePrivilegesFromRole('anna', ['privilege1']);

        expect(serviceProvider.runCommandWithCheck).to.have.been.calledWith(
          database._name,
          { revokePrivilegesFromRole: 'anna', privileges: ['privilege1'] }
        );
      });

      it('returns whatever serviceProvider.runCommandWithCheck returns', async function () {
        const expectedResult = { ok: 1 };
        serviceProvider.runCommandWithCheck.resolves(expectedResult);
        const result = await database.revokePrivilegesFromRole('anna', [
          'privilege1',
        ]);
        expect(result).to.deep.equal(expectedResult);
      });

      it('throws if serviceProvider.runCommandWithCheck rejects', async function () {
        const expectedError = new Error();
        serviceProvider.runCommandWithCheck.rejects(expectedError);
        const caughtError = await database
          .revokePrivilegesFromRole('anna', ['privilege1'])
          .catch((e) => e);
        expect(caughtError).to.equal(expectedError);
      });
    });
    describe('getRole', function () {
      it('calls serviceProvider.runCommandWithCheck on the database without options', async function () {
        const expectedResult = { ok: 1, roles: [] };
        serviceProvider.runCommandWithCheck.resolves(expectedResult);
        await database.getRole('anna');

        expect(serviceProvider.runCommandWithCheck).to.have.been.calledWith(
          database._name,
          { rolesInfo: { role: 'anna', db: 'db1' } }
        );
      });
      it('calls serviceProvider.runCommandWithCheck on the database with options', async function () {
        const expectedResult = { ok: 1, roles: [] };
        serviceProvider.runCommandWithCheck.resolves(expectedResult);
        await database.getRole('anna', {
          showBuiltinRoles: false,
          showPrivileges: true,
        });

        expect(serviceProvider.runCommandWithCheck).to.have.been.calledWith(
          database._name,
          {
            rolesInfo: { role: 'anna', db: 'db1' },
            showBuiltinRoles: false,
            showPrivileges: true,
          }
        );
      });

      it('returns whatever serviceProvider.runCommandWithCheck returns', async function () {
        const expectedResult = { ok: 1, roles: [{ role: 'anna' }] };
        serviceProvider.runCommandWithCheck.resolves(expectedResult);
        const result = await database.getRole('anna');
        expect(result).to.deep.equal({ role: 'anna' });
      });
      it('returns whatever serviceProvider.runCommandWithCheck returns if role does not exist', async function () {
        const expectedResult = { ok: 1, roles: [] };
        serviceProvider.runCommandWithCheck.resolves(expectedResult);
        const result = await database.getRole('anna');
        expect(result).to.deep.equal(null);
      });

      it('throws if serviceProvider.runCommandWithCheck rejects', async function () {
        const expectedError = new Error();
        serviceProvider.runCommandWithCheck.rejects(expectedError);
        const caughtError = await database.getRole('anna').catch((e) => e);
        expect(caughtError).to.equal(expectedError);
      });
    });
    describe('getRoles', function () {
      it('calls serviceProvider.runCommandWithCheck on the database without options', async function () {
        await database.getRoles();

        expect(serviceProvider.runCommandWithCheck).to.have.been.calledWith(
          database._name,
          { rolesInfo: 1 }
        );
      });
      it('calls serviceProvider.runCommandWithCheck on the database with options', async function () {
        await database.getRoles({
          showCredentials: false,
          filter: {},
        });

        expect(serviceProvider.runCommandWithCheck).to.have.been.calledWith(
          database._name,
          {
            rolesInfo: 1,
            showCredentials: false,
            filter: {},
          }
        );
      });

      it('returns whatever serviceProvider.runCommandWithCheck returns', async function () {
        const expectedResult = { ok: 1 };
        serviceProvider.runCommandWithCheck.resolves(expectedResult);
        const result = await database.getRoles();
        expect(result).to.deep.equal(expectedResult);
      });

      it('throws if serviceProvider.runCommandWithCheck rejects', async function () {
        const expectedError = new Error();
        serviceProvider.runCommandWithCheck.rejects(expectedError);
        const caughtError = await database.getRoles().catch((e) => e);
        expect(caughtError).to.equal(expectedError);
      });
    });

    describe('currentOp', function () {
      const currentOpStage = (args: Document = {}) => ({
        $currentOp: {
          allUsers: false,
          idleConnections: false,
          truncateOps: false,
          ...args,
        },
      });

      const AGGREGATE_OPTIONS = {
        $readPreference: {
          mode: 'primaryPreferred',
        },
        bsonRegExp: true,
      };

      beforeEach(function () {
        const tryNext = sinon.stub();
        tryNext.onCall(0).resolves({});
        tryNext.onCall(1).resolves(null);
        serviceProvider.aggregateDb.returns({ tryNext } as any);
      });

      context('when called with a falsy value', function () {
        it('calls serviceProvider.aggregateDb with correct options', async function () {
          await database.currentOp();
          await database.currentOp(false);

          for (const args of serviceProvider.aggregateDb.args) {
            expect(args[0]).to.equal('admin');
            const [stageCurrentOp] = args[1];
            expect(stageCurrentOp).to.deep.equal(
              currentOpStage({
                allUsers: true,
                idleConnections: false,
              })
            );
            expect(serviceProvider.aggregateDb.firstCall.args[2]).to.deep.equal(
              AGGREGATE_OPTIONS
            );
          }
        });
      });

      context('when called with a boolean - true', function () {
        it('calls serviceProvider.aggregateDb with correct options', async function () {
          await database.currentOp(true);
          expect(serviceProvider.aggregateDb).to.have.been.calledOnce;
          expect(serviceProvider.aggregateDb.firstCall.args[0]).to.equal(
            'admin'
          );
          const [stageCurrentOp] =
            serviceProvider.aggregateDb.firstCall.args[1];
          expect(stageCurrentOp).to.deep.equal(
            currentOpStage({
              allUsers: true,
              idleConnections: true,
            })
          );
          expect(serviceProvider.aggregateDb.firstCall.args[2]).to.deep.equal(
            AGGREGATE_OPTIONS
          );
        });
      });

      context('when called with options containing $all', function () {
        it('calls serviceProvider.aggregateDb with correct options', async function () {
          await database.currentOp({ $all: true });
          expect(serviceProvider.aggregateDb).to.have.been.calledOnce;
          expect(serviceProvider.aggregateDb.firstCall.args[0]).to.equal(
            'admin'
          );
          const [stageCurrentOp, matchStage] =
            serviceProvider.aggregateDb.firstCall.args[1];
          expect(stageCurrentOp).to.deep.equal(
            currentOpStage({
              allUsers: true,
              idleConnections: true,
            })
          );
          expect(matchStage).to.deep.equals({ $match: {} });
          expect(serviceProvider.aggregateDb.firstCall.args[2]).to.deep.equal(
            AGGREGATE_OPTIONS
          );
        });
      });

      context('when called with options containing $ownOps', function () {
        it('calls serviceProvider.aggregateDb with correct options', async function () {
          await database.currentOp({ $ownOps: true });
          expect(serviceProvider.aggregateDb).to.have.been.calledOnce;
          expect(serviceProvider.aggregateDb.firstCall.args[0]).to.equal(
            'admin'
          );
          const [stageCurrentOp, matchStage] =
            serviceProvider.aggregateDb.firstCall.args[1];
          expect(stageCurrentOp).to.deep.equal(
            currentOpStage({
              allUsers: false,
              idleConnections: false,
            })
          );
          expect(matchStage).to.deep.equals({ $match: {} });
          expect(serviceProvider.aggregateDb.firstCall.args[2]).to.deep.equal(
            AGGREGATE_OPTIONS
          );
        });
      });

      context(
        'when called with options containing both $ownOps and $all',
        function () {
          it('calls serviceProvider.aggregateDb with correct options', async function () {
            await database.currentOp({ $all: true, $ownOps: true });
            expect(serviceProvider.aggregateDb).to.have.been.calledOnce;
            expect(serviceProvider.aggregateDb.firstCall.args[0]).to.equal(
              'admin'
            );
            const [stageCurrentOp, matchStage] =
              serviceProvider.aggregateDb.firstCall.args[1];
            expect(stageCurrentOp).to.deep.equal(
              currentOpStage({
                allUsers: false,
                idleConnections: true,
              })
            );
            expect(matchStage).to.deep.equals({ $match: {} });
            expect(serviceProvider.aggregateDb.firstCall.args[2]).to.deep.equal(
              AGGREGATE_OPTIONS
            );
          });
        }
      );

      context(
        'when called with options containing filter conditions',
        function () {
          it('calls serviceProvider.aggregateDb with correct options', async function () {
            await database.currentOp({
              $all: true,
              waitingForLock: true,
            });

            expect(serviceProvider.aggregateDb).to.have.been.calledOnce;
            expect(serviceProvider.aggregateDb.firstCall.args[0]).to.equal(
              'admin'
            );
            const [stageCurrentOp, matchStage] =
              serviceProvider.aggregateDb.firstCall.args[1];
            expect(stageCurrentOp).to.deep.equal(
              currentOpStage({
                allUsers: true,
                idleConnections: true,
              })
            );
            expect(matchStage).to.deep.equals({
              $match: { waitingForLock: true },
            });
            expect(serviceProvider.aggregateDb.firstCall.args[2]).to.deep.equal(
              AGGREGATE_OPTIONS
            );
          });

          it('ensures that $ownOps, $all and $truncateOps are never passed down as filters', async function () {
            await database.currentOp({
              $all: true,
              $ownOps: false,
              $truncateOps: false,
              waitingForLock: true,
            });

            const [, matchStage] =
              serviceProvider.aggregateDb.firstCall.args[1];
            expect(matchStage).to.deep.equals({
              $match: { waitingForLock: true },
            });
          });
        }
      );

      it('returns the result of serviceProvider.aggregateDb wrapped in an interface', async function () {
        const expectedResult = { ok: 1, inprog: [] };

        const tryNext = sinon.stub();
        tryNext.onCall(0).resolves();
        tryNext.onCall(1).resolves(null);
        serviceProvider.aggregateDb.returns({ tryNext } as any);

        const result = await database.currentOp();
        expect(result).to.deep.equal(expectedResult);
      });

      it('throws if serviceProvider.aggregateDb rejects', async function () {
        const expectedError = new Error();

        const tryNext = sinon.stub();
        tryNext.onCall(0).rejects(expectedError);
        serviceProvider.aggregateDb.returns({ tryNext } as any);
        const caughtError = await database.currentOp().catch((e) => e);
        expect(caughtError).to.equal(expectedError);
      });

      it('tries serviceProvider.aggregateDb without truncateOps in case of FailedToParse', async function () {
        const failedToParseError: Error & { codeName?: string } = new Error(
          "failed parsing stage: unrecognized option 'truncateOps' in $currentOp stage, correlationID = d22322776557396"
        );
        failedToParseError.codeName = 'FailedToParse';

        const tryNext = sinon.stub();
        tryNext.onCall(0).rejects(failedToParseError);
        tryNext.onCall(1).resolves({});

        const currentOpCalls: {
          allUsers: boolean;
          idleConnections: boolean;
          truncateOps?: boolean;
        }[] = [];

        serviceProvider.aggregateDb.callsFake((...args) => {
          const [stageCurrentOp] = args[1];
          const currentOp = { ...stageCurrentOp.$currentOp };
          currentOpCalls.push(currentOp);
          return { tryNext } as any;
        });

        const result = await database.currentOp();
        expect(result).to.deep.equal({ inprog: [{}], ok: 1 });

        expect(serviceProvider.aggregateDb).to.have.callCount(2);
        expect(currentOpCalls.length).to.be.equal(2);
        expect(currentOpCalls[0]).to.be.deep.equal({
          allUsers: true,
          idleConnections: false,
          truncateOps: false,
        });
        expect(currentOpCalls[1]).to.be.deep.equal({
          allUsers: true,
          idleConnections: false,
        });
      });
    });

    describe('killOp', function () {
      it('calls serviceProvider.runCommandWithCheck on the database with options', async function () {
        await database.killOp(123);

        expect(serviceProvider.runCommandWithCheck).to.have.been.calledWith(
          ADMIN_DB,
          {
            killOp: 1,
            op: 123,
          }
        );
      });

      it('can accept a string as an argument', async function () {
        await database.killOp('foo:1234');

        expect(serviceProvider.runCommandWithCheck).to.have.been.calledWith(
          ADMIN_DB,
          {
            killOp: 1,
            op: 'foo:1234',
          }
        );
      });

      it('returns whatever serviceProvider.runCommandWithCheck returns', async function () {
        const expectedResult = { ok: 1 };
        serviceProvider.runCommandWithCheck.resolves(expectedResult);
        const result = await database.killOp(123);
        expect(result).to.deep.equal(expectedResult);
      });

      it('throws if serviceProvider.runCommandWithCheck rejects', async function () {
        const expectedError = new Error();
        serviceProvider.runCommandWithCheck.rejects(expectedError);
        const caughtError = await database.killOp(123).catch((e) => e);
        expect(caughtError).to.equal(expectedError);
      });
    });

    describe('shutdownServer', function () {
      it('calls serviceProvider.runCommandWithCheck on the database without options', async function () {
        await database.shutdownServer();

        expect(serviceProvider.runCommandWithCheck).to.have.been.calledWith(
          ADMIN_DB,
          { shutdown: 1 }
        );
      });
      it('calls serviceProvider.runCommandWithCheck on the database with options', async function () {
        await database.shutdownServer({
          force: true,
          timeoutSecs: 1,
        });

        expect(serviceProvider.runCommandWithCheck).to.have.been.calledWith(
          ADMIN_DB,
          {
            shutdown: 1,
            force: true,
            timeoutSecs: 1,
          }
        );
      });

      it('returns whatever serviceProvider.runCommandWithCheck returns', async function () {
        const expectedResult = { ok: 1 };
        serviceProvider.runCommandWithCheck.resolves(expectedResult);
        const result = await database.shutdownServer();
        expect(result).to.deep.equal(expectedResult);
      });

      it('throws if serviceProvider.runCommandWithCheck rejects', async function () {
        const expectedError = new Error();
        serviceProvider.runCommandWithCheck.rejects(expectedError);
        const caughtError = await database.shutdownServer().catch((e) => e);
        expect(caughtError).to.equal(expectedError);
      });
    });

    describe('fsyncLock', function () {
      it('calls serviceProvider.runCommandWithCheck on the database with options', async function () {
        await database.fsyncLock();

        expect(serviceProvider.runCommandWithCheck).to.have.been.calledWith(
          ADMIN_DB,
          {
            fsync: 1,
            lock: true,
          }
        );
      });

      it('returns whatever serviceProvider.runCommandWithCheck returns', async function () {
        const expectedResult = { ok: 1 };
        serviceProvider.runCommandWithCheck.resolves(expectedResult);
        const result = await database.fsyncLock();
        expect(result).to.deep.equal(expectedResult);
      });

      it('throws if serviceProvider.runCommandWithCheck rejects', async function () {
        const expectedError = new Error();
        serviceProvider.runCommandWithCheck.rejects(expectedError);
        const caughtError = await database.fsyncLock().catch((e) => e);
        expect(caughtError).to.equal(expectedError);
      });
    });

    describe('fsyncUnlock', function () {
      it('calls serviceProvider.runCommandWithCheck on the database with options', async function () {
        await database.fsyncUnlock();

        expect(serviceProvider.runCommandWithCheck).to.have.been.calledWith(
          ADMIN_DB,
          {
            fsyncUnlock: 1,
          }
        );
      });

      it('returns whatever serviceProvider.runCommandWithCheck returns', async function () {
        const expectedResult = { ok: 1 };
        serviceProvider.runCommandWithCheck.resolves(expectedResult);
        const result = await database.fsyncUnlock();
        expect(result).to.deep.equal(expectedResult);
      });

      it('throws if serviceProvider.runCommandWithCheck rejects', async function () {
        const expectedError = new Error();
        serviceProvider.runCommandWithCheck.rejects(expectedError);
        const caughtError = await database.fsyncUnlock().catch((e) => e);
        expect(caughtError).to.equal(expectedError);
      });
    });

    describe('version', function () {
      it('calls serviceProvider.runCommandWithCheck on the database with options', async function () {
        const expectedResult = { ok: 1, version: 1 };
        serviceProvider.runCommandWithCheck.resolves(expectedResult);
        await database.version();
        expect(serviceProvider.runCommandWithCheck).to.have.been.calledWith(
          ADMIN_DB,
          {
            buildInfo: 1,
          }
        );
      });

      it('returns whatever serviceProvider.runCommandWithCheck returns', async function () {
        const expectedResult = { ok: 1, version: 1 };
        serviceProvider.runCommandWithCheck.resolves(expectedResult);
        const result = await database.version();
        expect(result).to.deep.equal(1);
      });

      it('throws if serviceProvider.runCommandWithCheck rejects', async function () {
        const expectedError = new Error();
        serviceProvider.runCommandWithCheck.rejects(expectedError);
        const caughtError = await database.version().catch((e) => e);
        expect(caughtError).to.equal(expectedError);
      });

      it('throws if runCommand returns undefined', async function () {
        serviceProvider.runCommandWithCheck.resolves(undefined);
        const caughtError = await database.version().catch((e) => e);
        expect(caughtError).to.be.instanceOf(MongoshRuntimeError);
        expect(caughtError.code).to.equal(CommonErrors.CommandFailed);
      });
    });

    describe('serverBits', function () {
      it('calls serviceProvider.runCommandWithCheck on the database with options', async function () {
        const expectedResult = { ok: 1, bits: 1 };
        serviceProvider.runCommandWithCheck.resolves(expectedResult);
        await database.serverBits();

        expect(serviceProvider.runCommandWithCheck).to.have.been.calledWith(
          ADMIN_DB,
          {
            buildInfo: 1,
          }
        );
      });

      it('returns whatever serviceProvider.runCommandWithCheck returns', async function () {
        serviceProvider.runCommandWithCheck.resolves({ ok: 1, bits: 3 });
        const result = await database.serverBits();
        expect(result).to.deep.equal(3);
      });

      it('throws if serviceProvider.runCommandWithCheck rejects', async function () {
        const expectedError = new Error();
        serviceProvider.runCommandWithCheck.rejects(expectedError);
        const caughtError = await database.serverBits().catch((e) => e);
        expect(caughtError).to.equal(expectedError);
      });

      it('throws if runCommand returns undefined', async function () {
        serviceProvider.runCommandWithCheck.resolves(undefined);
        const caughtError = await database.serverBits().catch((e) => e);
        expect(caughtError).to.be.instanceOf(MongoshRuntimeError);
        expect(caughtError.code).to.equal(CommonErrors.CommandFailed);
      });
    });

    describe('isMaster', function () {
      it('calls serviceProvider.runCommandWithCheck on the database with options', async function () {
        await database.isMaster();

        expect(serviceProvider.runCommandWithCheck).to.have.been.calledWith(
          database._name,
          {
            isMaster: 1,
          }
        );
      });

      it('returns whatever serviceProvider.runCommandWithCheck returns', async function () {
        const expectedResult = { ok: 1 };
        serviceProvider.runCommandWithCheck.resolves(expectedResult);
        const result = await database.isMaster();
        expect(result).to.deep.equal(expectedResult);
      });

      it('throws if serviceProvider.runCommandWithCheck rejects', async function () {
        const expectedError = new Error();
        serviceProvider.runCommandWithCheck.rejects(expectedError);
        const caughtError = await database.isMaster().catch((e) => e);
        expect(caughtError).to.equal(expectedError);
      });
    });

    describe('serverBuildInfo', function () {
      it('calls serviceProvider.runCommandWithCheck on the database with options', async function () {
        await database.serverBuildInfo();

        expect(serviceProvider.runCommandWithCheck).to.have.been.calledWith(
          ADMIN_DB,
          {
            buildInfo: 1,
          }
        );
      });

      it('returns whatever serviceProvider.runCommandWithCheck returns', async function () {
        const expectedResult = { ok: 1 };
        serviceProvider.runCommandWithCheck.resolves(expectedResult);
        const result = await database.serverBuildInfo();
        expect(result).to.deep.equal(expectedResult);
      });

      it('throws if serviceProvider.runCommandWithCheck rejects', async function () {
        const expectedError = new Error();
        serviceProvider.runCommandWithCheck.rejects(expectedError);
        const caughtError = await database.serverBuildInfo().catch((e) => e);
        expect(caughtError).to.equal(expectedError);
      });
    });

    describe('stats', function () {
      it('calls serviceProvider.runCommandWithCheck on the database with scale argument', async function () {
        await database.stats(1);

        expect(serviceProvider.runCommandWithCheck).to.have.been.calledWith(
          database._name,
          {
            dbStats: 1,
            scale: 1,
          }
        );
      });

      it('calls serviceProvider.runCommandWithCheck on the database with options object', async function () {
        await database.stats({ scale: 1, freeStorage: 1 });

        expect(serviceProvider.runCommandWithCheck).to.have.been.calledWith(
          database._name,
          {
            dbStats: 1,
            scale: 1,
            freeStorage: 1,
          }
        );
      });

      it('calls serviceProvider.runCommandWithCheck on the database with options object without explicit scale', async function () {
        await database.stats({ freeStorage: 1 });

        expect(serviceProvider.runCommandWithCheck).to.have.been.calledWith(
          database._name,
          {
            dbStats: 1,
            scale: 1,
            freeStorage: 1,
          }
        );
      });

      it('calls serviceProvider.runCommandWithCheck on the database without options', async function () {
        await database.stats();

        expect(serviceProvider.runCommandWithCheck).to.have.been.calledWith(
          database._name,
          {
            dbStats: 1,
            scale: 1,
          }
        );
      });

      it('returns whatever serviceProvider.runCommandWithCheck returns', async function () {
        const expectedResult = { ok: 1 };
        serviceProvider.runCommandWithCheck.resolves(expectedResult);
        const result = await database.stats(1);
        expect(result).to.deep.equal(expectedResult);
      });

      it('throws if serviceProvider.runCommandWithCheck rejects', async function () {
        const expectedError = new Error();
        serviceProvider.runCommandWithCheck.rejects(expectedError);
        const caughtError = await database.stats(1).catch((e) => e);
        expect(caughtError).to.equal(expectedError);
      });
    });

    describe('serverStatus', function () {
      it('calls serviceProvider.runCommandWithCheck on the database with options', async function () {
        await database.serverStatus({ repl: 0, metrics: 0, locks: 0 });

        expect(serviceProvider.runCommandWithCheck).to.have.been.calledWith(
          ADMIN_DB,
          {
            serverStatus: 1,
            repl: 0,
            metrics: 0,
            locks: 0,
          }
        );
      });
      it('calls serviceProvider.runCommandWithCheck on the database without options', async function () {
        await database.serverStatus();

        expect(serviceProvider.runCommandWithCheck).to.have.been.calledWith(
          ADMIN_DB,
          {
            serverStatus: 1,
          }
        );
      });

      it('returns whatever serviceProvider.runCommandWithCheck returns', async function () {
        const expectedResult = { ok: 1 };
        serviceProvider.runCommandWithCheck.resolves(expectedResult);
        const result = await database.serverStatus();
        expect(result).to.deep.equal(expectedResult);
      });

      it('throws if serviceProvider.runCommandWithCheck rejects', async function () {
        const expectedError = new Error();
        serviceProvider.runCommandWithCheck.rejects(expectedError);
        const caughtError = await database.serverStatus().catch((e) => e);
        expect(caughtError).to.equal(expectedError);
      });
    });

    describe('hostInfo', function () {
      it('calls serviceProvider.runCommandWithCheck on the database with options', async function () {
        await database.hostInfo();

        expect(serviceProvider.runCommandWithCheck).to.have.been.calledWith(
          ADMIN_DB,
          {
            hostInfo: 1,
          }
        );
      });

      it('returns whatever serviceProvider.runCommandWithCheck returns', async function () {
        const expectedResult = { ok: 1 };
        serviceProvider.runCommandWithCheck.resolves(expectedResult);
        const result = await database.hostInfo();
        expect(result).to.deep.equal(expectedResult);
      });

      it('throws if serviceProvider.runCommandWithCheck rejects', async function () {
        const expectedError = new Error();
        serviceProvider.runCommandWithCheck.rejects(expectedError);
        const caughtError = await database.hostInfo().catch((e) => e);
        expect(caughtError).to.equal(expectedError);
      });
    });

    describe('serverCmdLineOpts', function () {
      it('calls serviceProvider.runCommandWithCheck on the database with options', async function () {
        await database.serverCmdLineOpts();

        expect(serviceProvider.runCommandWithCheck).to.have.been.calledWith(
          ADMIN_DB,
          {
            getCmdLineOpts: 1,
          }
        );
      });

      it('returns whatever serviceProvider.runCommandWithCheck returns', async function () {
        const expectedResult = { ok: 1 };
        serviceProvider.runCommandWithCheck.resolves(expectedResult);
        const result = await database.serverCmdLineOpts();
        expect(result).to.deep.equal(expectedResult);
      });

      it('throws if serviceProvider.runCommandWithCheck rejects', async function () {
        const expectedError = new Error();
        serviceProvider.runCommandWithCheck.rejects(expectedError);
        const caughtError = await database.serverCmdLineOpts().catch((e) => e);
        expect(caughtError).to.equal(expectedError);
      });
    });

    describe('printCollectionStats', function () {
      it('throws if scale is invalid', async function () {
        const error = await database.printCollectionStats(-1).catch((e) => e);
        expect(error).to.be.instanceOf(MongoshInvalidInputError);
        expect(error.code).to.equal(CommonErrors.InvalidArgument);
      });
      it('returns an object with per-collection stats', async function () {
        serviceProvider.listCollections.resolves([{ name: 'abc' }]);
        const collStatsResult = { storageStats: { totalSize: 1000 } };
        const tryNext = sinon.stub();
        tryNext.onCall(0).resolves(collStatsResult);
        tryNext.onCall(1).resolves(null);
        serviceProvider.aggregate.returns({ tryNext } as any);
        const serviceProviderCursor = stubInterface<ServiceProviderCursor>();
        serviceProviderCursor.limit.returns(serviceProviderCursor);
        serviceProviderCursor.tryNext.returns(undefined as any);
        serviceProvider.find.returns(serviceProviderCursor);
        const result = await database.printCollectionStats(1);
        expect(result.value.abc).to.deep.equal({
          ok: 1,
          avgObjSize: 0,
          indexSizes: {},
          nindexes: 0,
          ns: 'db1.abc',
          sharded: false,
          totalSize: 1000,
        });
      });
    });

    describe('getProfilingStatus', function () {
      it('calls serviceProvider.runCommandWithCheck on the database', async function () {
        serviceProvider.runCommandWithCheck.resolves({ ok: 1 });
        await database.getProfilingStatus();

        expect(serviceProvider.runCommandWithCheck).to.have.been.calledWith(
          database._name,
          {
            profile: -1,
          }
        );
      });

      it('returns whatever serviceProvider.runCommandWithCheck returns', async function () {
        const expectedResult = { ok: 1 };
        serviceProvider.runCommandWithCheck.resolves(expectedResult);
        const result = await database.getProfilingStatus();
        expect(result).to.deep.equal(expectedResult);
      });

      it('throws if serviceProvider.runCommandWithCheck rejects', async function () {
        const expectedError = new Error();
        serviceProvider.runCommandWithCheck.rejects(expectedError);
        const caughtError = await database.getProfilingStatus().catch((e) => e);
        expect(caughtError).to.equal(expectedError);
      });
    });

    describe('setProfilingLevel', function () {
      it('calls serviceProvider.runCommandWithCheck on the database no options', async function () {
        serviceProvider.runCommandWithCheck.resolves({ ok: 1 });
        await database.setProfilingLevel(1);

        expect(serviceProvider.runCommandWithCheck).to.have.been.calledWith(
          database._name,
          {
            profile: 1,
          }
        );
      });

      it('calls serviceProvider.runCommandWithCheck on the database w number options', async function () {
        serviceProvider.runCommandWithCheck.resolves({ ok: 1 });
        await database.setProfilingLevel(1, 100);

        expect(serviceProvider.runCommandWithCheck).to.have.been.calledWith(
          database._name,
          {
            profile: 1,
            slowms: 100,
          }
        );
      });

      it('calls serviceProvider.runCommandWithCheck on the database w doc options', async function () {
        serviceProvider.runCommandWithCheck.resolves({ ok: 1 });
        await database.setProfilingLevel(1, { slowms: 100, sampleRate: 0.5 });

        expect(serviceProvider.runCommandWithCheck).to.have.been.calledWith(
          database._name,
          {
            profile: 1,
            slowms: 100,
            sampleRate: 0.5,
          }
        );
      });

      it('returns whatever serviceProvider.runCommandWithCheck returns', async function () {
        const expectedResult = { ok: 1 };
        serviceProvider.runCommandWithCheck.resolves(expectedResult);
        const result = await database.setProfilingLevel(1);
        expect(result).to.deep.equal(expectedResult);
      });

      it('throws if serviceProvider.runCommandWithCheck rejects', async function () {
        const expectedError = new Error();
        serviceProvider.runCommandWithCheck.rejects(expectedError);
        const caughtError = await database.setProfilingLevel(1).catch((e) => e);
        expect(caughtError).to.equal(expectedError);
      });

      it('throws if profiling level is invalid', async function () {
        const caughtError = await database.setProfilingLevel(4).catch((e) => e);
        expect(caughtError).to.be.instanceOf(MongoshInvalidInputError);
        expect(caughtError.code).to.equal(CommonErrors.InvalidArgument);
      });
    });

    describe('setLogLevel', function () {
      it('calls serviceProvider.runCommandWithCheck on the database with no component', async function () {
        serviceProvider.runCommandWithCheck.resolves({ ok: 1 });
        await database.setLogLevel(2);

        expect(serviceProvider.runCommandWithCheck).to.have.been.calledWith(
          ADMIN_DB,
          {
            setParameter: 1,
            logComponentVerbosity: { verbosity: 2 },
          }
        );
      });
      it('calls serviceProvider.runCommandWithCheck on the database with string component', async function () {
        serviceProvider.runCommandWithCheck.resolves({ ok: 1 });
        await database.setLogLevel(2, 'a.b.c');

        expect(serviceProvider.runCommandWithCheck).to.have.been.calledWith(
          ADMIN_DB,
          {
            setParameter: 1,
            logComponentVerbosity: { a: { b: { c: { verbosity: 2 } } } },
          }
        );
      });

      it('returns whatever serviceProvider.runCommandWithCheck returns', async function () {
        const expectedResult = { ok: 1 };
        serviceProvider.runCommandWithCheck.resolves(expectedResult);
        const result = await database.setLogLevel(2);
        expect(result).to.deep.equal(expectedResult);
      });

      it('throws if serviceProvider.runCommandWithCheck rejects', async function () {
        const expectedError = new Error();
        serviceProvider.runCommandWithCheck.rejects(expectedError);
        const caughtError = await database.setLogLevel(2).catch((e) => e);
        expect(caughtError).to.equal(expectedError);
      });

      it('throws if component is given but not a string', async function () {
        const caughtError = await database.setLogLevel(1, {}).catch((e) => e);
        expect(caughtError).to.be.instanceOf(MongoshInvalidInputError);
        expect(caughtError.code).to.equal(CommonErrors.InvalidArgument);
      });
    });

    describe('getLogComponents', function () {
      it('calls serviceProvider.runCommandWithCheck on the database with options', async function () {
        serviceProvider.runCommandWithCheck.resolves({
          ok: 1,
          logComponentVerbosity: 1,
        });
        await database.getLogComponents();

        expect(serviceProvider.runCommandWithCheck).to.have.been.calledWith(
          ADMIN_DB,
          {
            getParameter: 1,
            logComponentVerbosity: 1,
          }
        );
      });

      it('returns whatever serviceProvider.runCommandWithCheck returns', async function () {
        const expectedResult = { ok: 1, logComponentVerbosity: 100 };
        serviceProvider.runCommandWithCheck.resolves(expectedResult);
        const result = await database.getLogComponents();
        expect(result).to.deep.equal(100);
      });

      it('throws if serviceProvider.runCommandWithCheck returns undefined', async function () {
        serviceProvider.runCommandWithCheck.resolves(undefined);
        const caughtError = await database.getLogComponents().catch((e) => e);
        expect(caughtError).to.be.instanceOf(MongoshRuntimeError);
        expect(caughtError.code).to.equal(CommonErrors.CommandFailed);
      });

      it('throws if serviceProvider.runCommandWithCheck rejects', async function () {
        const expectedError = new Error();
        serviceProvider.runCommandWithCheck.rejects(expectedError);
        const caughtError = await database.getLogComponents().catch((e) => e);
        expect(caughtError).to.equal(expectedError);
      });
    });

    describe('cloneDatabase, cloneCollection, copyDatabase', function () {
      it('throws a helpful exception regarding their removal', function () {
        for (const method of [
          'cloneDatabase',
          'cloneCollection',
          'copyDatabase',
        ] as const) {
          try {
            database[method]();
            expect.fail('expected error');
          } catch (e: any) {
            expect(e).to.be.instanceOf(MongoshDeprecatedError);
            expect(e.message).to.contain(
              `\`${method}()\` was removed because it was deprecated in MongoDB 4.0`
            );
          }
        }
      });
    });

    describe('commandHelp', function () {
      it('calls serviceProvider.runCommandWithCheck on the database with options', async function () {
        const expectedResult = { ok: 1, help: 1 };
        serviceProvider.runCommandWithCheck.resolves(expectedResult);
        await database.commandHelp('listDatabases');

        expect(serviceProvider.runCommandWithCheck).to.have.been.calledWith(
          database._name,
          {
            listDatabases: 1,
            help: true,
          }
        );
      });

      it('returns whatever serviceProvider.runCommandWithCheck().help returns', async function () {
        const expectedResult = { ok: 1, help: 'help string' };
        serviceProvider.runCommandWithCheck.resolves(expectedResult);
        const result = await database.commandHelp('listDatabases');
        expect(result).to.deep.equal('help string');
      });

      it('throws if serviceProvider.runCommandWithCheck returns undefined', async function () {
        serviceProvider.runCommandWithCheck.resolves(undefined);
        const caughtError = await database
          .commandHelp('listDatabases')
          .catch((e) => e);
        expect(caughtError).to.be.instanceOf(MongoshRuntimeError);
        expect(caughtError.code).to.equal(CommonErrors.CommandFailed);
      });

      it('throws if serviceProvider.runCommandWithCheck rejects', async function () {
        const expectedError = new Error();
        serviceProvider.runCommandWithCheck.rejects(expectedError);
        const caughtError = await database
          .commandHelp('listDatabases')
          .catch((e) => e);
        expect(caughtError).to.equal(expectedError);
      });
    });

    describe('listCommands', function () {
      it('calls serviceProvider.runCommandWithCheck on the database', async function () {
        const expectedResult = { ok: 1, commands: [] };
        serviceProvider.runCommandWithCheck.resolves(expectedResult);
        await database.listCommands();

        expect(serviceProvider.runCommandWithCheck).to.have.been.calledWith(
          database._name,
          {
            listCommands: 1,
          }
        );
      });

      it('returns ListCommandsResult', async function () {
        const expectedResult = {
          ok: 1,
          commands: {
            c1: {
              requiresAuth: false,
              secondaryOk: true,
              adminOnly: false,
              help: 'help string',
            },
          },
        };
        serviceProvider.runCommandWithCheck.resolves(expectedResult);
        const result = await database.listCommands();
        expect(result.value).to.deep.equal(expectedResult.commands);
        expect(result.toJSON()).to.deep.equal(expectedResult.commands);
        expect(result.type).to.equal('ListCommandsResult');
      });

      it('throws if serviceProvider.runCommandWithCheck returns undefined', async function () {
        serviceProvider.runCommandWithCheck.resolves(undefined);
        const caughtError = await database.listCommands().catch((e) => e);
        expect(caughtError).to.be.instanceOf(MongoshRuntimeError);
        expect(caughtError.code).to.equal(CommonErrors.CommandFailed);
      });

      it('throws if serviceProvider.runCommandWithCheck rejects', async function () {
        const expectedError = new Error();
        serviceProvider.runCommandWithCheck.rejects(expectedError);
        const caughtError = await database.listCommands().catch((e) => e);
        expect(caughtError).to.equal(expectedError);
      });
    });
    describe('getLastError', function () {
      it('calls serviceProvider.runCommand on the database with options', async function () {
        await database.getLastError(1, 100);
        expect(serviceProvider.runCommand).to.have.been.calledWith(
          database._name,
          {
            getlasterror: 1,
            w: 1,
            wtimeout: 100,
          }
        );
      });

      it('returns whatever serviceProvider.runCommand returns', async function () {
        const expectedResult = { ok: 1, err: 'message' };
        serviceProvider.runCommand.resolves(expectedResult);
        const result = await database.getLastError();
        expect(result).to.deep.equal('message');
      });

      it('returns what serviceProvider.runCommand rejects', async function () {
        const expectedError = { err: 'message' };
        serviceProvider.runCommand.rejects(expectedError);
        const result = await database.getLastError();
        expect(result).to.deep.equal('message');
      });
    });
    describe('getLastErrorObj', function () {
      it('calls serviceProvider.runCommand on the database with options', async function () {
        await database.getLastErrorObj(1, 100, false);

        expect(serviceProvider.runCommand).to.have.been.calledWith(
          database._name,
          {
            getlasterror: 1,
            w: 1,
            wtimeout: 100,
            j: false,
          }
        );
      });

      it('returns whatever serviceProvider.runCommand returns', async function () {
        const expectedResult = { ok: 1 };
        serviceProvider.runCommand.resolves(expectedResult);
        const result = await database.getLastErrorObj();
        expect(result).to.deep.equal(expectedResult);
      });

      it('throws if serviceProvider.runCommand rejects', async function () {
        const expectedError = { err: 'message' };
        serviceProvider.runCommand.rejects(expectedError);
        const result = await database.getLastErrorObj();
        expect(result).to.deep.equal(expectedError);
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
        await database.watch();
        expect(serviceProvider.watch).to.have.been.calledWith(
          [],
          {},
          {},
          database._name
        );
      });
      it('calls serviceProvider.watch when given pipeline arg', async function () {
        const pipeline = [{ $match: { operationType: 'insertOne' } }];
        await database.watch(pipeline);
        expect(serviceProvider.watch).to.have.been.calledWith(
          pipeline,
          {},
          {},
          database._name
        );
      });
      it('calls serviceProvider.watch when given pipeline and ops args', async function () {
        const pipeline = [{ $match: { operationType: 'insertOne' } }];
        const ops = { batchSize: 1 };
        await database.watch(pipeline, ops);
        expect(serviceProvider.watch).to.have.been.calledWith(
          pipeline,
          ops,
          {},
          database._name
        );
      });

      it('returns whatever serviceProvider.watch returns', async function () {
        const result = await database.watch();
        expect(result).to.deep.equal(
          new ChangeStreamCursor(fakeSpCursor, database._name, mongo)
        );
        expect(database._mongo._instanceState.currentCursor).to.equal(result);
      });

      it('throws if serviceProvider.watch throws', async function () {
        const expectedError = new Error();
        serviceProvider.watch.throws(expectedError);
        try {
          await database.watch();
        } catch (e: any) {
          expect(e).to.equal(expectedError);
          return;
        }
        expect.fail('Failed to throw');
      });
    });
    describe('sql', function () {
      it('runs a $sql aggregation', async function () {
        const serviceProviderCursor = stubInterface<ServiceProviderAggCursor>();
        serviceProvider.aggregateDb.returns(serviceProviderCursor as any);
        await database.sql('SELECT * FROM somecollection;', {
          serializeFunctions: true,
        });
        expect(serviceProvider.aggregateDb).to.have.been.calledWith(
          database._name,
          [
            {
              $sql: {
                dialect: 'mongosql',
                format: 'jdbc',
                formatVersion: 1,
                statement: 'SELECT * FROM somecollection;',
              },
            },
          ],
          { serializeFunctions: true }
        );
      });

      it('throws if aggregateDb fails', async function () {
        serviceProvider.aggregateDb.throws(new Error('err'));
        const error: any = await database
          .sql('SELECT * FROM somecollection;')
          .catch((err) => err);
        expect(error.message).to.be.equal('err');
      });

      it('throws if connecting to an unsupported server', async function () {
        const serviceProviderCursor = stubInterface<ServiceProviderAggCursor>();
        serviceProvider.aggregateDb.returns(serviceProviderCursor as any);
        serviceProviderCursor.hasNext.throws(
          Object.assign(new Error(), { code: 40324 })
        );
        const error: any = await database
          .sql('SELECT * FROM somecollection;')
          .catch((err) => err);
        expect(error.message).to.match(
          /db\.sql currently only works when connected to a Data Lake/
        );
      });

      it('forwards other driver errors', async function () {
        const serviceProviderCursor = stubInterface<ServiceProviderAggCursor>();
        serviceProvider.aggregateDb.returns(serviceProviderCursor as any);
        serviceProviderCursor.hasNext.throws(
          Object.assign(new Error('any error'), { code: 12345 })
        );
        const error: any = await database
          .sql('SELECT * FROM somecollection;')
          .catch((err) => err);
        expect(error.message).to.be.equal('any error');
      });

      it('forwards generic cursor errors', async function () {
        const serviceProviderCursor = stubInterface<ServiceProviderAggCursor>();
        serviceProvider.aggregateDb.returns(serviceProviderCursor as any);
        serviceProviderCursor.hasNext.throws(
          Object.assign(new Error('any error'))
        );
        const error: any = await database
          .sql('SELECT * FROM somecollection;')
          .catch((err) => err);
        expect(error.message).to.be.equal('any error');
      });
    });

    describe('checkMetadataConsistency', function () {
      it('calls serviceProvider.runCursorCommand and returns a RunCommandCursor', async function () {
        const providerCursor = stubInterface<ServiceProviderRunCommandCursor>();
        serviceProvider.runCursorCommand.returns(providerCursor);
        const runCommandCursor = await database.checkMetadataConsistency();
        expect(runCommandCursor._cursor).to.equal(providerCursor);
        expect(serviceProvider.runCursorCommand).to.have.been.calledWith(
          'db1',
          { checkMetadataConsistency: 1 },
          {}
        );
      });
    });
  });
  describe('with session', function () {
    let serviceProvider: StubbedInstance<ServiceProvider>;
    let database: Database;
    let internalSession: StubbedInstance<ServiceProviderSession>;
    const exceptions = {
      getCollectionNames: { m: 'listCollections' },
      getCollectionInfos: { m: 'listCollections' },
      currentOp: { m: 'aggregateDb', a: [[]] },
      aggregate: { m: 'aggregateDb', a: [[]] },
      dropDatabase: { m: 'dropDatabase', i: 1 },
      createCollection: { m: 'createCollection', a: ['coll'] },
      createView: { m: 'createCollection', a: ['coll', 'source', []] },
      changeUserPassword: { a: ['username', 'pass'] },
      createUser: { a: [{ user: 'a', pwd: 'p', roles: [] }] },
      updateUser: { a: ['username', { roles: [] }] },
      createRole: { a: [{ role: 'a', privileges: [], roles: [] }] },
      updateRole: { a: ['role', {}] },
      commandHelp: { a: ['ping'] },
      getUser: { a: ['username'] },
      getRole: { a: ['rolename'] },
      dropUser: { a: ['username'] },
      dropRole: { a: ['role'] },
      grantRolesToUser: { a: ['username', []] },
      revokeRolesFromUser: { a: ['username', []] },
      grantRolesToRole: { a: ['rolename', []] },
      revokeRolesFromRole: { a: ['rolename', []] },
      grantPrivilegesToRole: { a: ['rolename', []] },
      revokePrivilegesFromRole: { a: ['rolename', []] },
      setLogLevel: { a: [1] },
      setProfilingLevel: { a: [1] },
      killOp: { a: [1] },
    };
    const ignore = [
      'auth',
      'cloneDatabase',
      'cloneCollection',
      'copyDatabase',
      'getReplicationInfo',
      'setSecondaryOk',
      'createEncryptedCollection',
      'sql',
    ];
    const args = [{}, {}, {}];
    beforeEach(function () {
      const bus = stubInterface<EventEmitter>();
      serviceProvider = stubInterface<ServiceProvider>();
      serviceProvider.initialDb = 'test';
      serviceProvider.bsonLibrary = bson;
      internalSession = stubInterface<ServiceProviderSession>();
      serviceProvider.startSession.returns(internalSession);
      serviceProvider.runCommandWithCheck.resolves({
        ok: 1,
        version: 1,
        bits: 1,
        commands: 1,
        users: [],
        roles: [],
        logComponentVerbosity: 1,
        help: 'blah',
      });
      serviceProvider.runCommand.resolves({ ok: 1 });
      serviceProvider.listCollections.resolves([]);
      serviceProvider.watch.returns({
        closed: false,
        tryNext: async () => {},
      } as any);
      serviceProvider.aggregateDb.returns({ tryNext: async () => {} } as any);
      const instanceState = new ShellInstanceState(serviceProvider, bus);
      const mongo = new Mongo(
        instanceState,
        undefined,
        undefined,
        undefined,
        serviceProvider
      );
      const session = mongo.startSession();
      database = session.getDatabase('db1');
    });
    it('all commands that use runCommandWithCheck', async function () {
      for (const method of (
        Object.getOwnPropertyNames(Database.prototype) as (string &
          keyof Database)[]
      ).filter(
        (k) =>
          typeof k === 'string' &&
          !ignore.includes(k) &&
          !Object.keys(exceptions).includes(k)
      )) {
        if (
          !method.startsWith('_') &&
          !method.startsWith('print') &&
          database[method].returnsPromise
        ) {
          try {
            await database[method](...args);
          } catch (e: any) {
            expect.fail(`${method} failed, error thrown ${e.message}`);
          }
          expect(serviceProvider.runCommandWithCheck.called).to.be.true;
          expect(
            serviceProvider.runCommandWithCheck.getCall(-1).args[2].session
          ).to.equal(internalSession);
        }
      }
    });
    it('all commands that use other methods', async function () {
      for (const method of Object.keys(
        exceptions
      ) as (keyof typeof exceptions)[]) {
        const exception: { a?: any[]; m?: string; i?: number } =
          exceptions[method];
        const customA = exception.a || args;
        const customM = (exception.m ||
          'runCommandWithCheck') as keyof ServiceProvider;
        const customI = exception.i || 2;
        try {
          await (database[method] as any)(...customA);
        } catch (e: any) {
          expect.fail(`${method} failed, error thrown ${e.message}`);
        }
        expect((serviceProvider[customM] as any).called).to.equal(
          true,
          `expecting ${customM} to be called but it was not`
        );
        expect(
          (serviceProvider[customM] as any).getCall(-1).args[customI].session
        ).to.equal(internalSession);
      }
    });
  });
});
