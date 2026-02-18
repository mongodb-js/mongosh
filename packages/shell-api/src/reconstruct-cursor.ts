import AggregationCursor from './aggregation-cursor';
import Cursor from './cursor';
import RunCommandCursor from './run-command-cursor';
import type { CursorConstructionOptionsWithChains } from './abstract-cursor';
import type Mongo from './mongo';

export function reconstructCursor(
  mongo: Mongo,
  constructionOptionsWithChains: CursorConstructionOptionsWithChains
): Cursor | AggregationCursor | RunCommandCursor {
  const { method, args, cursorType } = constructionOptionsWithChains.options;
  const providerCursor = (mongo._serviceProvider[method] as any)(...args);

  const cursor = new { Cursor, AggregationCursor, RunCommandCursor }[
    cursorType
  ](mongo, providerCursor, constructionOptionsWithChains);
  return cursor;
}
