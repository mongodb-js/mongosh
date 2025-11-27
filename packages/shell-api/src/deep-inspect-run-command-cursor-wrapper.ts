import type {
  Document,
  ServiceProviderRunCommandCursor,
} from '@mongosh/service-provider-core';
import type { PickMethodsByReturnType } from './pick-methods-by-return-type';
import { addCustomInspect } from './custom-inspect';

export class DeepInspectRunCommandCursorWrapper<TSchema = Document>
  implements ServiceProviderRunCommandCursor<TSchema>
{
  _cursor: ServiceProviderRunCommandCursor<TSchema>;

  constructor(cursor: ServiceProviderRunCommandCursor<TSchema>) {
    this._cursor = cursor;
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

  /*async *[Symbol.asyncIterator]() {
    yield* this._cursor;
    return;
  }*/
}

function forwardResultPromise<
  TSchema,
  K extends keyof PickMethodsByReturnType<
    ServiceProviderRunCommandCursor<TSchema>,
    Promise<TSchema | null>
  >
>(
  key: K
): (
  ...args: Parameters<Required<ServiceProviderRunCommandCursor<TSchema>>[K]>
) => ReturnType<Required<ServiceProviderRunCommandCursor<TSchema>>[K]> {
  return async function (
    this: DeepInspectRunCommandCursorWrapper,
    ...args: Parameters<Required<ServiceProviderRunCommandCursor<TSchema>>[K]>
  ): // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore The returntype already contains a promise
  ReturnType<Required<ServiceProviderRunCommandCursor<TSchema>>[K]> {
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
    ServiceProviderRunCommandCursor<TSchema>,
    Promise<TSchema[]>
  >
>(
  key: K
): (
  ...args: Parameters<Required<ServiceProviderRunCommandCursor<TSchema>>[K]>
) => ReturnType<Required<ServiceProviderRunCommandCursor<TSchema>>[K]> {
  return async function (
    this: DeepInspectRunCommandCursorWrapper,
    ...args: Parameters<Required<ServiceProviderRunCommandCursor<TSchema>>[K]>
  ): // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore The returntype already contains a promise
  ReturnType<Required<ServiceProviderRunCommandCursor<TSchema>>[K]> {
    const results = await (this._cursor[key] as any)(...args);
    addCustomInspect(results);
    return results;
  };
}

function forwardResults<
  TSchema,
  K extends keyof PickMethodsByReturnType<
    ServiceProviderRunCommandCursor<TSchema>,
    TSchema[]
  >
>(
  key: K
): (
  ...args: Parameters<Required<ServiceProviderRunCommandCursor<TSchema>>[K]>
) => ReturnType<Required<ServiceProviderRunCommandCursor<TSchema>>[K]> {
  return function (
    this: DeepInspectRunCommandCursorWrapper,
    ...args: Parameters<Required<ServiceProviderRunCommandCursor<TSchema>>[K]>
  ): ReturnType<Required<ServiceProviderRunCommandCursor<TSchema>>[K]> {
    const results = (this._cursor[key] as any)(...args);
    addCustomInspect(results);
    return results;
  };
}

function forwardedMethod<
  TSchema,
  K extends keyof PickMethodsByReturnType<
    ServiceProviderRunCommandCursor<TSchema>,
    any
  >
>(
  key: K
): (
  ...args: Parameters<Required<ServiceProviderRunCommandCursor<TSchema>>[K]>
) => ReturnType<Required<ServiceProviderRunCommandCursor<TSchema>>[K]> {
  return function (
    this: DeepInspectRunCommandCursorWrapper,
    ...args: Parameters<Required<ServiceProviderRunCommandCursor<TSchema>>[K]>
  ): ReturnType<Required<ServiceProviderRunCommandCursor<TSchema>>[K]> {
    return (this._cursor[key] as any)(...args);
  };
}
