import type {
  ReadConcernLike,
  ReadPreferenceLike,
  ServiceProviderFindCursor,
  ServiceProviderBaseCursor,
  ServiceProviderRunCommandCursor,
  ServiceProviderAggregationCursor,
  ServiceProviderChangeStream,
  ResumeToken,
} from '@mongosh/service-provider-core';
import type {
  PickMethodsByReturnType,
  UnionToIntersection,
} from './ts-helpers';
import { addCustomInspect } from './custom-inspect';

type AnyCursor<TSchema> =
  | ServiceProviderBaseCursor<TSchema>
  | ServiceProviderRunCommandCursor<TSchema>
  | ServiceProviderFindCursor<TSchema>
  | ServiceProviderAggregationCursor<TSchema>
  | ServiceProviderChangeStream<TSchema>;
type AllCursor<TSchema> = UnionToIntersection<AnyCursor<TSchema>>;

export function deepInspectCursorWrapper<
  TSchema,
  Cursor extends AnyCursor<TSchema>
>(_cursor: Cursor): Cursor {
  // All methods are potentially defined on the union
  const cursor = _cursor as Cursor & Partial<AllCursor<TSchema>>;
  return {
    allowDiskUse: forwardedMethod('allowDiskUse', cursor),
    collation: forwardedMethod('collation', cursor),
    comment: forwardedMethod('comment', cursor),
    maxAwaitTimeMS: forwardedMethod('maxAwaitTimeMS', cursor),
    count: forwardedMethod('count', cursor),
    hint: forwardedMethod('hint', cursor),
    max: forwardedMethod('max', cursor),
    min: forwardedMethod('min', cursor),
    limit: forwardedMethod('limit', cursor),
    skip: forwardedMethod('skip', cursor),
    returnKey: forwardedMethod('returnKey', cursor),
    showRecordId: forwardedMethod('showRecordId', cursor),
    project: forwardedMethod('project', cursor),
    sort: forwardedMethod('sort', cursor),
    explain: forwardedMethod('explain', cursor),
    addCursorFlag: forwardedMethod('addCursorFlag', cursor),

    withReadPreference: cursor.withReadPreference
      ? (readPreference: ReadPreferenceLike) => {
          cursor.withReadPreference!(readPreference);
          return cursor;
        }
      : undefined,

    withReadConcern: cursor.withReadConcern
      ? (readConcern: ReadConcernLike) => {
          cursor.withReadConcern!(readConcern);
          return cursor;
        }
      : undefined,

    batchSize: forwardedMethod('batchSize', cursor),
    hasNext: forwardedMethod('hasNext', cursor),
    close: forwardedMethod('close', cursor),
    maxTimeMS: forwardedMethod('maxTimeMS', cursor),
    bufferedCount: forwardedMethod('bufferedCount', cursor),

    next: forwardResultPromise('next', cursor),
    tryNext: forwardResultPromise('tryNext', cursor),

    toArray: forwardResultPromise('toArray', cursor),
    readBufferedDocuments: forwardResults('readBufferedDocuments', cursor),

    get closed(): boolean {
      return cursor.closed;
    },

    get resumeToken(): ResumeToken {
      return cursor.resumeToken;
    },

    [Symbol.asyncIterator]: cursor[Symbol.asyncIterator]
      ? async function* (): AsyncGenerator<TSchema, void, void> {
          for await (const doc of cursor[Symbol.asyncIterator]!()) {
            addCustomInspect(doc);
            yield doc;
          }
        }
      : undefined,
  } satisfies Record<
    keyof AllCursor<TSchema>,
    unknown
  > as AnyCursor<TSchema> as Cursor;
}

function forwardResultPromise<
  TSchema,
  Cursor extends AnyCursor<TSchema>,
  K extends keyof PickMethodsByReturnType<Cursor, Promise<TSchema | null>>
>(key: K, cursor: Cursor): Cursor[K] {
  if (!cursor[key]) return undefined as Cursor[K];
  return async function (
    ...args: any[]
  ): // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore The returntype already contains a promise
  ReturnType<Required<Cursor>[K]> {
    const result = await (cursor[key] as any)(...args);
    if (result) {
      addCustomInspect(result);
    }
    return result;
  } as Cursor[K];
}

function forwardResults<
  TSchema,
  Cursor extends AnyCursor<TSchema>,
  K extends keyof PickMethodsByReturnType<Cursor, TSchema[]>
>(key: K, cursor: Cursor): Cursor[K] {
  if (!cursor[key]) return undefined as Cursor[K];
  return function (...args: any[]) {
    const results = (cursor[key] as any)(...args);
    addCustomInspect(results);
    return results;
  } as Cursor[K];
}

function forwardedMethod<
  TSchema,
  Cursor extends AnyCursor<TSchema>,
  K extends keyof Cursor
>(key: K, cursor: Cursor): Cursor[K] {
  if (!cursor[key]) return undefined as Cursor[K];
  return function (...args: any[]) {
    return (cursor[key] as any)(...args);
  } as Cursor[K];
}
