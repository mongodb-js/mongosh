import { PassThrough } from 'stream';

function awaitNextPrompt(repl: any): Promise<void> {
  return new Promise((resolve) => {
    const original = repl.displayPrompt.bind(repl);

    repl.displayPrompt = function (...args: any[]) {
      repl.displayPrompt = original; // restore immediately
      resolve();
      return original(...args);
    };
  });
}

// Node.js 24.13.0+ has a bug where when there is a single-line failed command, it's dropped
// from the history. We will try to detect this and, whenever this happens, we will fix it by
// overwriting this[kAddHistory]() to ignore this[kLastCommandErrored] and provide false.
let replHasNodeBug: boolean | undefined;
async function detectReplNodeBug(): Promise<boolean> {
  // 'repl' is not supported in startup snapshots yet.
  const { start: replStart } =
    // eslint-disable-next-line @typescript-eslint/consistent-type-imports, @typescript-eslint/no-var-requires
    require('repl') as typeof import('repl');
  const input = new PassThrough();
  const repl = replStart({
    input,
    output: new PassThrough(),
    terminal: true,
    useGlobal: true,
    eval(evalCmd: string, context, file, cb) {
      try {
        cb(null, eval(evalCmd));
      } catch (e) {
        cb(e as Error, null);
      }
    },
  });

  try {
    input.write('__mongoshInternal__ThisDoesNotExist\n');
    const nextPromptPromise = awaitNextPrompt(repl);
    input.write('42\n');
    await nextPromptPromise;

    const history =
      (repl as any).historyManager?.history ?? (repl as any)?.history ?? [];

    return history.length < 2;
  } finally {
    repl.close();
  }
}

function getAllOwnSymbols(obj: object): symbol[] {
  const out: symbol[] = [];
  const seen = new Set<symbol>();

  for (let cur: any = obj; cur !== null; cur = Object.getPrototypeOf(cur)) {
    for (const sym of Object.getOwnPropertySymbols(cur)) {
      if (!seen.has(sym)) {
        seen.add(sym);
        out.push(sym);
      }
    }
  }

  return out;
}

export async function fixNodeReplHistoryHandler(
  repl: REPLServer
): Promise<void> {
  replHasNodeBug ??= await detectReplNodeBug();

  if (!replHasNodeBug) {
    return;
  }

  const replSymbols = getAllOwnSymbols(repl);
  const kIsMultiline = replSymbols.find((s) =>
    String(s).includes('(_isMultiline)')
  );
  const kAddHistory = replSymbols.find((s) =>
    String(s).includes('(_addHistory)')
  );

  if (!kAddHistory || !kIsMultiline) {
    console.error('Node.js 24+ History bug detected but could not patch it.');
    return;
  }

  const replUnsafe = repl as any;

  Object.defineProperty(replUnsafe, kAddHistory, {
    value: function (this: any) {
      return this.historyManager.addHistory(this[kIsMultiline], false);
    }.bind(replUnsafe),
    writable: false,
    configurable: false,
  });
}
