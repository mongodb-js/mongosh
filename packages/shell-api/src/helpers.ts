/**
 * Helper method to adapt aggregation pipeline options.
 * This is here so that it's not visible to the user.
 *
 * @param options
 */
import { DatabaseOptions, Document } from '@mongosh/service-provider-core';
import { MongoshInvalidInputError } from '@mongosh/errors';
import crypto from 'crypto';

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
    throw new MongoshInvalidInputError('Missing required argument');
  }
}

/**
 * Helper method to adapt objects that are slightly different from Shell to SP API.
 *
 * @param {Object} shellToCommand - a map of the shell key to the command key. If null, then omit.
 * @param {Object} shellDoc - the document to be adapted
 */
export function adaptOptions(shellToCommand: any, additions: any, shellDoc: any): any {
  return Object.keys(shellDoc).reduce((result, shellKey) => {
    if (shellToCommand[shellKey] === null) {
      return result;
    }
    result[ shellToCommand[shellKey] || shellKey ] = shellDoc[shellKey];
    return result;
  }, additions);
}

/**
 * Optionally digest password if passwordDigestor field set to 'client'. If it's false,
 * then hash the password.
 *
 * @param username
 * @param passwordDigestor
 * @param {Object} command
 */
export function processDigestPassword(username, passwordDigestor, command): any {
  if (passwordDigestor === undefined) {
    return {};
  }
  if (passwordDigestor !== 'server' && passwordDigestor !== 'client') {
    throw new MongoshInvalidInputError(
      `Invalid field: passwordDigestor must be 'client' or 'server', got ${passwordDigestor}`
    );
  }
  if (passwordDigestor === 'client') {
    if (typeof command.pwd !== 'string') {
      throw new MongoshInvalidInputError(
        `User passwords must be of type string. Was given password with type ${typeof command.pwd}`
      );
    }
    const hash = crypto.createHash('md5');
    hash.update(`${username}:mongo:${command.pwd}`);
    const digested = hash.digest('hex');
    return { digestPassword: false, pwd: digested };
  }
  return { digestPassword: true };
}
