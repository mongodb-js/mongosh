import { CommonErrors } from '@mongosh/errors';
import type {
  ServiceProvider,
  BulkWriteResult as SPBulkWriteResult,
} from '@mongosh/service-provider-core';
import { bson } from '@mongosh/service-provider-core';
import { fail } from 'assert';
import chai, { expect } from 'chai';
import sinonChai from 'sinon-chai';
import type { EventEmitter } from 'events';
import type { StubbedInstance } from 'ts-sinon';
import { stubInterface } from 'ts-sinon';
import Bulk, { BulkFindOp } from './bulk';
import Collection from './collection';
import { ALL_PLATFORMS, ALL_SERVER_VERSIONS, ALL_TOPOLOGIES } from './enums';
import { signatures, toShellResult } from './index';
import { BulkWriteResult } from './result';
import ShellInstanceState from './shell-instance-state';
chai.use(sinonChai);

describe('Bulk API', function () {
  describe('Bulk', function () {
    describe('help', function () {
      const apiClass: any = new Bulk({} as any, {} as any);
      it('calls help function', async function () {
        expect((await toShellResult(apiClass.help())).type).to.equal('Help');
        expect((await toShellResult(apiClass.help)).type).to.equal('Help');
      });
      it('calls help function for methods', async function () {
        expect((await toShellResult(apiClass.execute.help())).type).to.equal(
          'Help'
        );
        expect((await toShellResult(apiClass.execute.help)).type).to.equal(
          'Help'
        );
      });
    });
    describe('signatures', function () {
      it('type', function () {
        expect(signatures.Bulk.type).to.equal('Bulk');
      });
      it('attributes', function () {
        expect(signatures.Bulk.attributes?.find).to.deep.equal({
          type: 'function',
          returnsPromise: false,
          deprecated: false,
          returnType: 'BulkFindOp',
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
      describe('toShellResult', function () {
        const collection = stubInterface<Collection>();
        const b = new Bulk(collection, {
          batches: [1, 2, 3, 4],
        } as any);
        it('value', async function () {
          expect((await toShellResult(b)).printable).to.deep.equal({
            nInsertOps: 0,
            nUpdateOps: 0,
            nRemoveOps: 0,
            nBatches: 4,
          });
        });
        it('type', async function () {
          expect((await toShellResult(b)).type).to.equal('Bulk');
        });
      });
    });
    ['ordered', 'unordered'].forEach((t) => {
      describe(t, function () {
        describe('commands', function () {
          let collection: Collection;
          let serviceProvider: StubbedInstance<ServiceProvider>;
          let bulk: Bulk;
          let bus: StubbedInstance<EventEmitter>;
          let instanceState: ShellInstanceState;
          let innerStub: StubbedInstance<any>;
          const bulkWriteResult = {
            ok: 1,
            insertedCount: 1,
            insertedIds: { 0: new bson.ObjectId() },
            matchedCount: 0,
            modifiedCount: 0,
            deletedCount: 0,
            upsertedCount: 0,
            upsertedIds: { 0: new bson.ObjectId() },
          } satisfies Partial<SPBulkWriteResult>;
          beforeEach(function () {
            bus = stubInterface<EventEmitter>();
            serviceProvider = stubInterface<ServiceProvider>();
            serviceProvider.initialDb = 'db1';
            serviceProvider.bsonLibrary = bson;
            serviceProvider.runCommand.resolves({ ok: 1 });
            instanceState = new ShellInstanceState(serviceProvider, bus);
            const db = instanceState.currentDb;
            collection = new Collection(db._mongo, db, 'coll1');
            innerStub = stubInterface<any>();
            innerStub.batches = [
              { originalZeroIndex: 0 },
              { originalZeroIndex: 0 },
              { originalZeroIndex: 0 },
              { originalZeroIndex: 0 },
            ];
            bulk = new Bulk(collection, innerStub, t === 'ordered');
          });
          describe('insert', function () {
            it('calls innerBulk.insert and returns self', function () {
              innerStub.insert.returns({ ok: 1 });
              bulk.insert({ insertedDoc: 1 });
              expect(innerStub.insert).to.have.been.calledWith({
                insertedDoc: 1,
              });
              expect(bulk._batchCounts.nInsertOps).to.equal(1);
            });

            it('returns self', function () {
              expect(bulk.insert({})).to.equal(bulk);
            });

            it('throws if innerBulk.insert throws', function () {
              const expectedError = new Error();
              innerStub.insert.throws(expectedError);
              expect(() => bulk.insert({})).to.throw(expectedError);
            });
          });
          describe('toJSON', function () {
            it('returns the batches length + currentInsert/Update/RemoveBatch?', function () {
              expect(bulk.toJSON()).to.deep.equal({
                nInsertOps: 0,
                nUpdateOps: 0,
                nRemoveOps: 0,
                nBatches: 4,
              });
            });
          });
          describe('find', function () {
            it('calls innerBulk.find', function () {
              innerStub.find.returns({ driverFindOp: 1 });
              bulk.find({ search: 1 });
              expect(innerStub.find).to.have.been.calledWith({ search: 1 });
            });
            it('returns new BulkFindOp with arg', async function () {
              innerStub.find.returns({ driverFindOp: 1 });
              const res = bulk.find({ search: 1 });
              expect((await toShellResult(res)).type).to.equal('BulkFindOp');
              expect(res._serviceProviderBulkFindOp).to.deep.equal({
                driverFindOp: 1,
              });
            });
            it('throws if innerBulk.find throws', function () {
              const expectedError = new Error();
              innerStub.find.throws(expectedError);
              expect(() => bulk.find({})).to.throw(expectedError);
            });
          });
          describe('execute', function () {
            it('calls innerBulk.execute', async function () {
              innerStub.execute.returns(bulkWriteResult);
              await bulk.execute();
              expect(innerStub.execute).to.have.been.calledWith();
            });
            it('returns new BulkWriteResult', async function () {
              innerStub.execute.returns(bulkWriteResult);
              const res = await bulk.execute();
              expect((await toShellResult(res)).type).to.equal(
                'BulkWriteResult'
              );
              expect(res).to.deep.equal(
                new BulkWriteResult(
                  !!bulkWriteResult.ok, // acknowledged
                  bulkWriteResult.insertedCount,
                  bulkWriteResult.insertedIds,
                  bulkWriteResult.matchedCount,
                  bulkWriteResult.modifiedCount,
                  bulkWriteResult.deletedCount,
                  bulkWriteResult.upsertedCount,
                  bulkWriteResult.upsertedIds
                )
              );
              expect(bulk._executed).to.equal(true);
            });
            it('throws if innerBulk.execute rejects', async function () {
              const expectedError = new Error();
              innerStub.execute.rejects(expectedError);
              const caughtError = await bulk.execute().catch((e) => e);
              expect(caughtError).to.equal(expectedError);
            });
          });
          describe('getOperations', function () {
            it('returns batches', function () {
              bulk._executed = true;
              (bulk._serviceProviderBulkOp as any).batches = [
                {
                  originalZeroIndex: 1,
                  batchType: 1,
                  operations: [{ 1: 1 }],
                  other: 1,
                },
                {
                  originalZeroIndex: 2,
                  batchType: 2,
                  operations: [{ 2: 2 }],
                  other: 2,
                },
              ];
              expect(bulk.getOperations()).to.deep.equal([
                {
                  originalZeroIndex: 1,
                  batchType: 1,
                  operations: [{ 1: 1 }],
                },
                {
                  originalZeroIndex: 2,
                  batchType: 2,
                  operations: [{ 2: 2 }],
                },
              ]);
            });
            it('throws before executed', function () {
              bulk._executed = false;
              try {
                bulk.getOperations();
                fail('expected error');
              } catch (e: any) {
                expect(e.name).to.equal('MongoshInvalidInputError');
                expect(e.code).to.equal(CommonErrors.InvalidOperation);
              }
            });
          });
        });
      });
    });
  });
  describe('BulkFindOp', function () {
    describe('help', function () {
      const apiClass: any = new BulkFindOp({} as any, {} as any);
      it('calls help function', async function () {
        expect((await toShellResult(apiClass.help())).type).to.equal('Help');
        expect((await toShellResult(apiClass.help)).type).to.equal('Help');
      });
      it('calls help function for methods', async function () {
        expect((await toShellResult(apiClass.remove.help())).type).to.equal(
          'Help'
        );
        expect((await toShellResult(apiClass.remove.help)).type).to.equal(
          'Help'
        );
      });
    });
    describe('signatures', function () {
      it('type', function () {
        expect(signatures.BulkFindOp.type).to.equal('BulkFindOp');
      });
      it('attributes', function () {
        expect(signatures.BulkFindOp.attributes?.hint).to.deep.equal({
          type: 'function',
          returnsPromise: false,
          deprecated: false,
          returnType: 'BulkFindOp',
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
      describe('toShellResult', function () {
        const b = new BulkFindOp({} as any, {} as any);
        it('value', async function () {
          expect((await toShellResult(b)).printable).to.deep.equal(
            'BulkFindOp'
          );
        });
        it('type', async function () {
          expect((await toShellResult(b)).type).to.equal('BulkFindOp');
        });
      });
    });
    describe('commands', function () {
      let bulk: Bulk;
      let innerStub: StubbedInstance<any>;
      let bulkFindOp: BulkFindOp;
      beforeEach(function () {
        innerStub = stubInterface<any>();
        innerStub.batches = [{ originalZeroIndex: 0 }];
        bulk = stubInterface<Bulk>();
        bulk._batchCounts = {
          nRemoveOps: 0,
          nInsertOps: 0,
          nUpdateOps: 0,
        };
        bulkFindOp = new BulkFindOp(innerStub, bulk);
      });
      describe('multiple batches', function () {});
      describe('remove', function () {
        it('calls serviceProviderBulkOp.delete and returns parent', function () {
          bulkFindOp.remove();
          expect(innerStub.delete).to.have.been.calledWith();
          expect(bulk._batchCounts.nRemoveOps).to.equal(1);
        });

        it('returns self', function () {
          expect(bulkFindOp.remove()).to.equal(bulk);
        });

        it('throws if serviceProviderBulkOp.delete throws', function () {
          const expectedError = new Error();
          innerStub.delete.throws(expectedError);
          expect(() => bulkFindOp.remove()).to.throw(expectedError);
        });
      });
      describe('removeOne', function () {
        it('calls serviceProviderBulkOp.deleteOne and returns parent', function () {
          bulkFindOp.removeOne();
          expect(innerStub.deleteOne).to.have.been.calledWith();
          expect(bulk._batchCounts.nRemoveOps).to.equal(1);
        });

        it('returns self', function () {
          expect(bulkFindOp.deleteOne()).to.equal(bulk);
        });

        it('throws if serviceProviderBulkOp.deleteOne throws', function () {
          const expectedError = new Error();
          innerStub.deleteOne.throws(expectedError);
          expect(() => bulkFindOp.removeOne()).to.throw(expectedError);
        });
      });
      describe('delete', function () {
        it('calls serviceProviderBulkOp.delete and returns parent', function () {
          bulkFindOp.delete();
          expect(innerStub.delete).to.have.been.calledWith();
          expect(bulk._batchCounts.nRemoveOps).to.equal(1);
        });

        it('returns self', function () {
          expect(bulkFindOp.delete()).to.equal(bulk);
        });

        it('throws if serviceProviderBulkOp.delete throws', function () {
          const expectedError = new Error();
          innerStub.delete.throws(expectedError);
          expect(() => bulkFindOp.delete()).to.throw(expectedError);
        });
      });
      describe('deleteOne', function () {
        it('calls serviceProviderBulkOp.deleteOne and returns parent', function () {
          bulkFindOp.deleteOne();
          expect(innerStub.deleteOne).to.have.been.calledWith();
          expect(bulk._batchCounts.nRemoveOps).to.equal(1);
        });

        it('returns self', function () {
          expect(bulkFindOp.deleteOne()).to.equal(bulk);
        });

        it('throws if serviceProviderBulkOp.deleteOne throws', function () {
          const expectedError = new Error();
          innerStub.deleteOne.throws(expectedError);
          expect(() => bulkFindOp.deleteOne()).to.throw(expectedError);
        });
      });
      describe('upsert', function () {
        it('calls serviceProviderBulkOp.upsert and returns parent', function () {
          bulkFindOp.upsert();
          expect(innerStub.upsert).to.have.been.calledWith();
          expect(bulk._batchCounts.nUpdateOps).to.equal(0);
        });

        it('returns self', function () {
          expect(bulkFindOp.upsert()).to.equal(bulkFindOp);
        });

        it('throws if serviceProviderBulkOp.upsert throws', function () {
          const expectedError = new Error();
          innerStub.upsert.throws(expectedError);
          expect(() => bulkFindOp.upsert()).to.throw(expectedError);
        });
      });
      describe('update', function () {
        it('calls serviceProviderBulkOp.update and returns parent', function () {
          bulkFindOp.update({ updateDoc: 1 });
          expect(innerStub.update).to.have.been.calledWith({ updateDoc: 1 });
          expect(bulk._batchCounts.nUpdateOps).to.equal(1);
        });

        it('calls serviceProviderBulkOp.update and returns parent when hint/arrayFilter set', function () {
          bulkFindOp.hint({ hint: 1 });
          bulkFindOp.arrayFilters([{ x: 1 }]);
          bulkFindOp.update({ updateDoc: 1 });
          expect(innerStub.update).to.have.been.calledWith({
            updateDoc: 1,
          });
          expect(bulk._batchCounts.nUpdateOps).to.equal(1);
        });

        it('returns self', function () {
          expect(bulkFindOp.update({})).to.equal(bulk);
        });

        it('throws if serviceProviderBulkOp.update throws', function () {
          const expectedError = new Error();
          innerStub.update.throws(expectedError);
          expect(() => bulkFindOp.update({})).to.throw(expectedError);
        });
      });
      describe('updateOne', function () {
        it('calls serviceProviderBulkOp.updateOne and returns parent', function () {
          bulkFindOp.updateOne({ $inc: { x: 1 } });
          expect(innerStub.updateOne).to.have.been.calledWith({
            $inc: { x: 1 },
          });
          expect(bulk._batchCounts.nUpdateOps).to.equal(1);
        });

        it('calls serviceProviderBulkOp.updateOne and returns parent when hint/arrayFilter set', function () {
          bulkFindOp.hint({ hint: 1 });
          bulkFindOp.arrayFilters([{ x: 1 }]);
          bulkFindOp.updateOne({ updateOneDoc: 1 });
          expect(innerStub.updateOne).to.have.been.calledWith({
            updateOneDoc: 1,
          });
          expect(bulk._batchCounts.nUpdateOps).to.equal(1);
        });

        it('returns self', function () {
          expect(bulkFindOp.updateOne({})).to.equal(bulk);
        });

        it('throws if serviceProviderBulkOp.updateOne throws', function () {
          const expectedError = new Error();
          innerStub.updateOne.throws(expectedError);
          expect(() => bulkFindOp.updateOne({})).to.throw(expectedError);
        });
      });
      describe('replaceOne', function () {
        it('calls serviceProviderBulkOp.replaceOne and returns parent', function () {
          bulkFindOp.replaceOne({ replaceOneDoc: 1 });
          expect(innerStub.replaceOne).to.have.been.calledWith({
            replaceOneDoc: 1,
          });
          expect(bulk._batchCounts.nUpdateOps).to.equal(1);
        });

        it('calls serviceProviderBulkOp.replaceOne and returns parent when hint set', function () {
          bulkFindOp.hint({ hint: 1 });
          bulkFindOp.replaceOne({ replaceOneDoc: 1 });
          expect(innerStub.replaceOne).to.have.been.calledWith({
            replaceOneDoc: 1,
          });
          expect(bulk._batchCounts.nUpdateOps).to.equal(1);
        });

        it('returns self', function () {
          expect(bulkFindOp.replaceOne({})).to.equal(bulk);
        });

        it('throws if serviceProviderBulkOp.replaceOne throws', function () {
          const expectedError = new Error();
          innerStub.replaceOne.throws(expectedError);
          expect(() => bulkFindOp.replaceOne({})).to.throw(expectedError);
        });
      });
      describe('hint', function () {
        it('sets the attribute and returns self', function () {
          const attr = { hint: 1 };
          expect(bulkFindOp.hint(attr)).to.equal(bulkFindOp);
          expect(innerStub.hint).to.have.been.calledWith(attr);
        });
      });
      describe('arrayFilters', function () {
        it('sets the attribute and returns self', function () {
          const attr = [{}];
          expect(bulkFindOp.arrayFilters(attr)).to.equal(bulkFindOp);
          expect(innerStub.arrayFilters).to.have.been.calledWith(attr);
        });
      });
      describe('collation', function () {
        it('sets the collation and returns self', function () {
          const coll = { locale: 'fa', strength: 2 } as any;
          expect(bulkFindOp.collation(coll)).to.equal(bulkFindOp);
          expect(innerStub.collation).to.have.been.calledWith(coll);
        });
      });
    });
  });
});
