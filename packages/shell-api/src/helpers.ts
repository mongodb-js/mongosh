/**
 * Helper method to adapt aggregation pipeline options.
 * This is here so that it's not visible to the user.
 *
 * @param options
 */
import { DatabaseOptions, Document } from '@mongosh/service-provider-core';
import { MongoshInvalidInputError } from '@mongosh/errors';

export function adaptAggregateOptions(options: any = {}): {
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

export function validateExplainableVerbosity(verbosity: string): void {
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

export function checkUndefinedUpdate(...args: any): void {
  if (args.some(a => a === undefined)) {
    throw new MongoshInvalidInputError('Cannot pass an undefined argument to a command');
  }
}
