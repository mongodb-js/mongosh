import { AggregationCursor, Cursor, Database } from './index';
import { EventEmitter } from 'events';
import { DatabaseOptions, Document } from '@mongosh/service-provider-core';
import { MongoshInvalidInputError } from '@mongosh/errors';

export default class ShellInternalState {
  public currentCursor: Cursor | AggregationCursor;
  public currentDb: Database;
  public messageBus: EventEmitter;
  public context: any;
  constructor(messageBus) {
    this.messageBus = messageBus;
    this.currentCursor = null;
    this.currentDb = null;
    this.context = null;
  }
  public emitApiCall(event: {
    method: string;
    class: string;
    arguments: Document;
    [otherProps: string]: any;
  }): void {
    this.messageBus.emit('mongosh:api-call', event);
  }

  /**
   * Helper method to adapt aggregation pipeline options.
   * This is here so that it's not visible to the user.
   *
   * @param options
   */
  public adaptAggregateOptions(options: any = {}): {
    providerOptions: Document;
    dbOptions: DatabaseOptions;
    explain: boolean;
  } {
    const providerOptions = { ...options };

    const dbOptions: DatabaseOptions = {};
    let explain = false;

    if ('readConcern' in providerOptions) {
      dbOptions.readConcern = options.readConcern;
      delete providerOptions.readConcern;
    }

    if ('writeConcern' in providerOptions) {
      Object.assign(dbOptions, options.writeConcern);
      delete providerOptions.writeConcern;
    }

    if ('explain' in providerOptions) {
      explain = providerOptions.explain;
      delete providerOptions.explain;
    }

    return { providerOptions, dbOptions, explain };
  }

  public validateExplainableVerbosity(verbosity: string): void {
    const allowedVerbosity = [
      'queryPlanner',
      'executionStats',
      'allPlansExecution'
    ];

    if (!allowedVerbosity.includes(verbosity)) {
      throw new MongoshInvalidInputError(
        `verbosity can only be one of ${allowedVerbosity.join(', ')}. Received ${verbosity}.`
      );
    }
  }
}

