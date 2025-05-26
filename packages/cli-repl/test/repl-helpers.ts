import { promises as fs } from 'fs';
import { promisify } from 'util';
import path from 'path';
import { once } from 'events';
import chai, { expect } from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import chaiAsPromised from 'chai-as-promised';
import type { MongoshBus, MongoshBusEventsMap } from '@mongosh/types';
import type { ReadStream, WriteStream } from 'tty';

chai.use(sinonChai);
chai.use(chaiAsPromised);

// MongoshNodeRepl performs no I/O, so it's safe to assume that all operations
// finish within a single nextTick/microtask cycle. We can use `setImmediate()`
// to wait for these to finish.
const tick = promisify(setImmediate);

// We keep an additional index as we might create two temp directories
// at the same time stamp leading to conflicts
let tmpDirsIndex = 1;

function useTmpdir(): { readonly path: string } {
  let tmpdir: string;

  beforeEach(async () => {
    tmpdir = path.resolve(
      __dirname,
      '..',
      '..',
      '..',
      'tmp',
      'test',
      `repltest-${Date.now()}-${tmpDirsIndex++}`
    );
    await fs.mkdir(tmpdir, { recursive: true });
  });

  afterEach(async () => {
    try {
      await fs.rm(tmpdir, { recursive: true, force: true });
    } catch (err: any) {
      // On Windows in CI, this can fail with EPERM for some reason.
      // If it does, just log the error instead of failing all tests.
      console.error('Could not remove fake home directory:', err);
    }
  });

  return {
    get path(): string {
      return tmpdir;
    },
  };
}

async function waitBus<K extends keyof MongoshBusEventsMap>(
  bus: MongoshBus,
  event: K
): Promise<
  MongoshBusEventsMap[K] extends (...args: infer P) => any ? P : never
> {
  return (await once(bus as any, event)) as any;
}

async function waitEval(bus: MongoshBus) {
  // Wait for the (possibly I/O-performing) evaluation to complete and then
  // wait another tick for the result to be flushed to the output stream.
  await waitBus(bus, 'mongosh:eval-complete');
  await tick();
}

async function waitCompletion(bus: MongoshBus) {
  await waitBus(bus, 'mongosh:autocompletion-complete');
  await tick();
}

async function waitMongoshCompletionResults(bus: MongoshBus) {
  // Waiting for the completion results can "time out" if an async action such
  // as listing the databases or collections or loading the schema takes longer
  // than 200ms (at the time of writing), but by the next try or at least
  // eventually the action should complete and then the next autocomplete call
  // will return the cached result.
  let found = false;
  while (!found) {
    const [, mongoshResults] = await waitBus(
      bus,
      'mongosh:autocompletion-complete'
    );
    if (mongoshResults.length === 0) {
      found = true;
    }
  }
  await tick();
}

const fakeTTYProps: Partial<ReadStream & WriteStream> = {
  isTTY: true,
  isRaw: true,
  setRawMode(newValue: boolean) {
    this.isRaw = newValue;
    return this as ReadStream & WriteStream;
  },
  getColorDepth() {
    return 256;
  },
};

async function readReplLogFile(
  logPath?: string | null | undefined
): Promise<any[]> {
  if (!logPath) return [];
  return (await fs.readFile(logPath, 'utf8'))
    .split('\n')
    .filter((line) => line.trim())
    .map((line) => JSON.parse(line));
}

// eslint-disable-next-line mocha/no-exports
export {
  expect,
  sinon,
  useTmpdir,
  tick,
  waitBus,
  waitEval,
  waitCompletion,
  waitMongoshCompletionResults,
  fakeTTYProps,
  readReplLogFile,
};
