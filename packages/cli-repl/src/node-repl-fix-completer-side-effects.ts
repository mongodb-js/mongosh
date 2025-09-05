import type { CompleterResult } from 'readline';
import { start as replStart } from 'repl';
import { PassThrough } from 'stream';
import { promisify } from 'util';

// Detect whether the issue described in https://github.com/nodejs/node/pull/59774
// occurs in this version of Node.js or not.
let replHasNodeBug59774: boolean | undefined;
async function detectReplNodeBug59774(): Promise<boolean> {
  const repl = replStart({
    input: new PassThrough(),
    output: new PassThrough(),
    terminal: true,
    useGlobal: false,
  });
  let ranFunction = false;
  repl.context.causeSideEffect = () => (ranFunction = true);
  try {
    await promisify(repl.completer)('causeSideEffect().x');
  } finally {
    repl.close();
  }
  return ranFunction;
}

type AsyncCompleter = (line: string) => Promise<CompleterResult | undefined>;
export async function fixNodeReplCompleterSideEffectHandling(
  completer: AsyncCompleter
): Promise<AsyncCompleter> {
  replHasNodeBug59774 ??= await detectReplNodeBug59774();

  return async (text: string): Promise<CompleterResult | undefined> => {
    const line = text.trimStart();
    // If our REPL instance isn't buggy, or if we are not taking the broken code path,
    // we can just return normal completion results.
    if (
      !replHasNodeBug59774 ||
      // https://github.com/nodejs/node/blob/07220230d9effcb4822d7a55563a86af3764540c/lib/repl.js#L1350
      /^\s*\.(\w*)$/.exec(line) !== null ||
      // https://github.com/nodejs/node/blob/07220230d9effcb4822d7a55563a86af3764540c/lib/repl.js#L1226
      /\brequire\s*\(\s*['"`](([\w@./:-]+\/)?(?:[\w@./:-]*))(?![^'"`])$/.exec(
        line
      ) !== null ||
      // https://github.com/nodejs/node/blob/07220230d9effcb4822d7a55563a86af3764540c/lib/repl.js#L1225
      /\bimport\s*\(\s*['"`](([\w@./:-]+\/)?(?:[\w@./:-]*))(?![^'"`])$/.exec(
        line
      ) !== null ||
      // https://github.com/nodejs/node/blob/07220230d9effcb4822d7a55563a86af3764540c/lib/repl.js#L1493
      line.length === 0 ||
      // https://github.com/nodejs/node/blob/07220230d9effcb4822d7a55563a86af3764540c/lib/repl.js#L1494
      // https://github.com/nodejs/node/blob/fdef0725de03a719c78757bd9aae2b01e4bc7863/lib/repl.js#L1487
      /\w|\.|\$/.exec(line[line.length - 1]) === null
    ) {
      return await completer(text);
    }

    // If we are taking the broken code path, we can perform a match using the old RegExp from before
    // 07220230d9e and just run completion on that match.
    // https://github.com/nodejs/node/blame/ea5d37ecbebabd754201b2a0b4fe47d1e2ed07e1/lib/repl.js
    const simpleMatch =
      /(?:[\w$'"`[{(](?:\w|\$|['"`\]})])*\??\.)*[a-zA-Z_$](?:\w|\$)*\??\.?$/.exec(
        line
      );
    if (simpleMatch !== null) {
      return await completer(simpleMatch[0]);
    }

    return [[], text];
  };
}
