/** Stable machine-readable codes for `OpfsError` / monitoring. */
export const OPFS_ERROR_CODES: Readonly<{
  INVALID_DB_NAME: 'OPFS_INVALID_DB_NAME';
  INVALID_COLLECTION: 'OPFS_INVALID_COLLECTION';
  INVALID_PAYLOAD: 'OPFS_INVALID_PAYLOAD';
  INVALID_REQUEST: 'OPFS_INVALID_REQUEST';
  RPC_UNKNOWN_OP: 'OPFS_RPC_UNKNOWN_OP';
  RPC_TIMEOUT: 'OPFS_RPC_TIMEOUT';
  RPC_TOO_MANY_IN_FLIGHT: 'OPFS_RPC_TOO_MANY_IN_FLIGHT';
  OWNER_LOST: 'OPFS_OWNER_LOST';
  RECONNECTING: 'OPFS_RECONNECTING';
  WORKER_ERROR: 'OPFS_WORKER_ERROR';
  WORKER_MESSAGE_TIMEOUT: 'OPFS_WORKER_MESSAGE_TIMEOUT';
  NOT_INITIALIZED: 'OPFS_NOT_INITIALIZED';
  ALREADY_OPEN_ELSEWHERE: 'OPFS_ALREADY_OPEN_ELSEWHERE';
  OWNER_UNAVAILABLE: 'OPFS_OWNER_UNAVAILABLE';
  ALREADY_INITIALIZED: 'OPFS_ALREADY_INITIALIZED';
}>;

export const OPFS_RPC_LIMITS: Readonly<{
  maxDbNameLength: number;
  maxCollectionNameLength: number;
  maxRequestIdLength: number;
  maxPayloadWeight: number;
  maxObjectDepth: number;
  maxClientPendingRpc: number;
  defaultTimeoutMs: number;
  pingTimeoutMs: number;
  pingAttempts: number;
  pingBackoffMs: number;
  workerMessageTimeoutMs: number;
}>;

export class OpfsError extends Error {
  readonly name: 'OpfsError';
  /** Stable string equal to one of `Object.values(OPFS_ERROR_CODES)`. */
  readonly code: string;
  cause?: unknown;
  constructor(message: string, code: string, opts?: { cause?: unknown });
}

export function isOpfsError(e: unknown): e is OpfsError;

export function configureOpfsDebug(opts?: { enabled?: boolean }): void;

export function assertValidDbName(name: unknown): string;

export function initOpfsDatabase(dbName: string, collections?: string[]): Promise<OpfsDatabase>;

export function reconnectOpfsDatabase(dbName: string, collections?: string[]): Promise<OpfsDatabase>;

export function closeOpfsDatabase(dbName: string): Promise<void>;

export function wipeOpfsDatabaseDirectory(dbName: string): Promise<void>;

/** BSON-shaped results from the engine; narrow in application code as needed. */
export type OpfsBsonDoc = Record<string, unknown>;

export interface OpfsFindOptions {
  limit?: number;
  skip?: number;
  sort?: OpfsBsonDoc;
  projection?: OpfsBsonDoc;
}

export interface OpfsIndexOptions {
  name?: string;
  unique?: boolean;
  sparse?: boolean;
  background?: boolean;
  expireAfterSeconds?: number;
  partialFilterExpression?: OpfsBsonDoc;
  collation?: OpfsBsonDoc;
}

export interface OpfsIndexSpec {
  name: string;
  keys: OpfsBsonDoc;
  unique: boolean;
  sparse: boolean;
}

export interface OpfsInsertOneResult {
  insertedId: unknown;
}

export interface OpfsInsertManyResult {
  insertedIds: unknown[];
}

export interface OpfsUpdateResult {
  matchedCount: number;
  modifiedCount: number;
}

export interface OpfsDeleteResult {
  deletedCount: number;
}

export interface OpfsDatabaseStats {
  collectionCount: number;
  sizeBytes: number;
}

export class OpfsDatabase {
  constructor(dbName: string, options?: { mode?: 'owner' | 'client' });
  collection(name: string): OpfsCollection;
  listCollectionNames(): Promise<string[]>;
  dropCollection(name: string): Promise<void>;
  stats(): Promise<OpfsDatabaseStats>;
}

export class OpfsCollection {
  insertOne(doc: OpfsBsonDoc): Promise<OpfsInsertOneResult>;
  insertMany(docs: OpfsBsonDoc[]): Promise<OpfsInsertManyResult>;
  findOne(filter?: OpfsBsonDoc): Promise<OpfsBsonDoc | null>;
  find(filter?: OpfsBsonDoc): Promise<OpfsBsonDoc[]>;
  findWithOptions(filter: OpfsBsonDoc, options: OpfsFindOptions): Promise<OpfsBsonDoc[]>;
  countDocuments(filter?: OpfsBsonDoc): Promise<number>;
  updateOne(filter: OpfsBsonDoc, update: OpfsBsonDoc): Promise<OpfsUpdateResult>;
  updateMany(filter: OpfsBsonDoc, update: OpfsBsonDoc): Promise<OpfsUpdateResult>;
  deleteOne(filter: OpfsBsonDoc): Promise<OpfsDeleteResult>;
  deleteMany(filter: OpfsBsonDoc): Promise<OpfsDeleteResult>;
  aggregate(pipeline: OpfsBsonDoc[]): Promise<OpfsBsonDoc[]>;
  createIndex(keys: OpfsBsonDoc, options?: OpfsIndexOptions): Promise<string>;
  dropIndex(indexName: string): Promise<void>;
  listIndexes(): Promise<OpfsIndexSpec[]>;
}
