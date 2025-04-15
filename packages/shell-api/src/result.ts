import { shellApiClassDefault, ShellApiValueClass } from './decorators';
import { shellApiType, asPrintable } from './enums';
import type { Document, ObjectIdType } from '@mongosh/service-provider-core';

@shellApiClassDefault
export class CommandResult<T = unknown> extends ShellApiValueClass {
  value: T;
  type: string;
  constructor(type: string, value: T) {
    super();
    this.type = type;
    this.value = value;
    this[shellApiType] = type;
  }

  /**
   * Internal method to determine what is printed for this class.
   */
  [asPrintable](): T {
    return this.value;
  }

  toJSON(): T {
    return this.value;
  }
}

export type ClientInsertResult = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  insertedId: any;
};

export type ClientUpdateResult = {
  matchedCount: number;
  modifiedCount: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  upsertedId?: any;
  didUpsert: boolean;
};

export type ClientDeleteResult = {
  deletedCount: number;
};

@shellApiClassDefault
export class ClientBulkWriteResult extends ShellApiValueClass {
  acknowledged: boolean;
  insertedCount: number;
  matchedCount: number;
  modifiedCount: number;
  deletedCount: number;
  upsertedCount: number;
  insertResults?: ReadonlyMap<number, ClientInsertResult>;
  updateResults?: ReadonlyMap<number, ClientUpdateResult>;
  deleteResults?: ReadonlyMap<number, ClientDeleteResult>;

  constructor({
    acknowledged,
    insertedCount,
    matchedCount,
    modifiedCount,
    deletedCount,
    upsertedCount,
    insertResults,
    updateResults,
    deleteResults,
  }: {
    acknowledged: boolean;
    insertedCount: number;
    matchedCount: number;
    modifiedCount: number;
    deletedCount: number;
    upsertedCount: number;
    insertResults?: ReadonlyMap<number, ClientInsertResult>;
    updateResults?: ReadonlyMap<number, ClientUpdateResult>;
    deleteResults?: ReadonlyMap<number, ClientDeleteResult>;
  }) {
    super();
    this.acknowledged = acknowledged;
    this.insertedCount = insertedCount;
    this.matchedCount = matchedCount;
    this.modifiedCount = modifiedCount;
    this.deletedCount = deletedCount;
    this.upsertedCount = upsertedCount;
    this.insertResults = insertResults;
    this.updateResults = updateResults;
    this.deleteResults = deleteResults;
  }
}

@shellApiClassDefault
export class BulkWriteResult extends ShellApiValueClass {
  acknowledged: boolean;
  insertedCount: number;
  insertedIds: { [index: number]: ObjectIdType };
  matchedCount: number;
  modifiedCount: number;
  deletedCount: number;
  upsertedCount: number;
  upsertedIds: { [index: number]: ObjectIdType };
  constructor(
    acknowledged: boolean,
    insertedCount: number,
    insertedIds: { [index: number]: ObjectIdType },
    matchedCount: number,
    modifiedCount: number,
    deletedCount: number,
    upsertedCount: number,
    upsertedIds: { [index: number]: ObjectIdType }
  ) {
    super();
    this.acknowledged = acknowledged;
    this.insertedCount = insertedCount;
    this.insertedIds = insertedIds;
    this.matchedCount = matchedCount;
    this.modifiedCount = modifiedCount;
    this.deletedCount = deletedCount;
    this.upsertedCount = upsertedCount;
    this.upsertedIds = upsertedIds;
  }
}

@shellApiClassDefault
export class InsertManyResult extends ShellApiValueClass {
  acknowledged: boolean;
  insertedIds: { [key: number]: ObjectIdType };
  constructor(
    acknowledged: boolean,
    insertedIds: { [key: number]: ObjectIdType }
  ) {
    super();
    this.acknowledged = acknowledged;
    this.insertedIds = insertedIds;
  }
}

@shellApiClassDefault
export class InsertOneResult extends ShellApiValueClass {
  acknowledged: boolean;
  insertedId: ObjectIdType | undefined;
  constructor(acknowledged: boolean, insertedId?: ObjectIdType) {
    super();
    this.acknowledged = acknowledged;
    this.insertedId = insertedId;
  }
}

@shellApiClassDefault
export class UpdateResult extends ShellApiValueClass {
  acknowledged: boolean;
  insertedId: ObjectIdType | null;
  matchedCount: number;
  modifiedCount: number;
  upsertedCount: number;
  constructor(
    acknowledged: boolean,
    matchedCount: number,
    modifiedCount: number,
    upsertedCount: number,
    insertedId: ObjectIdType | null
  ) {
    super();
    this.acknowledged = acknowledged;
    this.insertedId = insertedId;
    this.matchedCount = matchedCount;
    this.modifiedCount = modifiedCount;
    this.upsertedCount = upsertedCount;
  }
}

@shellApiClassDefault
export class DeleteResult extends ShellApiValueClass {
  acknowledged: boolean;
  deletedCount: number | undefined;
  constructor(acknowledged: boolean, deletedCount: number | undefined) {
    super();
    this.acknowledged = acknowledged;
    this.deletedCount = deletedCount;
  }
}

@shellApiClassDefault
export class CursorIterationResult extends ShellApiValueClass {
  cursorHasMore: boolean;
  documents: Document[];

  constructor() {
    super();
    this.cursorHasMore = true; // filled by iterate() in helpers.ts or the _it() methods
    this.documents = [];
  }
}
