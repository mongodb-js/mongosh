export interface WireServerOptions {
  dbPath: string;
  port?: number;
}

export declare class WireServer {
  constructor(options: WireServerOptions);
  /** Start the wire server on 127.0.0.1 and return the bound port. */
  start(): number;
  /** Request the server to stop accepting connections and shut down. */
  stop(): void;
  /** The port the server is bound to (after start()). */
  readonly port: number;
}

export declare class MongoClient {
  constructor(uri: string);
  db(name: string): Database;
}

export declare class Database {
  static open(path: string): Database;
  readonly name: string;
  readonly path: string;
  collection(name: string): Collection;
  listCollectionNames(): string[];
  dropCollection(name: string): void;
  stats(): any;
  startSession(): ClientSession;
  reapTtl(): number;
  drop(): void;
}

export declare class Collection {
  close(): void;
  insertOne(document: any): any;
  insertMany(documents: any): any;
  findOne(filter: any, options?: any | null): any | null;
  find(filter: any, options?: any | null): any;
  updateOne(filter: any, update: any, options?: any | null): any;
  updateMany(filter: any, update: any, options?: any | null): any;
  deleteOne(filter: any): any;
  deleteMany(filter: any): any;
  countDocuments(filter?: any | null): number;
  aggregate(pipeline: any): any;
  explainAggregate(pipeline: any): any;
  explainFind(filter: any): any;
  explainFindOne(filter: any): any;
  createIndex(keys: any, options?: any | null): string;
  reapExpired(): number;
  dropIndex(name: string): void;
  listIndexes(): any;
  rebuildAllIndexes(): number;
}

export declare class ClientSession {
  startTransaction(): void;
  commitTransaction(): void;
  abortTransaction(): void;
  insertOne(collectionName: string, document: any): any;
  findOne(collectionName: string, filter: any, options?: any | null): any | null;
  find(collectionName: string, filter: any, options?: any | null): any;
  updateOne(collectionName: string, filter: any, update: any, options?: any | null): any;
  updateMany(collectionName: string, filter: any, update: any, options?: any | null): any;
  deleteOne(collectionName: string, filter: any): any;
  deleteMany(collectionName: string, filter: any): any;
  countDocuments(collectionName: string, filter?: any | null): number;
  aggregate(collectionName: string, pipeline: any): any;
}
