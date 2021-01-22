import v8 from 'v8';
import { ShellResult } from '@mongosh/shell-evaluator';
import { inspect } from 'util';

export function serialize(data: unknown): string {
  return `data:;base64,${v8.serialize(data).toString('base64')}`;
}

export function deserialize<T = unknown>(str: string): T | string {
  if (/^data:;base64,.+/.test(str)) {
    return v8.deserialize(
      Buffer.from(str.replace('data:;base64,', ''), 'base64')
    );
  }
  return str;
}

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
  const keys = getNames(err).concat('name');
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

export enum SerializedResultTypes {
  SerializedErrorResult = 'SerializedErrorResult',
  InspectResult = 'InspectResult'
}

export function serializeEvaluationResult(result: ShellResult): ShellResult {
  result = { ...result };

  // Type `null` indicates anything that is not returned by shell-api, any
  // usual javascript value returned from evaluation
  if (result.type === null) {
    // Errors get special treatment to achieve better serialization
    if (isError(result.rawValue)) {
      result.type = SerializedResultTypes.SerializedErrorResult;
      result.printable = serializeError(result.rawValue);
    } else if (!isPrimitive(result.rawValue)) {
      // For everything else that is not a primitive value there is just too
      // many possible combinations of data types to distinguish between them,
      // if we don't know the type and it's not an error, let's inspect and
      // return an inspection result
      result.type = SerializedResultTypes.InspectResult;
      result.printable = inspect(result.rawValue);
    }
  }

  // `rawValue` can't be serialized "by design", we don't really care about it
  // for the worker thread runtime so as an easy workaround we will just remove
  // it completely from the result
  delete result.rawValue;

  return result;
}

export function deserializeEvaluationResult(result: ShellResult): ShellResult {
  result = { ...result };

  if (result.type === SerializedResultTypes.SerializedErrorResult) {
    result.type = null;
    result.printable = deserializeError(result.printable);
  }

  Object.defineProperty(result, 'rawValue', {
    get() {
      throw new Error(
        '`rawValue` is not available for evaluation result produced by WorkerRuntime'
      );
    }
  });

  return result;
}
