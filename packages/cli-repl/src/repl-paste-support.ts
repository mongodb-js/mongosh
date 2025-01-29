import type { REPLServer } from 'repl';

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

function* prototypeChain(obj: unknown): Iterable<unknown> {
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
