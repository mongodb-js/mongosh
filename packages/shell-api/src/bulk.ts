import { hasAsyncChild, returnsPromise, ShellApiClass, shellApiClassDefault } from './decorators';
import Mongo from './mongo';
import { MongoshInternalError, MongoshInvalidInputError, MongoshUnimplementedError } from '@mongosh/errors';
import {
  Document,
  WriteConcern,
  ServiceProviderBulkOp,
  ServiceProviderBulkFindOp,
  BulkBatch
} from '@mongosh/service-provider-core';
import { assertArgsDefined } from './helpers';
import { BulkWriteResult } from './result';

@shellApiClassDefault
export class BulkFindOp {
  _serviceProviderBulkFindOp: ServiceProviderBulkFindOp;
  _parentBulk: Bulk;
  _hint: Document;
  _arrayFilters: Document[];
  constructor(innerFind: ServiceProviderBulkFindOp, parentBulk: Bulk) {
    this._serviceProviderBulkFindOp = innerFind;
    this._parentBulk = parentBulk;
  }

  _asPrintable(): string {
    return 'BulkFindOp';
  }

  // Blocked by NODE-2757
  collation(): BulkFindOp {
    throw new MongoshUnimplementedError(
      'collation method on fluent Bulk API is not currently supported. ' +
      'As an alternative, consider using the \'db.collection.bulkWrite(...)\' helper ' +
      'which accepts \'collation\' as a field in the operations.'
    );
  }

  // Blocked by NODE-2751
  arrayFilters(): BulkFindOp {
    throw new MongoshUnimplementedError(
      'arrayFilters method on fluent Bulk API is not currently supported.'
    );
  }

  hint(hintDoc: Document): BulkFindOp {
    assertArgsDefined(hintDoc);
    this._hint = hintDoc;
    return this;
  }

  remove(): Bulk {
    this._parentBulk._batchCounts.nRemoveOps++;
    this._serviceProviderBulkFindOp.remove();
    return this._parentBulk;
  }

  removeOne(): Bulk {
    this._parentBulk._batchCounts.nRemoveOps++;
    this._serviceProviderBulkFindOp.removeOne();
    return this._parentBulk;
  }

  replaceOne(replacement: Document): Bulk {
    this._parentBulk._batchCounts.nUpdateOps++;
    assertArgsDefined(replacement);
    const op = { ...replacement };
    if (this._hint) {
      op.hint = this._hint;
    }
    this._serviceProviderBulkFindOp.replaceOne(op);
    return this._parentBulk;
  }

  updateOne(update: Document): Bulk {
    this._parentBulk._batchCounts.nUpdateOps++;
    assertArgsDefined(update);
    const op = { ...update };
    if (this._hint) {
      op.hint = this._hint;
    }
    if (this._arrayFilters) {
      op.arrayFilters = this._arrayFilters;
    }
    this._serviceProviderBulkFindOp.updateOne(op);
    return this._parentBulk;
  }

  update(update: Document): Bulk {
    this._parentBulk._batchCounts.nUpdateOps++;
    assertArgsDefined(update);
    const op = { ...update };
    if (this._hint) {
      op.hint = this._hint;
    }
    if (this._arrayFilters) {
      op.arrayFilters = this._arrayFilters;
    }
    this._serviceProviderBulkFindOp.update(op);
    return this._parentBulk;
  }

  upsert(): BulkFindOp {
    assertArgsDefined();
    this._serviceProviderBulkFindOp.upsert();
    return this;
  }
}


@shellApiClassDefault
@hasAsyncChild
export default class Bulk extends ShellApiClass {
  _mongo: Mongo;
  _collection: any; // to avoid circular ref
  _batchCounts: any;
  _executed: boolean;
  _batches: BulkBatch[];
  _serviceProviderBulkOp: ServiceProviderBulkOp;
  _ordered: boolean;

  constructor(collection: any, innerBulk: ServiceProviderBulkOp, ordered = false) {
    super();
    this._collection = collection;
    this._mongo = collection._mongo;
    this._serviceProviderBulkOp = innerBulk;
    this._batches = [];
    this._batchCounts = {
      nInsertOps: 0,
      nUpdateOps: 0,
      nRemoveOps: 0
    };
    this._executed = false;
    this._ordered = ordered;
  }

  private _checkInternalShape(innerBulkState): boolean {
    return (
      innerBulkState !== undefined &&
      Array.isArray(innerBulkState.batches)
    );
  }

  private _getBatches(): BulkBatch[] {
    const batches = [...this._serviceProviderBulkOp.s.batches];
    if (this._ordered) {
      if (this._serviceProviderBulkOp.s.currentBatch) {
        batches.push(this._serviceProviderBulkOp.s.currentBatch);
      }
      return batches;
    }
    if (this._serviceProviderBulkOp.s.currentInsertBatch) {
      batches.push(this._serviceProviderBulkOp.s.currentInsertBatch);
    }
    if (this._serviceProviderBulkOp.s.currentUpdateBatch) {
      batches.push(this._serviceProviderBulkOp.s.currentUpdateBatch);
    }
    if (this._serviceProviderBulkOp.s.currentRemoveBatch) {
      batches.push(this._serviceProviderBulkOp.s.currentRemoveBatch);
    }
    return batches;
  }

  /**
   * Internal method to determine what is printed for this class.
   */
  _asPrintable(): any {
    return this.tojson();
  }

  /**
   * Internal helper for emitting collection API call events.
   *
   * @param methodName
   * @param methodArguments
   * @private
   */
  private _emitBulkApiCall(methodName: string, methodArguments: Document = {}): void {
    this._mongo._internalState.emitApiCall({
      method: methodName,
      class: 'Bulk',
      db: this._collection._database._name,
      coll: this._collection._name,
      arguments: methodArguments
    });
  }

  @returnsPromise
  async execute(writeConcern?: WriteConcern): Promise<BulkWriteResult> {
    if (!this._executed && this._checkInternalShape(this._serviceProviderBulkOp.s)) {
      this._batches = this._getBatches();
    }
    const result = await this._serviceProviderBulkOp.execute();
    this._executed = true;
    this._emitBulkApiCall('execute', { writeConcern: writeConcern });
    return new BulkWriteResult(
      !!result.result.ok, // acknowledged
      result.result.nInserted,
      result.result.insertedIds,
      result.result.nMatched,
      result.result.nModified,
      result.result.nRemoved,
      result.result.nUpserted,
      result.result.upserted
    );
  }

  find(query: Document): BulkFindOp {
    assertArgsDefined(query);
    return new BulkFindOp(this._serviceProviderBulkOp.find(query), this);
  }

  insert(document: Document): Bulk {
    this._batchCounts.nInsertOps++;
    assertArgsDefined(document);
    this._serviceProviderBulkOp.insert(document);
    return this;
  }

  tojson(): Record<'nInsertOps' | 'nUpdateOps' | 'nRemoveOps' | 'nBatches', number> {
    let batches = -1;
    if (this._checkInternalShape(this._serviceProviderBulkOp.s)) {
      batches = this._getBatches().length;
    }

    return {
      ...this._batchCounts,
      nBatches: batches < 0 ? 'unknown' : batches
    };
  }

  toString(): string {
    return JSON.stringify(this.tojson());
  }

  getOperations(): BulkBatch[] {
    if (!this._checkInternalShape(this._serviceProviderBulkOp.s)) {
      throw new MongoshInternalError('Bulk error: cannot access operation list because internal structure of MongoDB Bulk class has changed.');
    }
    if (!this._executed) {
      throw new MongoshInvalidInputError('Cannot call getOperations on an unexecuted Bulk operation');
    }
    return this._batches.map((b) => ({
      originalZeroIndex: b.originalZeroIndex,
      batchType: b.batchType,
      operations: b.operations
    }));
  }
}

