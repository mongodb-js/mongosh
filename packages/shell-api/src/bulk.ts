import { hasAsyncChild, returnsPromise, ShellApiClass, shellApiClassDefault } from './decorators';
import Mongo from './mongo';
import { MongoshInvalidInputError, MongoshUnimplementedError } from '@mongosh/errors';
import {
  Document,
  WriteConcern
} from '@mongosh/service-provider-core';
import { assertArgsDefined } from './helpers';
import { BulkWriteResult } from './result';

@shellApiClassDefault
export class BulkFindOp {
  _innerFind: any;
  _parentBulk: Bulk;
  _hint: any;
  _arrayFilters: any;
  constructor(innerFind: any, parentBulk: Bulk) {
    this._innerFind = innerFind;
    this._parentBulk = parentBulk;
  }

  _asPrintable(): string {
    return 'BulkFindOp';
  }

  collation(): void {
    throw new MongoshUnimplementedError(
      'collation method on fluent Bulk API is not currently supported. ' +
      'As an alternative, consider using the \'db.collection.bulkWrite(...)\' helper ' +
      'which accepts \'collation\' as a field in the operations.'
    );
  }

  arrayFilters(filters: any[]): BulkFindOp {
    assertArgsDefined(filters);
    this._arrayFilters = filters;
    return this;
  }

  hint(hintDoc: Document): BulkFindOp {
    assertArgsDefined(hintDoc);
    this._hint = hintDoc;
    return this;
  }

  remove(): Bulk {
    this._parentBulk._batchCounts.nRemoveOps++;
    this._innerFind.remove();
    return this._parentBulk;
  }

  removeOne(): Bulk {
    this._parentBulk._batchCounts.nRemoveOps++;
    this._innerFind.removeOne();
    return this._parentBulk;
  }

  replaceOne(replacement: Document): Bulk {
    this._parentBulk._batchCounts.nUpdateOps++;
    assertArgsDefined(replacement);
    const op = { ...replacement };
    if (this._hint) {
      op.hint = this._hint;
    }
    this._innerFind.replaceOne(op);
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
    this._innerFind.updateOne(op);
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
    this._innerFind.update(op);
    return this._parentBulk;
  }

  upsert(): Bulk {
    assertArgsDefined();
    this._innerFind.upsert();
    return this._parentBulk;
  }
}


@shellApiClassDefault
@hasAsyncChild
export default class Bulk extends ShellApiClass {
  _mongo: Mongo;
  _collection: any; // to avoid circular ref
  _batchCounts: any;
  _executed: boolean;
  _batches: any;
  private _innerBulk: any;

  constructor(collection, innerBulk) {
    super();
    this._collection = collection;
    this._mongo = collection._mongo;
    this._innerBulk = innerBulk;
    this._batchCounts = {
      nInsertOps: 0,
      nUpdateOps: 0,
      nRemoveOps: 0
    };
  }

  /**
   * Internal method to determine what is printed for this class.
   */
  _asPrintable(): string {
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
    if (this._executed) {
      throw new MongoshInvalidInputError('A bulk operation cannot be re-executed');
    }
    this._batches = [...this._innerBulk.s.batches];
    this._batches.push(this._innerBulk.s.currentBatch);
    const result = await this._innerBulk.execute();
    this._executed = true;
    this._emitBulkApiCall('execute', { operations: this._batches, writeConcern: writeConcern });
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
    return new BulkFindOp(this._innerBulk.find(query), this);
  }

  insert(document: Document): Bulk {
    this._batchCounts.nInsertOps++;
    assertArgsDefined(document);
    this._innerBulk.insert(document);
    return this;
  }

  tojson(): any {
    const batches = this._innerBulk.s.batches.length + Number(this._innerBulk.s.currentBatch !== null);
    return {
      ...this._batchCounts,
      nBatches: batches
    };
  }

  toString(): any {
    return JSON.stringify(this.tojson());
  }

  getOperations(): any {
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

