/**
 * TODO: A bunch of things here are copy-pasted from browser-repl, but can be
 * shared
 */

import { inspect } from './todo_this_needs_to_be_a_separate_package__inspect';

function serializeProfileResult({ result, count }) {
  if (count === 0) {
    return 'db.system.profile is empty.\nUse db.setProfilingLevel(2) will enable profiling.\nUse db.getCollection("system.profile").find() to show raw profile entries.';
  }

  // direct from old shell
  const toret = result.map((x) => {
    const res = `${x.op}    ${x.ns} ${x.millis}ms ${String(x.ts).substring(
      0,
      24
    )}\n`;
    let l = '';
    for (const z in x) {
      if (z === 'op' || z === 'ns' || z === 'millis' || z === 'ts') {
        continue;
      }

      const val = x[z];
      const mytype = typeof val;

      if (mytype === 'object') {
        l += z + ':' + inspect(val) + ' ';
      } else if (mytype === 'boolean') {
        l += z + ' ';
      } else {
        l += z + ':' + val + ' ';
      }
    }
    return `${res}${l}`;
  });

  return toret.join('\n\n');
}

function isError(value) {
  return typeof value.message === 'string' && typeof value.stack === 'string';
}

function isPrimitiveOrFunction(value) {
  // any primitive type including 'null' and 'undefined',
  // function and classes
  return value !== Object(value) || typeof value === 'function';
}

export function serializeError(e) {
  return { name: e.name, code: e.code, message: e.message, stack: e.stack };
}

// eslint-disable-next-line complexity
export function serializeResult(result) {
  const { type, printable } = result;

  if (typeof printable === 'string' && type !== null) {
    return result;
    // return <SimpleTypeOutput value={printable} raw />;
  }

  if (isPrimitiveOrFunction(printable)) {
    return { printable: inspect(printable) };
    // return <SimpleTypeOutput value={printable} />;
  }

  if (type === 'Help') {
    return result;
    // return <HelpOutput value={value} />;
  }

  if (type === 'ShowDatabasesResult') {
    return result;
    // return <ShowDbsOutput value={value} />;
  }

  if (type === 'StatsResult') {
    return result;
    // return <StatsResultOutput value={value} />;
  }

  if (type === 'ListCommandsResult') {
    return { printable: inspect(printable) };
    // return <SimpleTypeOutput value={printable} />;
  }

  if (type === 'ShowCollectionsResult') {
    return result;
    // return <ShowCollectionsOutput value={printable} />;
  }

  if (type === 'Cursor') {
    return { type, printable: printable.map(inspect) };
    // return <CursorOutput value={printable} />;
  }

  if (type === 'CursorIterationResult') {
    return { type, printable: printable.map(inspect) };
    // return <CursorIterationResultOutput value={printable} />;
  }

  if (type === 'ShowProfileResult') {
    return { printable: serializeProfileResult(printable) };
    // return <ShowProfileOutput value={printable} />;
  }

  if (isError(printable)) {
    return { printable: serializeError(printable) };
    // return <ErrorOutput value={printable} />;
  }

  return { printable: inspect(printable) };
}
