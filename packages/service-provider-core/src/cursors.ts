import type {
  CollationOptions,
  CountOptions,
  CursorFlag,
  Document,
  ExplainVerbosityLike,
  ReadConcernLike,
  ReadPreferenceLike,
  ResumeToken,
} from './all-transport-types';

interface ServiceProviderBaseCursor<TSchema = Document> {
  close(): Promise<void>;
  hasNext(): Promise<boolean>;
  next(): Promise<TSchema | null>;
  tryNext(): Promise<TSchema | null>;
  readonly closed: boolean;
  [Symbol.asyncIterator](): AsyncGenerator<TSchema, void, void>;
}

export interface ServiceProviderAbstractCursor<TSchema = Document>
  extends ServiceProviderBaseCursor<TSchema> {
  batchSize(number: number): void;
  maxTimeMS(value: number): void;
  bufferedCount(): number;
  readBufferedDocuments(number?: number): TSchema[];
  toArray(): Promise<TSchema[]>;
}

export interface ServiceProviderAggregationOrFindCursor<TSchema = Document>
  extends ServiceProviderAbstractCursor<TSchema> {
  project($project: Document): void;
  skip($skip: number): void;
  sort($sort: Document): void;
  explain(verbosity?: ExplainVerbosityLike): Promise<Document>;
  addCursorFlag(flag: CursorFlag, value: boolean): void;
  withReadPreference(readPreference: ReadPreferenceLike): this;
  withReadConcern(readConcern: ReadConcernLike): this;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ServiceProviderRunCommandCursor<TSchema = Document>
  extends ServiceProviderAbstractCursor<TSchema> {}

export interface ServiceProviderFindCursor<TSchema = Document>
  extends ServiceProviderAggregationOrFindCursor<TSchema> {
  allowDiskUse(allow?: boolean): void;
  collation(value: CollationOptions): void;
  comment(value: string): void;
  maxAwaitTimeMS(value: number): void;
  count(options?: CountOptions): Promise<number>;
  hint(hint: string | Document): void;
  max(max: Document): void;
  min(min: Document): void;
  limit(value: number): void;
  skip(value: number): void;
  returnKey(value: boolean): void;
  showRecordId(value: boolean): void;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ServiceProviderAggregationCursor<TSchema = Document>
  extends ServiceProviderAggregationOrFindCursor<TSchema> {}

export interface ServiceProviderChangeStream<TSchema = Document>
  extends ServiceProviderBaseCursor<TSchema> {
  next(): Promise<TSchema>;
  readonly resumeToken: ResumeToken;
}
