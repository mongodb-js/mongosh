import {
  shellApiClassNoHelp,
  returnType,
  returnsPromise,
  apiVersions,
  cursorChainable,
} from './decorators';
import type {
  Document,
  ExplainVerbosityLike,
  ServiceProviderFindCursor,
  ServiceProviderAggregationCursor,
} from '@mongosh/service-provider-core';
import { validateExplainableVerbosity, markAsExplainOutput } from './helpers';
import { AbstractFiniteCursor } from './abstract-cursor';

@shellApiClassNoHelp
export abstract class AggregateOrFindCursor<
  CursorType extends
    | ServiceProviderAggregationCursor
    | ServiceProviderFindCursor
> extends AbstractFiniteCursor<CursorType> {
  @returnType('this')
  @cursorChainable
  projection(spec: Document): this {
    this._cursor.project(spec);
    return this;
  }

  @returnType('this')
  @cursorChainable
  skip(value: number): this {
    this._cursor.skip(value);
    return this;
  }

  @returnType('this')
  @cursorChainable
  sort(spec: Document): this {
    this._cursor.sort(spec);
    return this;
  }

  @returnsPromise
  @apiVersions([1])
  async explain(verbosity?: ExplainVerbosityLike): Promise<any> {
    // TODO: @maurizio we should probably move this in the Explain class?
    // NOTE: the node driver always returns the full explain plan
    // for Cursor and the queryPlanner explain for AggregationCursor.
    verbosity = validateExplainableVerbosity(verbosity);
    const fullExplain: any = await this._cursor.explain(verbosity);

    const explain: any = {
      ...fullExplain,
    };

    if (
      verbosity !== 'executionStats' &&
      verbosity !== 'allPlansExecution' &&
      explain.executionStats
    ) {
      delete explain.executionStats;
    }

    if (
      verbosity === 'executionStats' &&
      explain.executionStats &&
      explain.executionStats.allPlansExecution
    ) {
      delete explain.executionStats.allPlansExecution;
    }

    return markAsExplainOutput(explain);
  }
}
