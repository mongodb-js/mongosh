import { expect } from 'chai';
import type { StubbedInstance } from 'ts-sinon';
import sinon from 'sinon';
import { stubInterface } from 'ts-sinon';
import { signatures, toShellResult } from './index';
import ChangeStreamCursor from './change-stream-cursor';
import {
  ADMIN_DB,
  ALL_PLATFORMS,
  ALL_SERVER_VERSIONS,
  ALL_TOPOLOGIES,
  ALL_API_VERSIONS,
} from './enums';
import type { ChangeStream, Document } from '@mongosh/service-provider-core';
import { startTestCluster } from '../../../testing/integration-testing-hooks';
import { NodeDriverServiceProvider } from '../../service-provider-node-driver';
import ShellInstanceState from './shell-instance-state';
import Mongo from './mongo';
import { ensureMaster, ensureResult } from '../test/helpers';
import type { DatabaseWithSchema } from './database';
import type { CollectionWithSchema } from './collection';
import { MongoshUnimplementedError } from '@mongosh/errors';
import { EventEmitter } from 'events';
import { dummyOptions } from './helpers.spec';

describe('ChangeStreamCursor', function () {
  describe('help', function () {
    const apiClass = new ChangeStreamCursor(
      {} as ChangeStream<Document>,
      'source',
      {} as Mongo
    );
    it('calls help function', async function () {
      expect((await toShellResult(apiClass.help())).type).to.equal('Help');
      expect((await toShellResult(apiClass.help)).type).to.equal('Help');
    });
  });
  describe('signature', function () {
    it('signature for class correct', function () {
      expect(signatures.ChangeStreamCursor.type).to.equal('ChangeStreamCursor');
    });
    it('next signature', function () {
      expect(signatures.ChangeStreamCursor.attributes?.next).to.deep.equal({
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
    });
  });
  describe('instance', function () {
    let spCursor: StubbedInstance<ChangeStream<Document>>;
    let cursor: ChangeStreamCursor;
    let warnSpy: sinon.SinonSpy;
    beforeEach(function () {
      spCursor = stubInterface<ChangeStream<Document>>();
      warnSpy = sinon.spy();

      cursor = new ChangeStreamCursor(spCursor, 'source', {
        _instanceState: { printWarning: warnSpy } as any,
      } as Mongo);
    });

    it('sets dynamic properties', async function () {
      expect((await toShellResult(cursor)).type).to.equal('ChangeStreamCursor');
      const result3 = (await toShellResult(cursor)).printable;
      expect(result3).to.equal('ChangeStreamCursor on source');
      expect((await toShellResult(cursor.help)).type).to.equal('Help');
    });

    it('pretty returns the same cursor', function () {
      expect(cursor.pretty()).to.equal(cursor);
    });

    it('calls spCursor.hasNext with arguments', async function () {
      const result = false;
      spCursor.hasNext.resolves(result);
      const actual = await cursor.hasNext();
      expect(actual).to.equal(result);
      expect(spCursor.hasNext.calledWith()).to.equal(true);
      expect(warnSpy.calledOnce).to.equal(true);
    });
    it('calls spCursor.close with arguments', async function () {
      await cursor.close();
      expect(spCursor.close.calledWith()).to.equal(true);
    });
    it('calls spCursor.tryNext with arguments', async function () {
      const result = { doc: 1 };
      const tryNextSpy = sinon.stub();
      tryNextSpy.resolves(result);
      const cursor2 = new ChangeStreamCursor(
        {
          tryNext: tryNextSpy,
        } as any,
        'source',
        {
          _instanceState: { context: { print: warnSpy } },
        } as Mongo
      );
      const actual = await cursor2.tryNext();
      expect(actual).to.equal(result);
      expect(tryNextSpy.calledWith()).to.equal(true);
    });
    it('calls spCursor.next with arguments', async function () {
      const result = { doc: 1 };
      spCursor.next.resolves(result as any);
      const actual = await cursor.next();
      expect(actual).to.equal(result);
      expect(spCursor.next.calledWith()).to.equal(true);
      expect(warnSpy.calledOnce).to.equal(true);
    });
  });
  describe('integration', function () {
    const [srv0] = startTestCluster('change-stream-cursor', {
      topology: 'replset',
    });
    let serviceProvider: NodeDriverServiceProvider;
    let instanceState: ShellInstanceState;
    let mongo: Mongo;
    let db: DatabaseWithSchema;
    let coll: CollectionWithSchema;
    let cursor: ChangeStreamCursor;

    before(async function () {
      this.timeout(100_000);
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
      db = mongo.getDB('testDb');
      coll = db.getCollection('testColl');
    });

    beforeEach(async function () {
      await ensureMaster(mongo.getDB(ADMIN_DB), 1000, await srv0.hostport());
    });

    after(function () {
      return serviceProvider.close();
    });

    describe('collection watch', function () {
      beforeEach(async function () {
        cursor = await coll.watch([{ $match: { operationType: 'insert' } }]);
      });
      it('tryNext returns null when there is nothing', async function () {
        const result = await cursor.tryNext();
        expect(result).to.equal(null);
        await cursor.close();
      });
      it('tryNext returns null when there is nothing matching the pipeline', async function () {
        await coll.deleteMany({});
        const result = await cursor.tryNext();
        expect(result).to.equal(null);
      });
      it('tryNext returns document when there is a doc', async function () {
        await coll.insertOne({ myDoc: 1 });
        const result = await ensureResult(
          100,
          async () => await cursor.tryNext(),
          (t) => t !== null,
          'tryNext to return a document'
        );
        expect(result.operationType).to.equal('insert');
        expect(result.fullDocument.myDoc).to.equal(1);
        await cursor.close();
      });
      it('_it iterates over the cursor', async function () {
        await coll.insertOne({ myDoc: 1 });
        const result = await ensureResult(
          100,
          async () => await cursor._it(),
          (t) => t.documents.length > 0,
          '_it to return a batch'
        );
        expect(result.documents).to.have.lengthOf(1);
        expect(result.documents[0].operationType).to.equal('insert');
        expect(result.documents[0].fullDocument.myDoc).to.equal(1);
        await cursor.close();
      });
      it('async iteration iterates over the cursor', async function () {
        await coll.insertOne({ myDoc: 1 });
        const result = await ensureResult(
          100,
          async () => {
            for await (const doc of cursor) {
              return doc;
            }
            return null;
          },
          (t) => t !== null,
          'async iteration to return a batch'
        );
        expect(result.operationType).to.equal('insert');
        expect(result.fullDocument.myDoc).to.equal(1);
        await cursor.close();
      });
      it('isClosed returns whether the cursor is closed', async function () {
        expect(cursor.isClosed()).to.equal(false);
        await cursor.close();
        expect(cursor.isClosed()).to.equal(true);
      });
      it('getResumeToken returns a resumeToken', function () {
        expect(cursor.getResumeToken()).to.be.an('object');
      });
      it('itcount returns batch size', async function () {
        await coll.insertOne({ myDoc: 1 });
        const result = await ensureResult(
          100,
          async () => await cursor.itcount(),
          (t) => t > 0,
          'itcount to return 1'
        );
        expect(result).to.equal(1);
      });
      it('map() works', async function () {
        cursor.map((doc) => ({ wrapped: doc }));
        await coll.insertOne({ myDoc: 1 });
        const result = await ensureResult(
          100,
          async () => await cursor.tryNext(),
          (doc) => !!doc?.wrapped,
          'tryNext to return a document'
        );
        expect(result.wrapped.fullDocument.myDoc).to.equal(1);
      });
      it('forEach() works', async function () {
        await coll.insertOne({ myDoc: 1 });
        let foundDoc = false;
        await cursor.forEach((doc): boolean | void => {
          if (doc?.fullDocument?.myDoc === 1) {
            foundDoc = true;
            return false;
          }
        });
        expect(foundDoc).to.equal(true);
      });
    });
    describe('database watch', function () {
      beforeEach(async function () {
        cursor = await db.watch([{ $match: { operationType: 'insert' } }]);
      });
      it('tryNext returns null when there is nothing', async function () {
        const result = await cursor.tryNext();
        expect(result).to.equal(null);
        await cursor.close();
      });
      it('tryNext returns null when there is nothing matching the pipeline', async function () {
        await coll.deleteMany({});
        const result = await cursor.tryNext();
        expect(result).to.equal(null);
      });
      it('tryNext returns document when there is a doc', async function () {
        await coll.insertOne({ myDoc: 1 });
        const result = await ensureResult(
          100,
          async () => await cursor.tryNext(),
          (t) => t !== null,
          'tryNext to return a document'
        );
        expect(result.operationType).to.equal('insert');
        expect(result.fullDocument.myDoc).to.equal(1);
        await cursor.close();
      });
      it('itcount returns batch size', async function () {
        await coll.insertOne({ myDoc: 1 });
        const result = await ensureResult(
          100,
          async () => await cursor.itcount(),
          (t) => t > 0,
          'itcount to return 1'
        );
        expect(result).to.equal(1);
      });
      it('can be interrupted when .next() blocks', async function () {
        const nextPromise = cursor.next();
        nextPromise.catch(() => {}); // Suppress UnhandledPromiseRejectionWarning
        await new Promise((resolve) => setTimeout(resolve, 100));
        expect(await instanceState.onInterruptExecution()).to.equal(true);
        expect(await instanceState.onResumeExecution()).to.equal(true);
        try {
          await nextPromise;
          expect.fail('missed exception');
        } catch (err: any) {
          expect(err.name).to.equal('MongoshInterruptedError');
        }
      });
    });
    describe('mongo watch', function () {
      beforeEach(async function () {
        cursor = await mongo.watch([{ $match: { operationType: 'insert' } }]);
      });
      it('tryNext returns null when there is nothing', async function () {
        const result = await cursor.tryNext();
        expect(result).to.equal(null);
        await cursor.close();
      });
      it('tryNext returns null when there is nothing matching the pipeline', async function () {
        await coll.deleteMany({});
        const result = await cursor.tryNext();
        expect(result).to.equal(null);
      });
      it('tryNext returns document when there is a doc', async function () {
        await coll.insertOne({ myDoc: 1 });
        const result = await ensureResult(
          100,
          async () => await cursor.tryNext(),
          (t) => t !== null,
          'tryNext to return a document'
        );
        expect(result.operationType).to.equal('insert');
        expect(result.fullDocument.myDoc).to.equal(1);
        await cursor.close();
      });
      it('itcount returns batch size', async function () {
        await coll.insertOne({ myDoc: 1 });
        const result = await ensureResult(
          1000,
          async () => await cursor.itcount(),
          (t) => t > 0,
          'itcount to return 1'
        );
        expect(result).to.equal(1);
      });
    });
  });
  describe('unsupported methods', function () {
    let cursor: ChangeStreamCursor;
    beforeEach(function () {
      cursor = new ChangeStreamCursor(
        {} as ChangeStream<Document>,
        'source',
        {} as Mongo
      );
    });

    for (const name of ['toArray', 'objsLeftInBatch', 'maxTimeMS'] as const) {
      it(`${name} fails`, function () {
        expect(() => cursor[name]()).to.throw(MongoshUnimplementedError);
      });
    }
    it('isExhausted fails', function () {
      try {
        cursor.isExhausted();
      } catch (err: any) {
        expect(err.name).to.equal('MongoshInvalidInputError');
      }
    });
  });
});
