import type {
  Document,
  ReadConcernLike,
  ReadPreferenceLike,
  ServiceProviderFindCursor,
} from '@mongosh/service-provider-core';
import type { PickMethodsByReturnType } from './pick-methods-by-return-type';
import { addCustomInspect } from './custom-inspect';

export class DeepInspectFindCursorWrapper<TSchema = Document>
  implements ServiceProviderFindCursor<TSchema>
{
  _cursor: ServiceProviderFindCursor<TSchema>;

  constructor(cursor: ServiceProviderFindCursor<TSchema>) {
    this._cursor = cursor;
  }

  allowDiskUse = forwardedMethod('allowDiskUse');
  collation = forwardedMethod('collation');
  comment = forwardedMethod('comment');
  maxAwaitTimeMS = forwardedMethod('maxAwaitTimeMS');
  count = forwardedMethod('count');
  hint = forwardedMethod('hint');
  max = forwardedMethod('max');
  min = forwardedMethod('min');
  limit = forwardedMethod('limit');
  skip = forwardedMethod('skip');
  returnKey = forwardedMethod('returnKey');
  showRecordId = forwardedMethod('showRecordId');
  project = forwardedMethod('project');
  sort = forwardedMethod('sort');
  explain = forwardedMethod('explain');
  addCursorFlag = forwardedMethod('addCursorFlag');

  withReadPreference = (readPreference: ReadPreferenceLike) => {
    this._cursor.withReadPreference(readPreference);
    return this;
  };

  withReadConcern(readConcern: ReadConcernLike) {
    this._cursor.withReadConcern(readConcern);
    return this;
  }

  batchSize = forwardedMethod('batchSize');
  hasNext = forwardedMethod('hasNext');
  close = forwardedMethod('close');
  maxTimeMS = forwardedMethod('maxTimeMS');
  bufferedCount = forwardedMethod('bufferedCount');

  next = forwardResultPromise<TSchema, 'next'>('next');
  tryNext = forwardResultPromise<TSchema, 'tryNext'>('tryNext');

  toArray = forwardResultsPromise<TSchema, 'toArray'>('toArray');
  readBufferedDocuments = forwardResults<TSchema, 'readBufferedDocuments'>(
    'readBufferedDocuments'
  );

  get closed(): boolean {
    return this._cursor.closed;
  }

  async *[Symbol.asyncIterator]() {
    yield* this._cursor;
    return;
  }
}

function forwardResultPromise<
  TSchema,
  K extends keyof PickMethodsByReturnType<
    ServiceProviderFindCursor<TSchema>,
    Promise<TSchema | null>
  >
>(
  key: K
): (
  ...args: Parameters<Required<ServiceProviderFindCursor<TSchema>>[K]>
) => ReturnType<Required<ServiceProviderFindCursor<TSchema>>[K]> {
  return async function (
    this: DeepInspectFindCursorWrapper,
    ...args: Parameters<Required<ServiceProviderFindCursor<TSchema>>[K]>
  ): // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore The returntype already contains a promise
  ReturnType<Required<ServiceProviderFindCursor<TSchema>>[K]> {
    const result = await (this._cursor[key] as any)(...args);
    if (result) {
      addCustomInspect(result);
    }
    return result;
  };
}

function forwardResultsPromise<
  TSchema,
  K extends keyof PickMethodsByReturnType<
    ServiceProviderFindCursor<TSchema>,
    Promise<TSchema[]>
  >
>(
  key: K
): (
  ...args: Parameters<Required<ServiceProviderFindCursor<TSchema>>[K]>
) => ReturnType<Required<ServiceProviderFindCursor<TSchema>>[K]> {
  return async function (
    this: DeepInspectFindCursorWrapper,
    ...args: Parameters<Required<ServiceProviderFindCursor<TSchema>>[K]>
  ): // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore The returntype already contains a promise
  ReturnType<Required<ServiceProviderFindCursor<TSchema>>[K]> {
    const results = await (this._cursor[key] as any)(...args);
    addCustomInspect(results);
    return results;
  };
}

function forwardResults<
  TSchema,
  K extends keyof PickMethodsByReturnType<
    ServiceProviderFindCursor<TSchema>,
    TSchema[]
  >
>(
  key: K
): (
  ...args: Parameters<Required<ServiceProviderFindCursor<TSchema>>[K]>
) => ReturnType<Required<ServiceProviderFindCursor<TSchema>>[K]> {
  return function (
    this: DeepInspectFindCursorWrapper,
    ...args: Parameters<Required<ServiceProviderFindCursor<TSchema>>[K]>
  ): ReturnType<Required<ServiceProviderFindCursor<TSchema>>[K]> {
    const results = (this._cursor[key] as any)(...args);
    addCustomInspect(results);
    return results;
  };
}

function forwardedMethod<
  TSchema,
  K extends keyof PickMethodsByReturnType<
    ServiceProviderFindCursor<TSchema>,
    any
  >
>(
  key: K
): (
  ...args: Parameters<Required<ServiceProviderFindCursor<TSchema>>[K]>
) => ReturnType<Required<ServiceProviderFindCursor<TSchema>>[K]> {
  return function (
    this: DeepInspectFindCursorWrapper,
    ...args: Parameters<Required<ServiceProviderFindCursor<TSchema>>[K]>
  ): ReturnType<Required<ServiceProviderFindCursor<TSchema>>[K]> {
    return (this._cursor[key] as any)(...args);
  };
}
