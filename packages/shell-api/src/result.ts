import { ShellApiClass, shellApiClassDefault } from './decorators';
import { shellApiType, asPrintable } from './enums';
import { addHiddenDataProperty } from './helpers';

@shellApiClassDefault
export class CommandResult extends ShellApiClass {
  value: unknown;
  type: string;
  constructor(type: string, value: unknown) {
    super();
    this.type = type;
    this.value = value;
    this[shellApiType] = type;
  }

  /**
   * Internal method to determine what is printed for this class.
   */
  [asPrintable](): unknown {
    return this.value;
  }
}

@shellApiClassDefault
export class BulkWriteResult extends ShellApiClass {
  acknowledged: boolean;
  insertedCount: number;
  insertedIds: {[index: number]: any};
  matchedCount: number;
  modifiedCount: number;
  deletedCount: number;
  upsertedCount: number;
  upsertedIds: {[index: number]: any};
  constructor(
    acknowledged: boolean,
    insertedCount: number,
    insertedIds: {[index: number]: any},
    matchedCount: number,
    modifiedCount: number,
    deletedCount: number,
    upsertedCount: number,
    upsertedIds: {[index: number]: any}) {
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
export class InsertManyResult extends ShellApiClass {
  acknowledged: boolean;
  insertedIds: { [key: number]: any };
  constructor(acknowledged: boolean, insertedIds: { [key: number]: any }) {
    super();
    this.acknowledged = acknowledged;
    this.insertedIds = insertedIds;
  }
}

@shellApiClassDefault
export class InsertOneResult extends ShellApiClass {
  acknowledged: boolean;
  insertedId: string;
  constructor(acknowledged: boolean, insertedId: string) {
    super();
    this.acknowledged = acknowledged;
    this.insertedId = insertedId;
  }
}

@shellApiClassDefault
export class UpdateResult extends ShellApiClass {
  acknowledged: boolean;
  insertedId: { _id: any };
  matchedCount: number;
  modifiedCount: number;
  upsertedCount: number;
  constructor(
    acknowledged: boolean,
    matchedCount: number,
    modifiedCount: number,
    upsertedCount: number,
    insertedId: { _id: any }) {
    super();
    this.acknowledged = acknowledged;
    this.insertedId = insertedId;
    this.matchedCount = matchedCount;
    this.modifiedCount = modifiedCount;
    this.upsertedCount = upsertedCount;
  }
}

@shellApiClassDefault
export class DeleteResult extends ShellApiClass {
  acknowledged: boolean;
  deletedCount: number | undefined;
  constructor(acknowledged: boolean, deletedCount: number | undefined) {
    super();
    this.acknowledged = acknowledged;
    this.deletedCount = deletedCount;
  }
}

// NOTE: because this is inherited, the decorator does not add attributes. So no help() function.
@shellApiClassDefault
export class CursorIterationResult extends Array {
  [shellApiType]: string;

  constructor(...args: any[]) {
    super(...args);
    addHiddenDataProperty(this, shellApiType, 'CursorIterationResult');
  }
}
