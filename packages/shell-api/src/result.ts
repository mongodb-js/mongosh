import { ShellApiClass, shellApiClassDefault } from './decorators';

@shellApiClassDefault
export class CommandResult extends ShellApiClass {
  value: any;
  type: string;
  constructor(type, value) {
    super();
    this.type = type;
    this.value = value;
  }
  toReplString(): any {
    return this.value;
  }
  shellApiType(): any {
    return this.type;
  }
}

@shellApiClassDefault
export class BulkWriteResult extends ShellApiClass {
  acknowledged: boolean;
  insertedCount: number;
  insertedIds: string[];
  matchedCount: number;
  modifiedCount: number;
  deletedCount: number;
  upsertedCount: number;
  upsertedIds: string[];
  constructor(acknowledged, insertedCount, insertedIds, matchedCount, modifiedCount, deletedCount, upsertedCount, upsertedIds) {
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
  insertedIds: string[];
  constructor(acknowledged, insertedIds) {
    super();
    this.acknowledged = acknowledged;
    this.insertedIds = insertedIds;
  }
}

@shellApiClassDefault
export class InsertOneResult extends ShellApiClass {
  acknowledged: boolean;
  insertedId: string;
  constructor(acknowledged, insertedId) {
    super();
    this.acknowledged = acknowledged;
    this.insertedId = insertedId;
  }
}

@shellApiClassDefault
export class UpdateResult extends ShellApiClass {
  acknowledged: boolean;
  insertedId: string;
  matchedCount: number;
  modifiedCount: number;
  upsertedCount: number;
  constructor(acknowledged, insertedId, matchedCount, modifiedCount, upsertedCount) {
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
  deletedCount: number;
  constructor(acknowledged, deletedCount) {
    super();
    this.acknowledged = acknowledged;
    this.deletedCount = deletedCount;
  }
}

@shellApiClassDefault
export class CursorIterationResult extends Array {
  toReplString: () => this;
  shellApiType: () => string;

  constructor(...args) {
    super(...args);

    Object.defineProperty(this, 'toReplString', {
      value: () => { return this; },
      enumerable: false
    });

    Object.defineProperty(this, 'shellApiType', {
      value: () => { return 'CursorIterationResult'; },
      enumerable: false
    });
  }
}
