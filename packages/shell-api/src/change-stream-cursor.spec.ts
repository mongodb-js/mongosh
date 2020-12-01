import { expect } from 'chai';
import sinon, { StubbedInstance, stubInterface } from 'ts-sinon';
import { signatures, toShellResult } from './index';
import ChangeStreamCursor from './change-stream-cursor';
import { ADMIN_DB, ALL_PLATFORMS, ALL_SERVER_VERSIONS, ALL_TOPOLOGIES } from './enums';
import { ChangeStream, ChangeStreamCursor as SPCursor } from '@mongosh/service-provider-core';
import { startTestCluster } from '../../../testing/integration-testing-hooks';
import { CliServiceProvider } from '../../service-provider-server/lib';
import ShellInternalState from './shell-internal-state';
import Mongo from './mongo';
import { ensureMaster, ensureResult } from '../../../testing/helpers';
import Database from './database';
import Collection from './collection';

describe('ChangeStreamCursor', () => {
  describe('help', () => {
    const apiClass = new ChangeStreamCursor({} as ChangeStream, 'source', {} as Mongo);
    it('calls help function', async() => {
      expect((await toShellResult(apiClass.help())).type).to.equal('Help');
      expect((await toShellResult(apiClass.help)).type).to.equal('Help');
    });
  });
  describe('signature', () => {
    it('signature for class correct', () => {
      expect(signatures.ChangeStreamCursor.type).to.equal('ChangeStreamCursor');
      expect(signatures.ChangeStreamCursor.hasAsyncChild).to.equal(true);
    });
    it('next signature', () => {
      expect(signatures.ChangeStreamCursor.attributes.next).to.deep.equal({
        type: 'function',
        returnsPromise: true,
        returnType: { type: 'unknown', attributes: {} },
        platforms: ALL_PLATFORMS,
        topologies: ALL_TOPOLOGIES,
        serverVersions: ALL_SERVER_VERSIONS
      });
    });
  });
  describe('instance', () => {
    let spCursor: StubbedInstance<ChangeStream>;
    let innerCursor: StubbedInstance<SPCursor>;
    let cursor;
    let warnSpy;
    beforeEach(() => {
      innerCursor = stubInterface<SPCursor>();
      spCursor = stubInterface<ChangeStream>();
      spCursor.cursor = innerCursor;
      warnSpy = sinon.spy();

      cursor = new ChangeStreamCursor(spCursor, 'source', {
        _internalState: { context: { print: warnSpy } }
      } as Mongo);
    });

    it('sets dynamic properties', async() => {
      expect((await toShellResult(cursor)).type).to.equal('ChangeStreamCursor');
      const result3 = (await toShellResult(cursor)).printable;
      expect(result3).to.equal('ChangeStreamCursor on source');
      expect((await toShellResult(cursor.help)).type).to.equal('Help');
    });

    it('pretty returns the same cursor', () => {
      expect(cursor.pretty()).to.equal(cursor);
    });

    it('calls spCursor.hasNext with arguments', async() => {
      const result = false;
      spCursor.hasNext.resolves(result);
      const actual = await cursor.hasNext();
      expect(actual).to.equal(result);
      expect(spCursor.hasNext.calledWith()).to.equal(true);
      expect(warnSpy.calledOnce).to.equal(true);
    });
    it('calls spCursor.close with arguments', async() => {
      await cursor.close();
      expect(spCursor.close.calledWith()).to.equal(true);
    });
    it('calls spCursor.cursor.tryNext with arguments', async() => {
      const result = { doc: 1 };
      innerCursor.tryNext.resolves(result);
      const actual = await cursor.tryNext();
      expect(actual).to.equal(result);
      expect(innerCursor.tryNext.calledWith()).to.equal(true);
    });
    it('calls spCursor.next with arguments', async() => {
      const result = { doc: 1 };
      spCursor.next.resolves(result);
      const actual = await cursor.next();
      expect(actual).to.equal(result);
      expect(spCursor.next.calledWith()).to.equal(true);
      expect(warnSpy.calledOnce).to.equal(true);
    });
  });
  describe('integration', () => {
    const [ srv0 ] = startTestCluster(['--replicaset'] );
    let serviceProvider: CliServiceProvider;
    let internalState: ShellInternalState;
    let mongo: Mongo;
    let db: Database;
    let coll: Collection;
    let cursor: ChangeStreamCursor;

    before(async function() {
      this.timeout(100_000);
      serviceProvider = await CliServiceProvider.connect(await srv0.connectionString());
      internalState = new ShellInternalState(serviceProvider);
      mongo = new Mongo(internalState);
      db = mongo.getDB('testDb');
      coll = db.getCollection('testColl');
    });

    beforeEach(async() => {
      await ensureMaster(mongo.getDB(ADMIN_DB), 1000, await srv0.hostport());
    });

    after(() => {
      return serviceProvider.close(true);
    });

    describe('collection watch', () => {
      beforeEach(async() => {
        cursor = coll.watch([{ '$match': { 'operationType': 'insert' } }]);
        await cursor.tryNext(); // first one always fails?
      });
      it('tryNext returns null when there is nothing', async() => {
        const result = await cursor.tryNext();
        expect(result).to.equal(null);
        await cursor.close();
      });
      it('tryNext returns null when there is nothing matching the pipeline', async() => {
        await coll.deleteMany({});
        const result = await cursor.tryNext();
        expect(result).to.equal(null);
      });
      it('tryNext returns document when there is a doc', async() => {
        await coll.insertOne({ myDoc: 1 });
        const result = await ensureResult(
          1000,
          async() => await cursor.tryNext(),
          (t) => (t !== null),
          'tryNext to return a document');
        expect(result.operationType).to.equal('insert');
        expect(result.fullDocument.myDoc).to.equal(1);
        await cursor.close();
      });
      it('itcount returns batch size', async() => {
        await coll.insertOne({ myDoc: 1 });
        const result = await ensureResult(
          1000,
          async() => await cursor.itcount(),
          (t) => t > 0,
          'itcount to return 1');
        expect(result).to.equal(1);
      });
    });
    describe('database watch', () => {
      beforeEach(async() => {
        cursor = db.watch([{ '$match': { 'operationType': 'insert' } }]);
        await cursor.tryNext(); // first one always fails?
      });
      it('tryNext returns null when there is nothing', async() => {
        const result = await cursor.tryNext();
        expect(result).to.equal(null);
        await cursor.close();
      });
      it('tryNext returns null when there is nothing matching the pipeline', async() => {
        await coll.deleteMany({});
        const result = await cursor.tryNext();
        expect(result).to.equal(null);
      });
      it('tryNext returns document when there is a doc', async() => {
        await coll.insertOne({ myDoc: 1 });
        const result = await ensureResult(
          1000,
          async() => await cursor.tryNext(),
          (t) => (t !== null),
          'tryNext to return a document');
        expect(result.operationType).to.equal('insert');
        expect(result.fullDocument.myDoc).to.equal(1);
        await cursor.close();
      });
      it('itcount returns batch size', async() => {
        await coll.insertOne({ myDoc: 1 });
        const result = await ensureResult(
          1000,
          async() => await cursor.itcount(),
          (t) => t > 0,
          'itcount to return 1');
        expect(result).to.equal(1);
      });
    });
    describe('mongo watch', () => {
      beforeEach(async() => {
        cursor = mongo.watch([{ '$match': { 'operationType': 'insert' } }]);
        await cursor.tryNext(); // first one always fails?
      });
      it('tryNext returns null when there is nothing', async() => {
        const result = await cursor.tryNext();
        expect(result).to.equal(null);
        await cursor.close();
      });
      it('tryNext returns null when there is nothing matching the pipeline', async() => {
        await coll.deleteMany({});
        const result = await cursor.tryNext();
        expect(result).to.equal(null);
      });
      it('tryNext returns document when there is a doc', async() => {
        await coll.insertOne({ myDoc: 1 });
        const result = await ensureResult(
          1000,
          async() => await cursor.tryNext(),
          (t) => (t !== null),
          'tryNext to return a document');
        expect(result.operationType).to.equal('insert');
        expect(result.fullDocument.myDoc).to.equal(1);
        await cursor.close();
      });
      it('itcount returns batch size', async() => {
        await coll.insertOne({ myDoc: 1 });
        const result = await ensureResult(
          1000,
          async() => await cursor.itcount(),
          (t) => t > 0,
          'itcount to return 1');
        expect(result).to.equal(1);
      });
    });
  });
});
