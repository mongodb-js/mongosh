import { expect } from 'chai';
import Session from './session';
import type {
  Document,
  ServiceProvider,
  ClientSession as ServiceProviderSession,
} from '@mongosh/service-provider-core';
import { bson } from '@mongosh/service-provider-core';
import type { StubbedInstance } from 'ts-sinon';
import { stubInterface } from 'ts-sinon';
import ShellInstanceState from './shell-instance-state';
import { signatures, toShellResult } from './index';
import Mongo from './mongo';
import {
  ADMIN_DB,
  ALL_PLATFORMS,
  ALL_API_VERSIONS,
  ALL_SERVER_VERSIONS,
  ALL_TOPOLOGIES,
} from './enums';
import { NodeDriverServiceProvider } from '../../service-provider-node-driver';
import {
  startTestCluster,
  skipIfServerVersion,
  skipIfApiStrict,
} from '../../../testing/integration-testing-hooks';
import { ensureMaster, ensureSessionExists } from '../test/helpers';
import { Database } from './database';
import { CommonErrors, MongoshInvalidInputError } from '@mongosh/errors';
import { EventEmitter } from 'events';
import { dummyOptions } from './helpers.spec';

describe('Session', function () {
  describe('help', function () {
    const apiClass = new Session({} as Mongo, {}, {} as ServiceProviderSession);
    it('calls help function', async function () {
      expect((await toShellResult(apiClass.help())).type).to.equal('Help');
      expect((await toShellResult(apiClass.help)).type).to.equal('Help');
    });
  });
  describe('signature', function () {
    it('signature for class correct', function () {
      expect(signatures.Session.type).to.equal('Session');
    });
    it('map signature', function () {
      expect(signatures.Session.attributes?.endSession).to.deep.equal({
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
      });
    });
  });
  describe('instance', function () {
    let serviceProviderSession: StubbedInstance<ServiceProviderSession>;
    let mongo: Mongo;
    let options: Document;
    let session: Session;
    let instanceState: ShellInstanceState;
    let serviceProvider: StubbedInstance<ServiceProvider>;
    beforeEach(function () {
      options = {
        causalConsistency: false,
        readConcern: { level: 'majority' },
        writeConcern: { w: 1, j: false, wtimeout: 0 },
        readPreference: { mode: 'primary', tagSet: [] },
      };
      serviceProviderSession = stubInterface<ServiceProviderSession>();
      (serviceProviderSession as any).id = { id: 1 };
      serviceProvider = stubInterface<ServiceProvider>();
      serviceProvider.initialDb = 'test';
      serviceProvider.bsonLibrary = bson;
      instanceState = new ShellInstanceState(
        serviceProvider,
        new EventEmitter()
      );
      mongo = new Mongo(
        instanceState,
        undefined,
        undefined,
        undefined,
        serviceProvider
      );
      session = new Session(mongo, options, serviceProviderSession);
    });

    it('sets dynamic properties', async function () {
      expect((await toShellResult(session)).type).to.equal('Session');
      expect((await toShellResult(session)).printable).to.deep.equal(
        serviceProviderSession.id
      );
      expect((await toShellResult(session.help)).type).to.equal('Help');
    });
    describe('getDatabase', function () {
      it('works for a regular database', function () {
        const db = session.getDatabase('test');
        expect(db).to.deep.equal(new Database(mongo, 'test', session));
        expect(session.getDatabase('test')).to.equal(db); // reuses db
      });
      it('also affects Database.getSiblingDB', function () {
        const db = session.getDatabase('othername').getSiblingDB('test');
        expect(db).to.deep.equal(new Database(mongo, 'test', session));
        expect(session.getDatabase('test')).to.equal(db); // reuses db
      });
      it('throws for an invalid name', function () {
        try {
          session.getDatabase('');
          expect.fail('expected error');
        } catch (e: any) {
          expect(e).to.be.instanceOf(MongoshInvalidInputError);
          expect(e.code).to.equal(CommonErrors.InvalidArgument);
        }
      });
    });
    it('advanceOperationTime', function () {
      const ts = { ts: 1 } as any;
      session.advanceOperationTime(ts);
      expect(
        serviceProviderSession.advanceOperationTime
      ).to.have.been.calledOnceWith(ts);
    });
    it('advanceClusterTime', function () {
      const ct = { clusterTime: { ts: 1 } } as any;
      session.advanceClusterTime(ct);
      expect(
        serviceProviderSession.advanceClusterTime
      ).to.have.been.calledOnceWith(ct);
    });
    it('endSession', async function () {
      await session.endSession();
      expect(serviceProviderSession.endSession).to.have.been.calledOnceWith();
    });
    it('getClusterTime', function () {
      (serviceProviderSession as any).clusterTime = 100 as any;
      expect(session.getClusterTime()).to.equal(100);
    });
    it('getOperationTime', function () {
      (serviceProviderSession as any).operationTime = 200 as any;
      expect(session.getOperationTime()).to.equal(200);
    });
    it('hasEnded', function () {
      serviceProviderSession.hasEnded = 100 as any; // mystery: testing with false makes this error bc of the spy
      expect(session.hasEnded()).to.equal(100);
    });
    it('startTransaction', function () {
      serviceProviderSession.startTransaction.returns();
      session.startTransaction({ readPreference: options.readPreference });
      expect(
        serviceProviderSession.startTransaction
      ).to.have.been.calledOnceWith({ readPreference: options.readPreference });
    });
    it('commitTransaction', async function () {
      serviceProviderSession.commitTransaction.resolves();
      await session.commitTransaction();
      expect(
        serviceProviderSession.commitTransaction
      ).to.have.been.calledOnceWith();
    });
    it('abortTransaction', async function () {
      serviceProviderSession.abortTransaction.resolves();
      await session.abortTransaction();
      expect(
        serviceProviderSession.abortTransaction
      ).to.have.been.calledOnceWith();
    });
    it('withTransaction', async function () {
      serviceProviderSession.withTransaction.resolves();
      await session.withTransaction(() => {});
      expect(serviceProviderSession.withTransaction).to.have.been.calledOnce;
    });
  });
  describe('integration', function () {
    const [srv0] = startTestCluster('session', { topology: 'replset' });
    let serviceProvider: NodeDriverServiceProvider;
    let instanceState: ShellInstanceState;
    let mongo: Mongo;
    let session: Session;
    let databaseName: string;

    before(function () {
      if (process.platform === 'win32') {
        return this.skip();
      }

      this.timeout(100_000);
    });

    beforeEach(async function () {
      databaseName = `test-${Date.now()}`;
      serviceProvider = await NodeDriverServiceProvider.connect(
        await srv0.connectionString(),
        dummyOptions,
        {},
        new EventEmitter()
      );
      instanceState = new ShellInstanceState(serviceProvider);
      mongo = new Mongo(
        instanceState,
        undefined,
        undefined,
        undefined,
        serviceProvider
      );
      await ensureMaster(mongo.getDB(ADMIN_DB), 1000, await srv0.hostport());
    });

    afterEach(async function () {
      if (session) {
        await session.endSession();
      }

      if (serviceProvider) {
        await serviceProvider.close(true);
      }
    });

    describe('server starts and stops sessions', function () {
      skipIfApiStrict(); // ensureSessionExists needs $listLocalSessions
      it('starts a session', async function () {
        session = mongo.startSession();
        await session
          .getDatabase(databaseName)
          .getCollection('coll')
          .insertOne({});
        await ensureSessionExists(
          mongo,
          1000,
          JSON.stringify(session.id?.id.toUUID())
        );
        expect(session.hasEnded()).to.be.false;
        await session.endSession();
        expect(session.hasEnded()).to.be.true;
        try {
          await session
            .getDatabase(databaseName)
            .getCollection('coll')
            .insertOne({});
        } catch (e: any) {
          return expect(e.message).to.include('expired sessions');
        }
        expect.fail('Error not thrown');
      });
      it('handles multiple sessions', async function () {
        const sessions = [
          mongo.startSession(),
          mongo.startSession(),
          mongo.startSession(),
        ];
        for (const s of sessions) {
          await s.getDatabase(databaseName).getCollection('coll').insertOne({});
          expect(s.hasEnded()).to.be.false;
          await ensureSessionExists(
            mongo,
            1000,
            JSON.stringify(s.id?.id.toUUID())
          );
        }
        for (const s of sessions) {
          await s.endSession();
          expect(s.hasEnded()).to.be.true;
          try {
            await s
              .getDatabase(databaseName)
              .getCollection('coll')
              .insertOne({});
          } catch (e: any) {
            expect(e.message).to.include('expired sessions');
            continue;
          }
          expect.fail('Error not thrown');
        }
      });
      it('errors if session expired', async function () {
        session = mongo.startSession();
        await session.endSession();
        try {
          await session
            .getDatabase(databaseName)
            .getCollection('coll')
            .insertOne({});
        } catch (e: any) {
          return expect(e.message).to.include('expired');
        }
        expect.fail('Error not thrown');
      });
      context('with 5.0+ server', function () {
        skipIfApiStrict();
        skipIfServerVersion(srv0, '< 5.0');
        it('starts a session with snapshot reads if requested', async function () {
          session = mongo.startSession({ snapshot: true });
          await session
            .getDatabase(databaseName)
            .getCollection('coll')
            .findOne({});
          try {
            await session
              .getDatabase(databaseName)
              .getCollection('coll')
              .insertOne({});
            expect.fail('missed exception');
          } catch (e: any) {
            expect(e.message).to.include('snapshot'); // Cannot do writes with snapshot: true
          }
          expect(session._session.snapshotEnabled).to.equal(true);
          await session.endSession();
        });
      });
    });
    describe('transaction methods are called', function () {
      it('cannot call start transaction twice', function () {
        session = mongo.startSession();
        session.startTransaction();
        try {
          session.startTransaction();
        } catch (e: any) {
          return expect(e.message).to.include('in progress');
        }
        expect.fail('Error not thrown');
      });
      it('cannot abort when not started', async function () {
        session = mongo.startSession();
        try {
          await session.abortTransaction();
        } catch (e: any) {
          return expect(e.message).to.include('transaction started');
        }
        expect.fail('Error not thrown');
      });
      it('cannot commit when not started', async function () {
        session = mongo.startSession();
        try {
          await session.commitTransaction();
        } catch (e: any) {
          return expect(e.message).to.include('transaction started');
        }
        expect.fail('Error not thrown');
      });
      it('commits a transaction', async function () {
        const doc = { value: 'test', count: 0 };
        const testColl = mongo.getDB(databaseName).getCollection('coll');
        await testColl.drop();
        await testColl.insertOne(doc);
        expect((await testColl.findOne({ value: 'test' }))?.count).to.equal(0);
        session = mongo.startSession();
        session.startTransaction();
        const sessionColl = session
          .getDatabase(databaseName)
          .getCollection('coll');
        expect(
          (
            await sessionColl.updateOne(
              { value: 'test' },
              { $inc: { count: 1 } }
            )
          ).acknowledged
        ).to.be.true;
        expect((await testColl.findOne({ value: 'test' }))?.count).to.equal(0);
        await session.commitTransaction();
        expect((await testColl.findOne({ value: 'test' }))?.count).to.equal(1);
      });
      it('aborts a transaction', async function () {
        const doc = { value: 'test', count: 0 };
        const testColl = mongo.getDB(databaseName).getCollection('coll');
        await testColl.drop();
        await testColl.insertOne(doc);
        expect((await testColl.findOne({ value: 'test' }))?.count).to.equal(0);
        session = mongo.startSession();
        session.startTransaction();
        const sessionColl = session
          .getDatabase(databaseName)
          .getCollection('coll');
        expect(
          (
            await sessionColl.updateOne(
              { value: 'test' },
              { $inc: { count: 1 } }
            )
          ).acknowledged
        ).to.be.true;
        expect((await testColl.findOne({ value: 'test' }))?.count).to.equal(0);
        await session.abortTransaction();
        expect((await testColl.findOne({ value: 'test' }))?.count).to.equal(0);
      });
      it('can run withTransaction in the success case', async function () {
        const doc = { value: 'test', count: 0 };
        const testColl = mongo.getDB(databaseName).getCollection('coll');
        await testColl.drop();
        await testColl.insertOne(doc);
        expect((await testColl.findOne({ value: 'test' }))?.count).to.equal(0);
        session = mongo.startSession();
        await session.withTransaction(async () => {
          const sessionColl = session
            .getDatabase(databaseName)
            .getCollection('coll');
          expect(
            (
              await sessionColl.updateOne(
                { value: 'test' },
                { $inc: { count: 1 } }
              )
            ).acknowledged
          ).to.be.true;
          expect((await testColl.findOne({ value: 'test' }))?.count).to.equal(
            0
          );
        });
        expect((await testColl.findOne({ value: 'test' }))?.count).to.equal(1);
      });
      it('can run withTransaction in the failure case', async function () {
        const doc = { value: 'test', count: 0 };
        const testColl = mongo.getDB(databaseName).getCollection('coll');
        await testColl.drop();
        await testColl.insertOne(doc);
        expect((await testColl.findOne({ value: 'test' }))?.count).to.equal(0);
        session = mongo.startSession();
        const { err } = await session
          .withTransaction(async () => {
            const sessionColl = session
              .getDatabase(databaseName)
              .getCollection('coll');
            expect(
              (
                await sessionColl.updateOne(
                  { value: 'test' },
                  { $inc: { count: 1 } }
                )
              ).acknowledged
            ).to.be.true;
            expect((await testColl.findOne({ value: 'test' }))?.count).to.equal(
              0
            );
            throw new Error('fails');
          })
          .catch((err) => ({ err }));
        expect(err.message).to.equal('fails');
        expect((await testColl.findOne({ value: 'test' }))?.count).to.equal(0);
      });
    });
    describe('after resetting connection will error with expired session', function () {
      skipIfApiStrict();
      it('reset connection options', async function () {
        session = mongo.startSession();
        await mongo.setReadConcern('majority');
        try {
          await session
            .getDatabase(databaseName)
            .getCollection('coll')
            .insertOne({});
        } catch (e: any) {
          expect(e.message).to.include('expired');
        }
      });
      it('authentication', async function () {
        await mongo
          .getDB(databaseName)
          .createUser({ user: 'anna', pwd: 'pwd', roles: [] });
        session = mongo.startSession();
        await mongo.getDB(databaseName).auth('anna', 'pwd');
        try {
          await session
            .getDatabase(databaseName)
            .getCollection('coll')
            .insertOne({});
        } catch (e: any) {
          await mongo.getDB(databaseName).logout();
          expect(e.message).to.include('expired');
        }
      });
    });
  });
});
