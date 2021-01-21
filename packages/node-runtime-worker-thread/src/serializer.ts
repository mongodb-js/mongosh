import v8 from 'v8';
import { ShellResult } from '@mongosh/shell-evaluator';

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

function isError(e: any): e is Error {
  return e && e.name && e.message && e.stack;
}

/**
 * Extracts non-enumerable params from errors so they can be serialized and
 * de-serialized when passed between threads.
 *
 * Even though v8 {de}serialize supports Error serialization, some data (e.g.,
 * error `name` if you have a custom error) still can be lost during this
 * process, so serializing it produces a better output.
 */
export function serializeError({
  message,
  name,
  stack,
  code,
  errno,
  path,
  syscall
}: NodeJS.ErrnoException) {
  return { message, name, stack, code, errno, path, syscall };
}

/**
 * Creates an instance of Error from error params (Error-like objects)
 */
export function deserializeError(e: NodeJS.ErrnoException) {
  return Object.assign(new Error(), e);
}

enum SerializedResultTypes {
  SerializedErrorResult = 'SerializedErrorResult'
}

export function serializeEvaluationResult(result: ShellResult): ShellResult {
  result = { ...result };

  if (result.type === null && isError(result.rawValue)) {
    result.type = SerializedResultTypes.SerializedErrorResult;
    result.printable = serializeError(result.rawValue);
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
