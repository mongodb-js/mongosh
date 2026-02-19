import { inspect } from 'util';
import { EJSON } from 'bson';
import type { RuntimeEvaluationResult } from '@mongosh/browser-runtime-core';
import type { DevtoolsConnectOptions } from '@mongosh/service-provider-node-driver';

function isPrimitive(
  val: any
): val is boolean | string | number | undefined | null {
  return (typeof val !== 'object' && typeof val !== 'function') || val === null;
}

function isError(val: any): val is Error {
  return val && val.name && val.message && val.stack;
}

function getNames<T>(obj: T): (keyof T)[] {
  return Object.getOwnPropertyNames(obj) as (keyof T)[];
}

/**
 * Extracts non-enumerable params from errors so they can be serialized and
 * de-serialized when passed between threads.
 *
 * Even though v8 {de}serialize supports Error serialization, some data (e.g.,
 * error `name` if you have a custom error) still can be lost during this
 * process, so serializing it produces a better output.
 */
export function serializeError(err: Error) {
  // Name is the only constructor property we care about
  const keys = getNames(err)
    .concat('name')
    // structured cloning cannot handle functions
    .filter((key) => typeof err[key] !== 'function');
  return keys.reduce((acc, key) => {
    (acc as any)[key] = err[key];
    return acc;
  }, {} as Error);
}

/**
 * Creates an instance of Error from error params (Error-like objects)
 */
export function deserializeError(err: any): Error {
  return Object.assign(new Error(), err);
}

export type SerializedResultTypes =
  | 'SerializedErrorResult'
  | 'InspectResult'
  | 'SerializedShellApiResult';

export function serializeEvaluationResult({
  type,
  printable,
  source,
  constructionOptions,
}: RuntimeEvaluationResult): RuntimeEvaluationResult {
  // Primitive values don't require any special treatment for serialization
  if (isPrimitive(printable)) {
    return { type, printable, source, constructionOptions };
  }

  // Errors are serialized as some error metadata can be lost without this
  if (isError(printable)) {
    return {
      type: 'SerializedErrorResult',
      printable: serializeError(printable),
      source,
    };
  }

  // `null` type indicates evaluation result that is anyuthing, but shell-api
  // result. There are too many different combinations of what this can be, both
  // easily serializable and completely non-serializable. Instead of handing
  // those cases and becase we don't really care for preserving those as close
  // to real value as possible, we will convert them to inspect string result
  // before passing to the main thread
  if (type === null) {
    return {
      type: 'InspectResult',
      printable: inspect(printable),
      source,
    };
  }

  // For everything else that we consider a shell-api result we will do our best
  // to preserve as much information as possible, including serializing the
  // printable value to EJSON as its a common thing to be returned by shell-api
  return {
    type: 'SerializedShellApiResult',
    printable: {
      origType: type,
      serializedValue: EJSON.serialize(printable),
    },
  };
}

export function deserializeEvaluationResult({
  type,
  printable,
  source,
  constructionOptions,
}: RuntimeEvaluationResult): RuntimeEvaluationResult {
  if (type === 'SerializedErrorResult') {
    return { type, printable: deserializeError(printable), source };
  }

  if (type === 'SerializedShellApiResult') {
    return {
      type: printable.origType,
      printable: EJSON.deserialize(printable.serializedValue),
      source,
    };
  }

  return { type, printable, source, constructionOptions };
}

const autoEncryptionBSONOptions = ['schemaMap', 'encryptedFieldsMap'] as const;

export function serializeConnectOptions(
  options: Readonly<DevtoolsConnectOptions>
): DevtoolsConnectOptions {
  const serializedOptions = { ...options };
  for (const autoEncryptionOption of autoEncryptionBSONOptions) {
    if (serializedOptions.autoEncryption?.[autoEncryptionOption]) {
      serializedOptions.autoEncryption = {
        ...serializedOptions.autoEncryption,
        [autoEncryptionOption]: EJSON.serialize(
          serializedOptions.autoEncryption[autoEncryptionOption],
          { relaxed: false }
        ),
      };
    }
  }
  return serializedOptions;
}

export function deserializeConnectOptions(
  options: Readonly<DevtoolsConnectOptions>
): DevtoolsConnectOptions {
  const deserializedOptions: any = { ...options };
  for (const autoEncryptionOption of autoEncryptionBSONOptions) {
    if (deserializedOptions.autoEncryption?.[autoEncryptionOption]) {
      deserializedOptions.autoEncryption = {
        ...deserializedOptions.autoEncryption,
        [autoEncryptionOption]: EJSON.deserialize(
          deserializedOptions.autoEncryption[autoEncryptionOption],
          { relaxed: false }
        ),
      };
    }
  }
  return deserializedOptions;
}
