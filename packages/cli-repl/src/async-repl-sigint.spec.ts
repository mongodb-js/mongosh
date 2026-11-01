import type { REPLServer } from 'repl';
import { once } from 'events';
import type { Readable, Writable } from 'stream';
import { PassThrough } from 'stream';
import { expect } from 'chai';
import sinon from 'sinon';
import { setTimeout as delay } from 'timers/promises';
import type { AsyncREPLOptions, OriginalEvalFunction } from './async-repl';
import { start, evalFinish } from './async-repl';

function createAsyncRepl(extraOpts: Partial<AsyncREPLOptions> = {}): {
  input: Writable;
  output: Readable;
  repl: REPLServer;
} {
  const input = new PassThrough();
  const output = new PassThrough({ encoding: 'utf8' });
  const repl = start({
    input,
    output,
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
  return { input, output, repl };
}

describe('AsyncRepl SIGINT during an in-flight interrupt', function () {
  it('keeps a SIGINT listener while onAsyncSigint is still running', async function () {
    if (process.platform === 'win32') {
      return this.skip();
    }

    let releaseInterrupt!: (handled: boolean) => void;
    const interruptGate = new Promise<boolean>((resolve) => {
      releaseInterrupt = resolve;
    });
    let listenersDuringInterrupt = -1;
    const onAsyncSigint = sinon.stub().callsFake(async () => {
      listenersDuringInterrupt = process.listenerCount('SIGINT');
      return interruptGate;
    });
    const { input, output, repl } = createAsyncRepl({ onAsyncSigint });

    const finished = once(repl, evalFinish);
    input.write('new Promise(() => {})\n');
    await delay(100);
    process.kill(process.pid, 'SIGINT');

    const startWait = Date.now();
    while (listenersDuringInterrupt < 0) {
      if (Date.now() - startWait > 5000) {
        throw new Error('onAsyncSigint was not entered');
      }
      await delay(10);
    }
    expect(listenersDuringInterrupt).to.be.greaterThan(0);
    sinon.assert.calledOnce(onAsyncSigint);

    // Only reached when a listener is installed. A count of 0 would make
    // this signal take Node's default action and kill the test process.
    process.kill(process.pid, 'SIGINT');
    await delay(50);
    sinon.assert.calledOnce(onAsyncSigint);
    expect(process.listenerCount('SIGINT')).to.be.greaterThan(0);

    releaseInterrupt(false);
    let content = '';
    const result = await Promise.race([
      (async () => {
        for await (const chunk of output) {
          content += chunk;
          if (content.includes('execution was interrupted')) {
            return 'seen' as const;
          }
        }
        return 'ended' as const;
      })(),
      delay(5000).then(() => 'timeout' as const),
    ]);
    expect(result).to.equal('seen');
    await finished;
  });
});
