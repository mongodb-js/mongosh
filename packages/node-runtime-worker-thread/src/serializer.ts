import { ShellResult } from '@mongosh/shell-evaluator';

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
