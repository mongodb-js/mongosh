import type { Interface as ReadlineInterface } from 'readline';
import type { REPLServer } from 'repl';
import { PassThrough } from 'stream';

// https://github.com/nodejs/node/blob/d9786109b2a0982677135f0c146f6b591a0e4961/lib/internal/readline/utils.js#L90
// https://nodejs.org/api/readline.html#readlineemitkeypresseventsstream-interface
export type KeypressKey = {
  sequence: string | null;
  name: string | undefined;
  ctrl: boolean;
  meta: boolean;
  shift: boolean;
  code?: string;
};

export function* prototypeChain(obj: unknown): Iterable<unknown> {
  if (!obj) return;
  yield obj;
  yield* prototypeChain(Object.getPrototypeOf(obj));
}

export function installPasteSupport(repl: REPLServer): string {
  if (!repl.terminal || process.env.TERM === 'dumb') return ''; // No paste needed in non-terminal environments

  // TODO(MONGOSH-1911): Upstream as much of this into Node.js core as possible,
  // both because of the value to the wider community but also because this is
  // messing with Node.js REPL internals to a very unfortunate degree.
  repl.output.write('\x1b[?2004h'); // Indicate support for paste mode
  const onEnd = '\x1b[?2004l'; // End of support for paste mode
  // Find the symbol used for the (internal) _ttyWrite method of readline.Interface
  // https://github.com/nodejs/node/blob/d9786109b2a0982677135f0c146f6b591a0e4961/lib/internal/readline/interface.js#L1056
  const ttyWriteKey = [...prototypeChain(repl)]
    .flatMap((proto) => Object.getOwnPropertySymbols(proto))
    .find((s) => String(s).includes('(_ttyWrite)'));
  if (!ttyWriteKey)
    throw new Error('Could not find _ttyWrite key on readline instance');
  repl.input.on('keypress', (s: string, key: KeypressKey) => {
    if (key.name === 'paste-start') {
      if (Object.prototype.hasOwnProperty.call(repl, ttyWriteKey))
        throw new Error(
          'Unexpected existing own _ttyWrite key on readline instance'
        );
      const origTtyWrite = (repl as any)[ttyWriteKey];
      Object.defineProperty(repl as any, ttyWriteKey, {
        value: function (s: string, key: KeypressKey) {
          if (key.ctrl || key.meta || key.code) {
            // Special character or escape code sequence, ignore while pasting
            return;
          }
          if (
            key.name &&
            key.name !== key.sequence?.toLowerCase() &&
            !['tab', 'return', 'enter', 'space'].includes(key.name)
          ) {
            // Special character or escape code sequence, ignore while pasting
            return;
          }
          return origTtyWrite.call(this, s, key);
        },
        enumerable: false,
        writable: true,
        configurable: true,
      });
    } else if (key.name === 'paste-end') {
      delete (repl as any)[ttyWriteKey];
    }
  });
  return onEnd;
}

// Bug: https://github.com/nodejs/node/issues/60446
// Introduced by: https://github.com/nodejs/node/pull/59857
// Fixed by: https://github.com/nodejs/node/pull/60470
function _hasNode60446(): boolean {
  // repl is not supported in startup snapshots yet
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { start } = require('repl');

  const input = new PassThrough();
  const output = new PassThrough();
  const repl = start({ terminal: true, input, output, useColors: false });
  repl.input.emit('data', '{}');
  repl.input.emit('keypress', '', { name: 'left' });
  repl.input.emit('data', 'node');
  const { line } = repl;
  repl.close();
  return line === '{}noed';
}
let hasNode60446: boolean | undefined = undefined;

export function fixNode60446(repl: ReadlineInterface): void {
  hasNode60446 ??= _hasNode60446();
  if (!hasNode60446) return;
  const symbols = [...prototypeChain(repl)].flatMap((proto) =>
    Object.getOwnPropertySymbols(proto)
  );
  const insertStringKey = symbols.find((s) =>
    String(s).includes('(_insertString)')
  );
  const writeToOutputKey = symbols.find((s) =>
    String(s).includes('(_writeToOutput)')
  );
  if (!insertStringKey || !writeToOutputKey) return;
  const original = (repl as any)[insertStringKey];

  // Monkey-patch in the fix linked above
  let fixupOnWriteToOutput: undefined | (() => void);
  Object.defineProperty(repl as any, insertStringKey, {
    configurable: true,
    writable: true,
    enumerable: false,
    value: function (this: ReadlineInterface, s: string) {
      if (!(this as any).isCompletionEnabled) {
        const origLine = this.line;
        const origCursor = this.cursor;
        fixupOnWriteToOutput = () => {
          const beg = origLine.slice(0, origCursor);
          const end = origLine.slice(origCursor);
          (this as any).line = beg + s + end;
        };
      }
      return original.call(this, s);
    },
  });
  const originalWriteToOutput = (repl as any)[writeToOutputKey];
  Object.defineProperty(repl as any, writeToOutputKey, {
    configurable: true,
    writable: true,
    enumerable: false,
    value: function (this: ReadlineInterface, s: string) {
      fixupOnWriteToOutput?.();
      fixupOnWriteToOutput = undefined;
      return originalWriteToOutput.call(this, s);
    },
  });
}
