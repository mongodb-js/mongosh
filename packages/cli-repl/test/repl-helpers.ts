import { promises as fs } from 'fs';
import { promisify } from 'util';
import path from 'path';
import { once } from 'events';
import rimraf from 'rimraf';
import chai, { expect } from 'chai';
import sinon from 'ts-sinon';
import sinonChai from 'sinon-chai';
import chaiAsPromised from 'chai-as-promised';
import type { MongoshBus, MongoshBusEventsMap } from '@mongosh/types';

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
      await promisify(rimraf)(tmpdir);
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

const fakeTTYProps = {
  isTTY: true,
  isRaw: true,
  setRawMode() {
    return false;
  },
  getColorDepth() {
    return 256;
  },
};

async function readReplLogfile(logPath: string) {
  return (await fs.readFile(logPath, 'utf8'))
    .split('\n')
    .filter((line) => line.trim())
    .map((line) => JSON.parse(line));
}

const fakeExternalEditor = async ({
  output,
  expectedExtension,
  tmpdir,
  name,
  flags,
  isNodeCommand,
}: {
  output?: string;
  expectedExtension?: string;
  tmpdir: string;
  name: string;
  flags?: string;
  isNodeCommand: boolean;
}) => {
  const tmpDoc = path.join(tmpdir, name);
  const editor = isNodeCommand ? `node ${tmpDoc}` : tmpDoc;
  let script: string;

  if (typeof output === 'string') {
    script = `#!/usr/bin/env node
    (async () => {
      const tmpDoc = process.argv[process.argv.length - 1];
      const { promises: { writeFile } } = require("fs");
      const assert = require("assert");
      const path = require("path");

      if (${JSON.stringify(expectedExtension ?? '')}) {
        assert.strictEqual(path.extname(tmpDoc), ${JSON.stringify(
          expectedExtension
        )});
      }

      if (${JSON.stringify(flags ?? '')}) {
        assert.deepStrictEqual((${JSON.stringify(
          flags
        )}).split(/\s+/), process.argv.slice(2, -1));
      }

      await writeFile(tmpDoc, ${JSON.stringify(output)}, { mode: 0o600 });
    })().catch((err) => { process.nextTick(() => { throw err; }); });`;
  } else {
    script = `#!/usr/bin/env node
    process.exit(1);`;
  }

  await fs.mkdir(path.dirname(tmpDoc), { recursive: true, mode: 0o700 });
  await fs.writeFile(tmpDoc, script, { mode: 0o700 });

  return flags ? `${editor} ${flags}` : editor;
};

const setTemporaryHomeDirectory = () => {
  const homedir: string = path.resolve(
    __dirname,
    '..',
    '..',
    '..',
    'tmp',
    'test',
    `cli-repl-home-${Date.now()}-${Math.random()}`
  );
  const env: Record<string, string> = {
    ...process.env,
    HOME: homedir,
    USERPROFILE: homedir,
  };

  if (process.platform === 'win32') {
    env.LOCALAPPDATA = path.join(homedir, 'local');
    env.APPDATA = path.join(homedir, 'roaming');
  }

  return { homedir, env };
};

export {
  expect,
  sinon,
  useTmpdir,
  tick,
  waitBus,
  waitEval,
  waitCompletion,
  fakeTTYProps,
  readReplLogfile,
  fakeExternalEditor,
  setTemporaryHomeDirectory,
};
