import v8 from 'v8';
import { inspect } from 'util';
import { EJSON, Document } from 'bson';
import { RuntimeEvaluationResult } from '@mongosh/browser-runtime-core';

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
  InspectResult = 'InspectResult',
  SerializedShellApiResult = 'SerializedShellApiResult'
}

type SerializedShellApiResult = {
  origType: string;
  serializedValue: Document;
  nonEnumPropertyDescriptors: Record<string, PropertyDescriptor>;
};

export function serializeEvaluationResult(
  result: RuntimeEvaluationResult
): RuntimeEvaluationResult {
  result = { ...result };

  // Type `null` indicates anything that is not returned by shell-api, any
  // usual javascript value returned from evaluation
  if (result.type === null) {
    // Errors get special treatment to achieve better serialization
    if (isError(result.printable)) {
      result.type = SerializedResultTypes.SerializedErrorResult;
      result.printable = serializeError(result.printable);
    } else if (!isPrimitive(result.printable)) {
      // For everything else that is not a primitive value there is just too
      // many possible combinations of data types to distinguish between them,
      // if we don't know the type and it's not an error, let's inspect and
      // return an inspection result
      result.type = SerializedResultTypes.InspectResult;
      result.printable = inspect(result.printable);
    }
  } else if (!isPrimitive(result.printable)) {
    // If type is present we are dealing with shell-api return value. In most
    // cases printable values of shell-api are primitive or serializable as
    // (E)JSON, but they also might have some non-enumerable stuff (looking at
    // you, Cursor!) that we need to serialize additionally, otherwiser those
    // params will be lost in the ether causing issues down the way
    const origType = result.type;
    result.type = SerializedResultTypes.SerializedShellApiResult;
    result.printable = {
      origType,
      serializedValue: EJSON.serialize(result.printable),
      nonEnumPropertyDescriptors: Object.fromEntries(
        Object.entries(
          Object.getOwnPropertyDescriptors(result.printable)
        ).filter(([, descriptor]) => !descriptor.enumerable)
      )
    };
  }

  return result;
}

export function deserializeEvaluationResult(
  result: RuntimeEvaluationResult
): RuntimeEvaluationResult {
  result = { ...result };

  if (result.type === SerializedResultTypes.SerializedErrorResult) {
    result.type = null;
    result.printable = deserializeError(result.printable);
  }

  if (result.type === SerializedResultTypes.SerializedShellApiResult) {
    const value: SerializedShellApiResult = result.printable;
    const printable = EJSON.deserialize(value.serializedValue);

    // Primitives should not end up here ever, but we need to convince TS that
    // its true
    if (!isPrimitive(printable)) {
      Object.defineProperties(printable, value.nonEnumPropertyDescriptors);
    }

    result.type = value.origType;
    result.printable = printable;
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
