import {
  returnsPromise,
  shellApiClassDefault,
  returnType,
  deprecated,
  apiVersions,
  ShellApiWithMongoClass,
} from './decorators';
import type Mongo from './mongo';
import { CommonErrors, MongoshInvalidInputError } from '@mongosh/errors';
import type {
  Batch,
  Document,
  WriteConcern,
  OrderedBulkOperation,
  UnorderedBulkOperation,
  FindOperators,
  CollationOptions,
} from '@mongosh/service-provider-core';
import { asPrintable } from './enums';
import { assertArgsDefinedType, shallowClone } from './helpers';
import { BulkWriteResult } from './result';
import type { CollectionWithSchema } from './collection';
import type { MQLQuery } from './mql-types';

@shellApiClassDefault
export class BulkFindOp extends ShellApiWithMongoClass {
  _serviceProviderBulkFindOp: FindOperators;
  _parentBulk: Bulk;
  constructor(innerFind: FindOperators, parentBulk: Bulk) {
    super();
    this._serviceProviderBulkFindOp = innerFind;
    this._parentBulk = parentBulk;
  }

  get _mongo(): Mongo {
    return this._parentBulk._mongo;
  }

  [asPrintable](): string {
    return 'BulkFindOp';
  }

  @returnType('BulkFindOp')
  @apiVersions([1])
  collation(spec: CollationOptions): BulkFindOp {
    this._serviceProviderBulkFindOp.collation(spec);
    return this;
  }

  @returnType('BulkFindOp')
  @apiVersions([1])
  arrayFilters(filters: Document[]): BulkFindOp {
    this._serviceProviderBulkFindOp.arrayFilters(filters);
    return this;
  }

  @returnType('BulkFindOp')
  @apiVersions([1])
  hint(hintDoc: Document): BulkFindOp {
    assertArgsDefinedType([hintDoc], [true], 'BulkFindOp.hint');
    this._serviceProviderBulkFindOp.hint(hintDoc);
    return this;
  }

  @returnType('Bulk')
  @apiVersions([1])
  delete(): Bulk {
    this._parentBulk._batchCounts.nRemoveOps++;
    this._serviceProviderBulkFindOp.delete();
    return this._parentBulk;
  }

  @returnType('Bulk')
  @apiVersions([1])
  deleteOne(): Bulk {
    this._parentBulk._batchCounts.nRemoveOps++;
    this._serviceProviderBulkFindOp.deleteOne();
    return this._parentBulk;
  }

  @returnType('Bulk')
  @apiVersions([1])
  @deprecated
  remove(): Bulk {
    return this.delete();
  }

  @returnType('Bulk')
  @apiVersions([1])
  @deprecated
  removeOne(): Bulk {
    return this.deleteOne();
  }

  @returnType('Bulk')
  @apiVersions([1])
  replaceOne(replacement: Document): Bulk {
    this._parentBulk._batchCounts.nUpdateOps++;
    assertArgsDefinedType([replacement], [true], 'BulkFindOp.replacement');
    const op = shallowClone(replacement);
    this._serviceProviderBulkFindOp.replaceOne(op);
    return this._parentBulk;
  }

  @returnType('Bulk')
  @apiVersions([1])
  updateOne(update: Document | Document[]): Bulk {
    this._parentBulk._batchCounts.nUpdateOps++;
    assertArgsDefinedType([update], [true], 'BulkFindOp.update');
    const op = shallowClone(update);
    this._serviceProviderBulkFindOp.updateOne(op);
    return this._parentBulk;
  }

  @returnType('Bulk')
  update(update: Document | Document[]): Bulk {
    this._parentBulk._batchCounts.nUpdateOps++;
    assertArgsDefinedType([update], [true], 'BulkFindOp.update');
    const op = shallowClone(update);
    this._serviceProviderBulkFindOp.update(op);
    return this._parentBulk;
  }

  @returnType('Bulk')
  upsert(): BulkFindOp {
    this._serviceProviderBulkFindOp.upsert();
    return this;
  }
}

@shellApiClassDefault
export default class Bulk extends ShellApiWithMongoClass {
  _mongo: Mongo;
  _collection: CollectionWithSchema;
  _batchCounts: any;
  _executed: boolean;
  _serviceProviderBulkOp: OrderedBulkOperation | UnorderedBulkOperation;
  _ordered: boolean;

  constructor(
    collection: CollectionWithSchema,
    innerBulk: OrderedBulkOperation | UnorderedBulkOperation,
    ordered = false
  ) {
    super();
    this._collection = collection;
    this._mongo = collection._mongo;
    this._serviceProviderBulkOp = innerBulk;
    this._batchCounts = {
      nInsertOps: 0,
      nUpdateOps: 0,
      nRemoveOps: 0,
    };
    this._executed = false;
    this._ordered = ordered;
  }

  /**
   * Internal method to determine what is printed for this class.
   */
  [asPrintable](): any {
    return this.toJSON();
  }

  /**
   * Internal helper for emitting collection API call events.
   *
   * @param methodName
   * @param methodArguments
   * @private
   */
  private _emitBulkApiCall(
    methodName: string,
    methodArguments: Document = {}
  ): void {
    this._mongo._instanceState.emitApiCallWithArgs({
      method: methodName,
      class: 'Bulk',
      db: this._collection._database._name,
      coll: this._collection._name,
      arguments: methodArguments,
    });
  }

  @returnsPromise
  @apiVersions([1])
  async execute(writeConcern?: WriteConcern): Promise<BulkWriteResult> {
    const result = await this._serviceProviderBulkOp.execute();
    this._executed = true;
    this._emitBulkApiCall('execute', { writeConcern: writeConcern });
    return new BulkWriteResult(
      !!result.ok, // acknowledged
      result.insertedCount,
      result.insertedIds,
      result.matchedCount,
      result.modifiedCount,
      result.deletedCount,
      result.upsertedCount,
      result.upsertedIds
    );
  }

  @returnType('BulkFindOp')
  @apiVersions([1])
  find(query: MQLQuery): BulkFindOp {
    assertArgsDefinedType([query], [true], 'Bulk.find');
    return new BulkFindOp(this._serviceProviderBulkOp.find(query), this);
  }

  @returnType('Bulk')
  @apiVersions([1])
  insert(document: Document): Bulk {
    this._batchCounts.nInsertOps++;
    assertArgsDefinedType([document], [true], 'Bulk.insert');
    this._serviceProviderBulkOp.insert(document);
    return this;
  }

  toJSON(): Record<
    'nInsertOps' | 'nUpdateOps' | 'nRemoveOps' | 'nBatches',
    number
  > {
    const batches = this._serviceProviderBulkOp.batches.length;

    return {
      ...this._batchCounts,
      nBatches: batches,
    };
  }

  toString(): string {
    return JSON.stringify(this.toJSON());
  }

  getOperations(): Pick<
    Batch,
    'originalZeroIndex' | 'batchType' | 'operations'
  >[] {
    if (!this._executed) {
      throw new MongoshInvalidInputError(
        'Cannot call getOperations on an unexecuted Bulk operation',
        CommonErrors.InvalidOperation
      );
    }
    return this._serviceProviderBulkOp.batches.map((b) => ({
      originalZeroIndex: b.originalZeroIndex,
      batchType: b.batchType,
      operations: b.operations,
    }));
  }
}
