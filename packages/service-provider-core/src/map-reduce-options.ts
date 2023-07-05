import type {
  CommandOperationOptions,
  Document,
  ObjectId,
  Sort,
} from 'mongodb';

export type FinalizeFunction<TKey = ObjectId, TValue = Document> = (
  key: TKey,
  reducedValue: TValue
) => TValue;

export interface MapReduceOptions<TKey = ObjectId, TValue = Document>
  extends CommandOperationOptions {
  /** Sets the output target for the map reduce job. */
  out?:
    | 'inline'
    | { inline: 1 }
    | { replace: string }
    | { merge: string }
    | { reduce: string };
  /** Query filter object. */
  query?: Document;
  /** Sorts the input objects using this key. Useful for optimization, like sorting by the emit key for fewer reduces. */
  sort?: Sort;
  /** Number of objects to return from collection. */
  limit?: number;
  /** Keep temporary data. */
  keeptemp?: boolean;
  /** Finalize function. */
  finalize?: FinalizeFunction<TKey, TValue> | string;
  /** Can pass in variables that can be access from map/reduce/finalize. */
  scope?: Document;
  /** It is possible to make the execution stay in JS. Provided in MongoDB \> 2.0.X. */
  jsMode?: boolean;
  /** Provide statistics on job execution time. */
  verbose?: boolean;
  /** Allow driver to bypass schema validation in MongoDB 3.2 or higher. */
  bypassDocumentValidation?: boolean;
}
