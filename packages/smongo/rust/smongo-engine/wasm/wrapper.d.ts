export function initSmongo(): Promise<void>;

export type BsonDoc = Record<string, unknown>;

export interface FindOptions {
  limit?: number;
  skip?: number;
  sort?: BsonDoc;
  projection?: BsonDoc;
}

export interface IndexOptions {
  name?: string;
  unique?: boolean;
  sparse?: boolean;
  background?: boolean;
  expireAfterSeconds?: number;
  partialFilterExpression?: BsonDoc;
  collation?: BsonDoc;
}

export interface IndexSpec {
  name: string;
  keys: BsonDoc;
  unique: boolean;
  sparse: boolean;
}

export interface InsertOneResult {
  insertedId: unknown;
}

export interface InsertManyResult {
  insertedIds: unknown[];
}

export interface UpdateResult {
  matchedCount: number;
  modifiedCount: number;
}

export interface DeleteResult {
  deletedCount: number;
}

export interface DatabaseStats {
  collectionCount: number;
  sizeBytes: number;
}

export class Database {
  constructor(name: string);
  collection(name: string): Collection;
  listCollectionNames(): string[];
  dropCollection(name: string): void;
  stats(): DatabaseStats;
}

export class Collection {
  insertOne(doc: BsonDoc): InsertOneResult;
  insertMany(docs: BsonDoc[]): InsertManyResult;
  findOne(filter?: BsonDoc): BsonDoc | null;
  find(filter?: BsonDoc): BsonDoc[];
  findWithOptions(filter: BsonDoc, options: FindOptions): BsonDoc[];
  countDocuments(filter?: BsonDoc): number;
  updateOne(filter: BsonDoc, update: BsonDoc): UpdateResult;
  updateMany(filter: BsonDoc, update: BsonDoc): UpdateResult;
  deleteOne(filter: BsonDoc): DeleteResult;
  deleteMany(filter: BsonDoc): DeleteResult;
  aggregate(pipeline: BsonDoc[]): BsonDoc[];
  createIndex(keys: BsonDoc, options?: IndexOptions): string;
  dropIndex(indexName: string): void;
  listIndexes(): IndexSpec[];
}
