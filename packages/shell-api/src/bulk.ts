import { hasAsyncChild, returnsPromise, ShellApiClass, shellApiClassDefault } from './decorators';
import Mongo from './mongo';
import { CommonErrors, MongoshInvalidInputError, MongoshUnimplementedError } from '@mongosh/errors';
import {
  Batch,
  Document,
  WriteConcern,
  OrderedBulkOperation,
  UnorderedBulkOperation,
  FindOperators
} from '@mongosh/service-provider-core';
import { asPrintable } from './enums';
import { blockedByDriverMetadata } from './error-codes';
import { assertArgsDefined } from './helpers';
import { BulkWriteResult } from './result';

@shellApiClassDefault
export class BulkFindOp extends ShellApiClass {
  _serviceProviderBulkFindOp: FindOperators;
  _parentBulk: Bulk;
  _hint: Document | undefined;
  _arrayFilters: Document[] | undefined;
  constructor(innerFind: FindOperators, parentBulk: Bulk) {
    super();
    this._serviceProviderBulkFindOp = innerFind;
    this._parentBulk = parentBulk;
  }

  [asPrintable](): string {
    return 'BulkFindOp';
  }

  // Blocked by NODE-2757, bulk collation
  collation(): BulkFindOp {
    throw new MongoshUnimplementedError(
      'collation method on fluent Bulk API is not currently supported. ' +
      'As an alternative, consider using the \'db.collection.bulkWrite(...)\' helper ' +
      'which accepts \'collation\' as a field in the operations.',
      CommonErrors.NotImplemented,
      blockedByDriverMetadata('BulkFindOp.arrayFilters')
    );
  }

  // Blocked by NODE-2751, bulk arrayFilters
  arrayFilters(): BulkFindOp {
    throw new MongoshUnimplementedError(
      'arrayFilters method on fluent Bulk API is not currently supported.',
      CommonErrors.NotImplemented,
      blockedByDriverMetadata('BulkFindOp.arrayFilters')
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
  _serviceProviderBulkOp: OrderedBulkOperation | UnorderedBulkOperation;
  _ordered: boolean;

  constructor(collection: any, innerBulk: OrderedBulkOperation | UnorderedBulkOperation, ordered = false) {
    super();
    this._collection = collection;
    this._mongo = collection._mongo;
    this._serviceProviderBulkOp = innerBulk;
    this._batchCounts = {
      nInsertOps: 0,
      nUpdateOps: 0,
      nRemoveOps: 0
    };
    this._executed = false;
    this._ordered = ordered;
  }

  /**
   * Internal method to determine what is printed for this class.
   */
  [asPrintable](): any {
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
    const { result } = await this._serviceProviderBulkOp.execute() as any;
    this._executed = true;
    this._emitBulkApiCall('execute', { writeConcern: writeConcern });
    return new BulkWriteResult(
      !!result.ok, // acknowledged
      result.nInserted,
      result.insertedIds,
      result.nMatched,
      result.nModified,
      result.nRemoved,
      result.nUpserted,
      result.upserted
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
    const batches = this._serviceProviderBulkOp.batches.length;

    return {
      ...this._batchCounts,
      nBatches: batches < 0 ? 'unknown' : batches
    };
  }

  toString(): string {
    return JSON.stringify(this.tojson());
  }

  getOperations(): Pick<Batch, 'originalZeroIndex' | 'batchType' | 'operations'>[] {
    if (!this._executed) {
      throw new MongoshInvalidInputError(
        'Cannot call getOperations on an unexecuted Bulk operation',
        CommonErrors.InvalidOperation
      );
    }
    return this._serviceProviderBulkOp.batches.map((b) => ({
      originalZeroIndex: b.originalZeroIndex,
      batchType: b.batchType,
      operations: b.operations
    }));
  }
}

