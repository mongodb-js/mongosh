import type {
  Document,
  ReadConcernLike,
  ReadPreferenceLike,
  ServiceProviderAggregationCursor,
} from '@mongosh/service-provider-core';
import type { PickMethodsByReturnType } from './pick-methods-by-return-type';
import { addCustomInspect } from './custom-inspect';

export class DeepInspectAggregationCursorWrapper<TSchema = Document>
  implements ServiceProviderAggregationCursor<TSchema>
{
  _cursor: ServiceProviderAggregationCursor<TSchema>;

  constructor(cursor: ServiceProviderAggregationCursor<TSchema>) {
    this._cursor = cursor;
  }

  project = forwardedMethod('project');
  skip = forwardedMethod('skip');
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
    ServiceProviderAggregationCursor<TSchema>,
    Promise<TSchema | null>
  >
>(
  key: K
): (
  ...args: Parameters<Required<ServiceProviderAggregationCursor<TSchema>>[K]>
) => ReturnType<Required<ServiceProviderAggregationCursor<TSchema>>[K]> {
  return async function (
    this: DeepInspectAggregationCursorWrapper,
    ...args: Parameters<Required<ServiceProviderAggregationCursor<TSchema>>[K]>
  ): // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore The returntype already contains a promise
  ReturnType<Required<ServiceProviderAggregationCursor<TSchema>>[K]> {
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
    ServiceProviderAggregationCursor<TSchema>,
    Promise<TSchema[]>
  >
>(
  key: K
): (
  ...args: Parameters<Required<ServiceProviderAggregationCursor<TSchema>>[K]>
) => ReturnType<Required<ServiceProviderAggregationCursor<TSchema>>[K]> {
  return async function (
    this: DeepInspectAggregationCursorWrapper,
    ...args: Parameters<Required<ServiceProviderAggregationCursor<TSchema>>[K]>
  ): // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore The returntype already contains a promise
  ReturnType<Required<ServiceProviderAggregationCursor<TSchema>>[K]> {
    const results = await (this._cursor[key] as any)(...args);
    addCustomInspect(results);
    return results;
  };
}

function forwardResults<
  TSchema,
  K extends keyof PickMethodsByReturnType<
    ServiceProviderAggregationCursor<TSchema>,
    TSchema[]
  >
>(
  key: K
): (
  ...args: Parameters<Required<ServiceProviderAggregationCursor<TSchema>>[K]>
) => ReturnType<Required<ServiceProviderAggregationCursor<TSchema>>[K]> {
  return function (
    this: DeepInspectAggregationCursorWrapper,
    ...args: Parameters<Required<ServiceProviderAggregationCursor<TSchema>>[K]>
  ): ReturnType<Required<ServiceProviderAggregationCursor<TSchema>>[K]> {
    const results = (this._cursor[key] as any)(...args);
    addCustomInspect(results);
    return results;
  };
}

function forwardedMethod<
  TSchema,
  K extends keyof PickMethodsByReturnType<
    ServiceProviderAggregationCursor<TSchema>,
    any
  >
>(
  key: K
): (
  ...args: Parameters<Required<ServiceProviderAggregationCursor<TSchema>>[K]>
) => ReturnType<Required<ServiceProviderAggregationCursor<TSchema>>[K]> {
  return function (
    this: DeepInspectAggregationCursorWrapper,
    ...args: Parameters<Required<ServiceProviderAggregationCursor<TSchema>>[K]>
  ): ReturnType<Required<ServiceProviderAggregationCursor<TSchema>>[K]> {
    return (this._cursor[key] as any)(...args);
  };
}
