import { shellApiClassDefault, ShellApiValueClass } from './decorators';
import { shellApiType, asPrintable } from './enums';
import { Document, ObjectIdType } from '@mongosh/service-provider-core';

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

@shellApiClassDefault
export class BulkWriteResult extends ShellApiValueClass {
  acknowledged: boolean;
  insertedCount: number;
  insertedIds: {[index: number]: ObjectIdType};
  matchedCount: number;
  modifiedCount: number;
  deletedCount: number;
  upsertedCount: number;
  upsertedIds: {[index: number]: ObjectIdType};
  constructor(
    acknowledged: boolean,
    insertedCount: number,
    insertedIds: {[index: number]: ObjectIdType},
    matchedCount: number,
    modifiedCount: number,
    deletedCount: number,
    upsertedCount: number,
    upsertedIds: {[index: number]: ObjectIdType}) {
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
  constructor(acknowledged: boolean, insertedIds: { [key: number]: ObjectIdType }) {
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
    insertedId: ObjectIdType | null) {
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
