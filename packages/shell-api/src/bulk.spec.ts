import { expect } from 'chai';
import Bulk, { BulkFindOp } from './bulk';
import { ALL_PLATFORMS, ALL_SERVER_VERSIONS, ALL_TOPOLOGIES, asShellResult } from './enums';
import { signatures } from './decorators';
import sinon, { StubbedInstance, stubInterface } from 'ts-sinon';
import { bson, ServiceProvider } from '@mongosh/service-provider-core';
import { EventEmitter } from 'events';
import ShellInternalState from './shell-internal-state';
import Collection from './collection';
import { BulkWriteResult } from './result';

describe('Bulk API', () => {
  describe('Bulk', () => {
    describe('help', () => {
      const apiClass: any = new Bulk({} as any, {} as any);
      it('calls help function', async() => {
        expect((await apiClass.help()[asShellResult]()).type).to.equal('Help');
        expect((await apiClass.help[asShellResult]()).type).to.equal('Help');
      });
      it('calls help function for methods', async() => {
        expect((await apiClass.execute.help()[asShellResult]()).type).to.equal('Help');
        expect((await apiClass.execute.help[asShellResult]()).type).to.equal('Help');
      });
    });
    describe('signatures', () => {
      it('type', () => {
        expect(signatures.Bulk.type).to.equal('Bulk');
      });
      it('attributes', () => {
        expect(signatures.Bulk.attributes.find).to.deep.equal({
          type: 'function',
          returnsPromise: false,
          returnType: { attributes: {}, type: 'unknown' }, // no async calls, so don't need to track
          platforms: ALL_PLATFORMS,
          topologies: ALL_TOPOLOGIES,
          serverVersions: ALL_SERVER_VERSIONS
        });
      });
      it('hasAsyncChild', () => {
        expect(signatures.Bulk.hasAsyncChild).to.equal(true);
      });
    });
    describe('Metadata', () => {
      describe('asShellResult', () => {
        const mongo = sinon.spy();
        const inner = {
          s: { batches: [1, 2, 3], currentInsertBatch: {} as any }
        } as any;
        const b = new Bulk(mongo, inner);
        it('value', async() => {
          expect((await b[asShellResult]()).value).to.deep.equal({ nInsertOps: 0, nUpdateOps: 0, nRemoveOps: 0, nBatches: 4 });
        });
        it('type', async() => {
          expect((await b[asShellResult]()).type).to.equal('Bulk');
        });
      });
    });
    ['ordered', 'unordered'].forEach((t) => {
      describe(t, () => {
        describe('commands', () => {
          let collection: Collection;
          let serviceProvider: StubbedInstance<ServiceProvider>;
          let bulk: Bulk;
          let bus: StubbedInstance<EventEmitter>;
          let internalState: ShellInternalState;
          let innerStub: StubbedInstance<any>;
          const bulkWriteResult = {
            ok: 1,
            nInserted: 1,
            insertedIds: [ 'oid' ],
            nMatched: 0,
            nModified: 0,
            nRemoved: 0,
            nUpserted: 0,
            upserted: []
          };
          beforeEach(() => {
            bus = stubInterface<EventEmitter>();
            serviceProvider = stubInterface<ServiceProvider>();
            serviceProvider.initialDb = 'db1';
            serviceProvider.bsonLibrary = bson;
            serviceProvider.runCommand.resolves({ ok: 1 });
            internalState = new ShellInternalState(serviceProvider, bus);
            const db = internalState.currentDb;
            collection = new Collection(db._mongo, db, 'coll1');
            innerStub = stubInterface<any>();
            innerStub.s = { batches: [1, 2, 3], currentInsertBatch: 4, currentBatch: 4 };
            bulk = new Bulk(collection, innerStub, t === 'ordered');
          });
          describe('insert', () => {
            it('calls innerBulk.insert and returns self', () => {
              innerStub.insert.returns({ ok: 1 });
              bulk.insert({ insertedDoc: 1 });
              expect(innerStub.insert).to.have.been.calledWith({ insertedDoc: 1 });
              expect(bulk._batchCounts.nInsertOps).to.equal(1);
            });

            it('returns self', () => {
              expect(bulk.insert({})).to.equal(bulk);
            });

            it('throws if innerBulk.insert throws', async() => {
              const expectedError = new Error();
              innerStub.insert.throws(expectedError);
              expect(() => bulk.insert({})).to.throw(expectedError);
            });
          });
          describe('tojson', () => {
            it('returns the batches length + currentInsert/Update/RemoveBatch?', () => {
              expect(bulk.tojson()).to.deep.equal({
                nInsertOps: 0, nUpdateOps: 0, nRemoveOps: 0, nBatches: 4
              });
            });
            it('returns unknown if batches cannot be counted', () => {
              const bulk2 = new Bulk({} as any, { insert: () => {} } as any, t === 'ordered').insert({}).insert({});
              expect(bulk2.tojson()).to.deep.equal({
                nInsertOps: 2, nUpdateOps: 0, nRemoveOps: 0, nBatches: 'unknown'
              });
            });
            it('counts current batches', () => {
              const bulk2 = new Bulk({} as any, {
                insert: () => {},
                s: {
                  batches: [],
                  currentInsertBatch: {} as any,
                  currentUpdateBatch: {} as any,
                  currentRemoveBatch: {} as any,
                  currentBatch: {} as any
                }
              } as any,
              t === 'ordered'
              ).insert({}).insert({});
              expect(bulk2.tojson()).to.deep.equal({
                nInsertOps: 2, nUpdateOps: 0, nRemoveOps: 0, nBatches: t === 'ordered' ? 1 : 3
              });
            });
          });
          describe('find', () => {
            it('calls innerBulk.find', () => {
              innerStub.find.returns({ driverFindOp: 1 });
              bulk.find({ search: 1 });
              expect(innerStub.find).to.have.been.calledWith({ search: 1 });
            });
            it('returns new BulkFindOp with arg', async() => {
              innerStub.find.returns({ driverFindOp: 1 });
              const res = bulk.find({ search: 1 });
              expect((await res[asShellResult]()).type).to.equal('BulkFindOp');
              expect(res._serviceProviderBulkFindOp).to.deep.equal({ driverFindOp: 1 });
            });
            it('throws if innerBulk.find throws', () => {
              const expectedError = new Error();
              innerStub.find.throws(expectedError);
              expect(() => bulk.find({})).to.throw(expectedError);
            });
          });
          describe('execute', async() => {
            it('calls innerBulk.execute', () => {
              innerStub.execute.returns({ result: bulkWriteResult });
              bulk.execute();
              expect(innerStub.execute).to.have.been.calledWith();
            });
            it('returns new BulkWriteResult', async() => {
              innerStub.execute.returns({ result: bulkWriteResult });
              const res = await bulk.execute();
              expect((await res[asShellResult]()).type).to.equal('BulkWriteResult');
              expect(res).to.deep.equal(
                new BulkWriteResult(
                  !!bulkWriteResult.ok, // acknowledged
                  bulkWriteResult.nInserted,
                  bulkWriteResult.insertedIds,
                  bulkWriteResult.nMatched,
                  bulkWriteResult.nModified,
                  bulkWriteResult.nRemoved,
                  bulkWriteResult.nUpserted,
                  bulkWriteResult.upserted
                )
              );
              expect(bulk._executed).to.equal(true);
              expect(bulk._batches).to.deep.equal([1, 2, 3, 4]);
            });
            it('throws if innerBulk.execute rejects', async() => {
              const expectedError = new Error();
              innerStub.execute.rejects(expectedError);
              const catchedError = await bulk.execute()
                .catch(e => e);
              expect(catchedError).to.equal(expectedError);
            });
          });
          describe('getOperations', () => {
            it('returns batches', () => {
              bulk._executed = true;
              bulk._batches = [
                {
                  originalZeroIndex: 1,
                  batchType: 1,
                  operations: [{ 1: 1 }],
                  other: 1
                },
                {
                  originalZeroIndex: 2,
                  batchType: 2,
                  operations: [{ 2: 2 }],
                  other: 2
                }
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
                }
              ]);
            });
          });
        });
      });
    });
  });
  describe('BulkFindOp', () => {
    describe('help', () => {
      const apiClass: any = new BulkFindOp({} as any, {} as any);
      it('calls help function', async() => {
        expect((await apiClass.help()[asShellResult]()).type).to.equal('Help');
        expect((await apiClass.help[asShellResult]()).type).to.equal('Help');
      });
      it('calls help function for methods', async() => {
        expect((await apiClass.remove.help()[asShellResult]()).type).to.equal('Help');
        expect((await apiClass.remove.help[asShellResult]()).type).to.equal('Help');
      });
    });
    describe('signatures', () => {
      it('type', () => {
        expect(signatures.BulkFindOp.type).to.equal('BulkFindOp');
      });
      it('attributes', () => {
        expect(signatures.BulkFindOp.attributes.hint).to.deep.equal({
          type: 'function',
          returnsPromise: false,
          returnType: { attributes: {}, type: 'unknown' }, // no async calls, so don't need to track
          platforms: ALL_PLATFORMS,
          topologies: ALL_TOPOLOGIES,
          serverVersions: ALL_SERVER_VERSIONS
        });
      });
      it('hasAsyncChild', () => {
        expect(signatures.BulkFindOp.hasAsyncChild).to.equal(false);
      });
    });
    describe('Metadata', () => {
      describe('asShellResult', () => {
        const b = new BulkFindOp({} as any, {} as any);
        it('value', async() => {
          expect((await b[asShellResult]()).value).to.deep.equal('BulkFindOp');
        });
        it('type', async() => {
          expect((await b[asShellResult]()).type).to.equal('BulkFindOp');
        });
      });
    });
    describe('commands', () => {
      let bulk: Bulk;
      let innerStub: StubbedInstance<any>;
      let bulkFindOp: BulkFindOp;
      beforeEach(() => {
        innerStub = stubInterface<any>();
        innerStub.s = { batches: [1, 2, 3, 4] };
        bulk = stubInterface<Bulk>();
        bulk._batchCounts = {
          nRemoveOps: 0, nInsertOps: 0, nUpdateOps: 0
        };
        bulkFindOp = new BulkFindOp(innerStub, bulk);
      });
      describe('multiple batches', () => {

      });
      describe('remove', () => {
        it('calls serviceProviderBulkOp.remove and returns parent', () => {
          bulkFindOp.remove();
          expect(innerStub.remove).to.have.been.calledWith();
          expect(bulk._batchCounts.nRemoveOps).to.equal(1);
        });

        it('returns self', () => {
          expect(bulkFindOp.remove()).to.equal(bulk);
        });

        it('throws if serviceProviderBulkOp.remove throws', async() => {
          const expectedError = new Error();
          innerStub.remove.throws(expectedError);
          expect(() => bulkFindOp.remove()).to.throw(expectedError);
        });
      });
      describe('removeOne', () => {
        it('calls serviceProviderBulkOp.removeOne and returns parent', () => {
          bulkFindOp.removeOne();
          expect(innerStub.removeOne).to.have.been.calledWith();
          expect(bulk._batchCounts.nRemoveOps).to.equal(1);
        });

        it('returns self', () => {
          expect(bulkFindOp.removeOne()).to.equal(bulk);
        });

        it('throws if serviceProviderBulkOp.removeOne throws', async() => {
          const expectedError = new Error();
          innerStub.removeOne.throws(expectedError);
          expect(() => bulkFindOp.removeOne()).to.throw(expectedError);
        });
      });
      describe('upsert', () => {
        it('calls serviceProviderBulkOp.upsert and returns parent', () => {
          bulkFindOp.upsert();
          expect(innerStub.upsert).to.have.been.calledWith();
          expect(bulk._batchCounts.nUpdateOps).to.equal(0);
        });

        it('returns self', () => {
          expect(bulkFindOp.upsert()).to.equal(bulkFindOp);
        });

        it('throws if serviceProviderBulkOp.upsert throws', async() => {
          const expectedError = new Error();
          innerStub.upsert.throws(expectedError);
          expect(() => bulkFindOp.upsert()).to.throw(expectedError);
        });
      });
      describe('update', () => {
        it('calls serviceProviderBulkOp.update and returns parent', () => {
          bulkFindOp.update({ updateDoc: 1 });
          expect(innerStub.update).to.have.been.calledWith({ updateDoc: 1 });
          expect(bulk._batchCounts.nUpdateOps).to.equal(1);
        });

        it('calls serviceProviderBulkOp.update and returns parent when hint/arrayFilter set', () => {
          bulkFindOp.hint({ hint: 1 });
          // bulkFindOp.arrayFilters(['filter']);
          bulkFindOp.update({ updateDoc: 1 });
          expect(innerStub.update).to.have.been.calledWith({
            updateDoc: 1,
            hint: { hint: 1 },
            // arrayFilters: [ 'filter' ]
          });
          expect(bulk._batchCounts.nUpdateOps).to.equal(1);
        });

        it('returns self', () => {
          expect(bulkFindOp.update({})).to.equal(bulk);
        });

        it('throws if serviceProviderBulkOp.update throws', async() => {
          const expectedError = new Error();
          innerStub.update.throws(expectedError);
          expect(() => bulkFindOp.update({})).to.throw(expectedError);
        });
      });
      describe('updateOne', () => {
        it('calls serviceProviderBulkOp.updateOne and returns parent', () => {
          bulkFindOp.updateOne({ updateOneDoc: 1 });
          expect(innerStub.updateOne).to.have.been.calledWith({ updateOneDoc: 1 });
          expect(bulk._batchCounts.nUpdateOps).to.equal(1);
        });

        it('calls serviceProviderBulkOp.updateOne and returns parent when hint/arrayFilter set', () => {
          bulkFindOp.hint({ hint: 1 });
          // bulkFindOp.arrayFilters(['filter']);
          bulkFindOp.updateOne({ updateOneDoc: 1 });
          expect(innerStub.updateOne).to.have.been.calledWith({
            updateOneDoc: 1,
            hint: { hint: 1 },
            // arrayFilters: [ 'filter' ]
          });
          expect(bulk._batchCounts.nUpdateOps).to.equal(1);
        });


        it('returns self', () => {
          expect(bulkFindOp.updateOne({})).to.equal(bulk);
        });

        it('throws if serviceProviderBulkOp.updateOne throws', async() => {
          const expectedError = new Error();
          innerStub.updateOne.throws(expectedError);
          expect(() => bulkFindOp.updateOne({})).to.throw(expectedError);
        });
      });
      describe('replaceOne', () => {
        it('calls serviceProviderBulkOp.replaceOne and returns parent', () => {
          bulkFindOp.replaceOne({ replaceOneDoc: 1 });
          expect(innerStub.replaceOne).to.have.been.calledWith({ replaceOneDoc: 1 });
          expect(bulk._batchCounts.nUpdateOps).to.equal(1);
        });

        it('calls serviceProviderBulkOp.replaceOne and returns parent when hint set', () => {
          bulkFindOp.hint({ hint: 1 });
          bulkFindOp.replaceOne({ replaceOneDoc: 1 });
          expect(innerStub.replaceOne).to.have.been.calledWith({
            replaceOneDoc: 1,
            hint: { hint: 1 }
          });
          expect(bulk._batchCounts.nUpdateOps).to.equal(1);
        });

        it('returns self', () => {
          expect(bulkFindOp.replaceOne({})).to.equal(bulk);
        });

        it('throws if serviceProviderBulkOp.replaceOne throws', async() => {
          const expectedError = new Error();
          innerStub.replaceOne.throws(expectedError);
          expect(() => bulkFindOp.replaceOne({})).to.throw(expectedError);
        });
      });
      describe('hint', () => {
        it('sets the attribute and returns self', () => {
          const attr = { hint: 1 };
          expect(bulkFindOp.hint(attr)).to.equal(bulkFindOp);
          expect(bulkFindOp._hint).to.deep.equal(attr);
        });
      });
      // describe('arrayFilters', () => {
      //   it('sets the attribute and returns self', () => {
      //     const attr = [1];
      //     expect(bulkFindOp.arrayFilters(attr)).to.equal(bulkFindOp);
      //     expect(bulkFindOp._arrayFilters).to.deep.equal(attr);
      //   });
      // });
    });
  });
});
