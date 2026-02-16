import type {
  ServiceProvider,
  ServiceProviderAggregationCursor,
  ServiceProviderFindCursor,
  ServiceProviderRunCommandCursor,
} from '@mongosh/service-provider-core';
import AggregationCursor from './aggregation-cursor';
import Cursor from './cursor';
import RunCommandCursor from './run-command-cursor';
import type {
  CursorChainOptions,
  CursorConstructionOptions,
} from './abstract-cursor';
import type Mongo from './mongo';

type CallableKeys<T> = keyof {
  [K in keyof NonNullable<T> as NonNullable<T>[K] extends Function
    ? K
    : never]: any;
};

export function reconstructCursor(
  mongo: Mongo,
  constructionOptions: CursorConstructionOptions,
  chains: CursorChainOptions[]
): Cursor | AggregationCursor | RunCommandCursor {
  const method =
    mongo._serviceProvider[
      constructionOptions.method as CallableKeys<ServiceProvider>
    ];

  // @ts-expect-error The type system does not understand that the constructionOptions are always correct for the method being called.
  const providerCursor = method(...constructionOptions.args);

  let cursor: Cursor | AggregationCursor | RunCommandCursor;
  switch (constructionOptions.cursorType) {
    case 'Cursor':
      cursor = new Cursor(
        mongo,
        providerCursor as ServiceProviderFindCursor<Document>,
        constructionOptions
      );
      break;
    case 'AggregationCursor':
      cursor = new AggregationCursor(
        mongo,
        providerCursor as ServiceProviderAggregationCursor<Document>,
        constructionOptions
      );
      break;
    case 'RunCommandCursor':
      cursor = new RunCommandCursor(
        mongo,
        providerCursor as ServiceProviderRunCommandCursor<Document>,
        constructionOptions
      );
      break;
  }
  for (const chain of chains) {
    cursor = cursor[chain.method as CallableKeys<typeof cursor>](...chain.args);
  }
  return cursor;
}
