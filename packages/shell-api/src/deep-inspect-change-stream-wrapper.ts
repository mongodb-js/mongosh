import type {
  Document,
  ResumeToken,
  ServiceProviderChangeStream,
} from '@mongosh/service-provider-core';
import type { PickMethodsByReturnType } from './pick-methods-by-return-type';
import { addCustomInspect } from './custom-inspect';

export class DeepInspectChangeStreamWrapper<TSchema = Document>
  implements ServiceProviderChangeStream<TSchema>
{
  _cursor: ServiceProviderChangeStream<TSchema>;

  constructor(cursor: ServiceProviderChangeStream<TSchema>) {
    this._cursor = cursor;
  }

  get resumeToken(): ResumeToken {
    return this._cursor.resumeToken;
  }

  hasNext = forwardedMethod('hasNext');
  close = forwardedMethod('close');

  next = forwardResultPromise<TSchema, 'next'>('next');
  tryNext = forwardResultPromise<TSchema, 'tryNext'>('tryNext');

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
    ServiceProviderChangeStream<TSchema>,
    Promise<TSchema | null>
  >
>(
  key: K
): (
  ...args: Parameters<Required<ServiceProviderChangeStream<TSchema>>[K]>
) => ReturnType<Required<ServiceProviderChangeStream<TSchema>>[K]> {
  return async function (
    this: DeepInspectChangeStreamWrapper,
    ...args: Parameters<Required<ServiceProviderChangeStream<TSchema>>[K]>
  ): // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore The returntype already contains a promise
  ReturnType<Required<ServiceProviderChangeStream<TSchema>>[K]> {
    const result = await (this._cursor[key] as any)(...args);
    if (result) {
      addCustomInspect(result);
    }
    return result;
  };
}

function forwardedMethod<
  TSchema,
  K extends keyof PickMethodsByReturnType<
    ServiceProviderChangeStream<TSchema>,
    any
  >
>(
  key: K
): (
  ...args: Parameters<Required<ServiceProviderChangeStream<TSchema>>[K]>
) => ReturnType<Required<ServiceProviderChangeStream<TSchema>>[K]> {
  return function (
    this: DeepInspectChangeStreamWrapper,
    ...args: Parameters<Required<ServiceProviderChangeStream<TSchema>>[K]>
  ): ReturnType<Required<ServiceProviderChangeStream<TSchema>>[K]> {
    return (this._cursor[key] as any)(...args);
  };
}
