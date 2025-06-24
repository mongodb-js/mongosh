import {
  shellApiClassNoHelp,
  returnType,
  returnsPromise,
  apiVersions,
} from './decorators';
import type {
  Document,
  ExplainVerbosityLike,
  ServiceProviderFindCursor,
  ServiceProviderAggregationCursor,
} from '@mongosh/service-provider-core';
import type { GenericServerSideSchema } from './helpers';
import { validateExplainableVerbosity, markAsExplainOutput } from './helpers';
import { AbstractCursor } from './abstract-cursor';

@shellApiClassNoHelp
export abstract class AggregateOrFindCursor<
  CursorType extends
    | ServiceProviderAggregationCursor
    | ServiceProviderFindCursor,
  M extends GenericServerSideSchema = GenericServerSideSchema
> extends AbstractCursor<CursorType, M> {
  @returnType('this')
  projection(spec: Document): this {
    this._cursor.project(spec);
    return this;
  }

  @returnType('this')
  skip(value: number): this {
    this._cursor.skip(value);
    return this;
  }

  @returnType('this')
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
