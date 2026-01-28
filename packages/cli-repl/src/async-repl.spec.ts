import type { REPLServer } from 'repl';
import { start as originalStart } from 'repl';
import type { OriginalEvalFunction, AsyncREPLOptions } from './async-repl';
import { start, evalStart, evalFinish } from './async-repl';
import type { Readable, Writable } from 'stream';
import { PassThrough } from 'stream';
import { promisify, inspect } from 'util';
import { once } from 'events';
import * as chai from 'chai';
import { expect } from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import { tick } from '../test/repl-helpers';
chai.use(sinonChai);

const delay = promisify(setTimeout);

function createDefaultAsyncRepl(extraOpts: Partial<AsyncREPLOptions> = {}): {
  input: Writable;
  output: Readable;
  repl: REPLServer;
} {
  const input = new PassThrough();
  const output = new PassThrough({ encoding: 'utf8' });

  const repl = start({
    input: input,
    output: output,
    prompt: '> ',
    asyncEval: async (
      originalEval: OriginalEvalFunction,
      input: string,
      context: any,
      filename: string
    ) => {
      return originalEval(input, context, filename);
    },
    ...extraOpts,
  });
  Object.assign(repl.context, { process, console });
  return { input, output, repl };
}

async function expectInStream(
  stream: Readable,
  substring: string,
  timeoutMs: number | null = 5000
): Promise<void> {
  let content = '';
  let ended = false;
  const result = await Promise.race([
    (async () => {
      for await (const chunk of stream) {
        content += chunk;
        if (content.includes(substring)) {
          break;
        }
      }
      ended = true;
      return 'normal-completion' as const;
    })(),
    ...(timeoutMs ? [delay(timeoutMs).then(() => 'timeout' as const)] : []),
  ]);
  if (result === 'timeout') {
    throw new Error(
      `Timeout waiting for substring: ${substring}, found so far: ${content} (ended = ${ended})`
    );
  }
  expect(content).to.include(substring);
}

describe('AsyncRepl', function () {
  before(function () {
    this.timeout(10000);
    // nyc adds its own SIGINT listener that annoys use here.
    process.removeAllListeners('SIGINT');
  });

  it('performs basic synchronous evaluation', async function () {
    const { input, output } = createDefaultAsyncRepl();

    input.write('34 + 55\n');
    await expectInStream(output, '89');
  });

  it('performs basic asynchronous evaluation', async function () {
    const { input, output } = createDefaultAsyncRepl();

    input.write('Promise.resolve(34 + 55)\n');
    await expectInStream(output, '89');
  });

  it('allows sync interruption through SIGINT', async function () {
    if (process.platform === 'win32') {
      return this.skip(); // No SIGINT on Windows.
    }

    const { input, output, repl } = createDefaultAsyncRepl({
      onAsyncSigint: () => false,
    });

    const finished = once(repl, evalFinish);
    input.write('while (true) { process.kill(process.pid, "SIGINT"); }\n');
    await expectInStream(output, 'execution was interrupted');
    await finished;
  });

  it('allows async interruption through SIGINT', async function () {
    if (process.platform === 'win32') {
      return this.skip(); // No SIGINT on Windows.
    }

    const onAsyncSigint = sinon.stub().resolves(false);
    const { input, output, repl } = createDefaultAsyncRepl({
      onAsyncSigint: onAsyncSigint,
    });

    const finished = once(repl, evalFinish);
    input.write('new Promise(oopsIdontResolve => 0)\n');
    await delay(100);
    process.kill(process.pid, 'SIGINT');
    await expectInStream(output, 'execution was interrupted');
    expect(onAsyncSigint).to.have.been.calledOnce;
    await finished;
  });

  it('handles synchronous exceptions well', async function () {
    const { input, output } = createDefaultAsyncRepl();

    input.write('throw new Error("meow")\n');
    await expectInStream(output, 'meow');
  });

  it('disables raw mode for input during both sync and async evaluation when async sigint is enabled', async function () {
    const { input, output, repl } = createDefaultAsyncRepl({
      onAsyncSigint: () => false,
    });
    let isRaw = true;
    Object.defineProperty(input, 'isRaw', {
      get() {
        return isRaw;
      },
      enumerable: true,
    });
    (input as any).setRawMode = (value: boolean) => {
      isRaw = value;
    };
    repl.context.isRawMode = () => isRaw;

    input.write(
      'const before = isRawMode(); new Promise(setImmediate).then(() => ({before, after: isRawMode()}))\n'
    );
    await expectInStream(output, 'before: false, after: false');
    expect(isRaw).to.equal(true);
  });

  it('handles asynchronous exceptions well', async function () {
    const { input, output } = createDefaultAsyncRepl();

    input.write('Promise.reject(new Error("meow"))\n');
    await expectInStream(output, 'meow');
  });

  it('handles recoverable syntax errors well', async function () {
    const { input, output } = createDefaultAsyncRepl();

    input.write('{ uptime: process.uptime(\n');
    let wroteClosingParenthesis = false;
    let foundUid = false;
    for await (const chunk of output) {
      if (chunk.includes('|') && !wroteClosingParenthesis) {
        input.write(')}\n');
        wroteClosingParenthesis = true;
      }
      if (chunk.includes('uptime:')) {
        foundUid = true;
        break;
      }
    }
    expect(foundUid).to.be.true;
  });

  it('delays the "exit" event until after asynchronous evaluation is finished', async function () {
    const { input, repl } = createDefaultAsyncRepl();
    let exited = false;
    repl.on('exit', () => {
      exited = true;
    });

    let resolve!: () => void;
    repl.context.asyncFn = () =>
      new Promise<void>((res) => {
        resolve = res;
      });

    input.end('asyncFn()\n');
    expect(exited).to.be.false;

    await tick();
    resolve();
    expect(exited).to.be.false;

    await tick();
    expect(exited).to.be.true;
  });

  describe('allows handling exceptions from e.g. the writer function', function () {
    it('for succesful completions', async function () {
      const error = new Error('throwme');
      const { input, output } = createDefaultAsyncRepl({
        writer: (value: any): string => {
          if (value === 'meow') {
            throw error;
          }
          return inspect(value);
        },
        wrapCallbackError: (err: Error): Error => {
          return new Error('saw this error: ' + err.message);
        },
      });

      input.write('"meow"\n');
      await expectInStream(output, 'saw this error: throwme');
    });

    it('for unsuccesful completions', async function () {
      const error = new Error('throwme');
      const { input, output } = createDefaultAsyncRepl({
        writer: (value: any): string => {
          if (value?.message === 'meow') {
            throw error;
          }
          return inspect(value);
        },
        wrapCallbackError: (err: Error): Error => {
          return new Error('saw this error: ' + err.message);
        },
      });

      input.write('throw new Error("meow")\n');
      await expectInStream(output, 'saw this error: throwme');
    });

    it('defaults to passing the error through as-is', async function () {
      const error = new Error('raw error');
      const { input, output } = createDefaultAsyncRepl({
        writer: (value: any): string => {
          if (value?.message === 'meow') {
            throw error;
          }
          return inspect(value);
        },
      });

      input.write('throw new Error("meow")\n');
      await expectInStream(output, 'raw error');
    });
  });

  it('allows customizing the repl.start function', function () {
    const { repl } = createDefaultAsyncRepl({
      start: (options) => {
        const repl = originalStart(options);
        repl.pause();
        return repl;
      },
    });

    expect((repl as any).paused).to.be.true;
  });

  // This one is really just for test coverage. :)
  it('allows emitting any kind of event on the active Domain', async function () {
    const { input, output, repl } = createDefaultAsyncRepl();
    repl.context.onEvent = sinon.spy();

    input.write(
      'process.domain.on("x", onEvent); process.domain.emit("x"); 0\n'
    );
    await expectInStream(output, '0');
    expect(repl.context.onEvent).to.have.been.calledWith();
  });

  context('emits information about the current evaluation', function () {
    it('for successful completion', async function () {
      const { input, repl } = createDefaultAsyncRepl();
      const startEvent = once(repl, evalStart);
      const finishEvent = once(repl, evalFinish);
      input.write('a = 1\n');
      expect(await startEvent).to.deep.equal([
        {
          input: 'a = 1\n',
        },
      ]);
      expect(await finishEvent).to.deep.equal([
        {
          input: 'a = 1\n',
          success: true,
        },
      ]);
    });

    it('for error completion', async function () {
      const { input, repl } = createDefaultAsyncRepl();
      const finishEvent = once(repl, evalFinish);
      input.write('throw { msg: "foo" }\n');
      expect(await finishEvent).to.deep.equal([
        {
          input: 'throw { msg: "foo" }\n',
          success: false,
          recoverable: false,
          err: { msg: 'foo' },
        },
      ]);
    });

    it('for unfinished (incomplete multiline) input', async function () {
      const { input, repl } = createDefaultAsyncRepl();
      const finishEvent = once(repl, evalFinish);
      input.write('({\n');
      const ev = (await finishEvent)[0];
      expect(ev).to.deep.equal({
        input: '({\n',
        success: false,
        recoverable: true,
        err: ev.err,
      });
    });
  });

  it('does not run pasted text immediately', async function () {
    const { input, output } = createDefaultAsyncRepl({
      terminal: true,
      useColors: false,
    });

    output.read(); // Read prompt so it doesn't mess with further output
    input.write('\x1b[200~1234\n*5678\n\x1b[201~');
    await tick();
    expect(output.read()).to.equal('1234\r\n| *5678\r\n| ');
    input.write('\n');
    await tick();
    // Contains the expected result after hitting newline
    expect(output.read()).to.equal('\r\n7006652\n> ');
  });

  it('allows using ctrl+c to avoid running pasted text', async function () {
    const { input, output } = createDefaultAsyncRepl({
      terminal: true,
      useColors: false,
    });

    output.read(); // Read prompt so it doesn't mess with further output
    input.write('\x1b[200~1234\n*5678\n\x1b[201~');
    await tick();
    expect(output.read()).to.equal('1234\r\n| *5678\r\n| ');
    input.write('\x03'); // Ctrl+C
    await tick();
    expect(output.read()).to.equal('\r\n> ');
    input.write('"foo";\n'); // Write something else
    await tick();
    expect(output.read()).to.equal(`"foo";\r\n\'foo\'\n> `);
  });
});
