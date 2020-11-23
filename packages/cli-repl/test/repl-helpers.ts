import { promises as fs } from 'fs';
import { promisify } from 'util';
import path from 'path';
import { once } from 'events';
import rimraf from 'rimraf';
import chai, { expect } from 'chai';
import sinon from 'ts-sinon';
import sinonChai from 'sinon-chai';
chai.use(sinonChai);

// MongoshNodeRepl performs no I/O, so it's safe to assume that all operations
// finish within a single nextTick/microtask cycle. We can use `setImmediate()`
// to wait for these to finish.
const tick = promisify(setImmediate);

function useTmpdir(): { readonly path: string } {
  let tmpdir: string;

  beforeEach(async() => {
    tmpdir = path.resolve(__dirname, '..', '..', '..', 'tmp', 'test', `repltest-${Date.now()}`);
    await fs.mkdir(tmpdir, { recursive: true });
  });

  afterEach(async() => {
    promisify(rimraf)(tmpdir);
  });

  return {
    get path(): string { return tmpdir; }
  };
}

async function waitEval(bus: any) {
  // Wait for the (possibly I/O-performing) evaluation to complete and then
  // wait another tick for the result to be flushed to the output stream.
  await once(bus, 'mongosh:eval-complete');
  await tick();
}

const fakeTTYProps = {
  isTTY: true,
  isRaw: true,
  setRawMode() { return false; },
  getColorDepth() { return 256; }
};

export {
  expect,
  sinon,
  useTmpdir,
  tick,
  waitEval,
  fakeTTYProps
};
