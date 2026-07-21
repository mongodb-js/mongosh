import { promises as fs } from 'fs';
import path from 'path';
import * as chai from 'chai';
import sinonChai from 'sinon-chai';
import chaiAsPromised from 'chai-as-promised';
import type { MongodSetup } from '@mongosh/testing';
import type { MongoLogEntry } from 'mongodb-log-writer';

chai.use(sinonChai);
chai.use(chaiAsPromised);

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
      // On Windows a just-exited mongosh may still hold a handle in the fake
      // home dir when we remove it, causing EBUSY/EPERM. fs.rm retries those
      // (and ENOTEMPTY) internally, giving the OS time to release the handle.
      await fs.rm(tmpdir, {
        recursive: true,
        force: true,
        maxRetries: 30,
        retryDelay: 100,
      });
    } catch (err: any) {
      // If it still fails, just log the error instead of failing all tests.
      console.error('Could not remove fake home directory:', err);
    }
  });

  return {
    get path(): string {
      return tmpdir;
    },
  };
}

type MongoLogEntryFromFile = {
  t?: {
    $date: string;
  };
  id: number;
} & Omit<MongoLogEntry, 'id' | 't'>;

async function readReplLogFile<T extends MongoLogEntryFromFile>(
  logPath: string
): Promise<T[]> {
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
        )}).split(/\\s+/), process.argv.slice(2, -1));
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

// TLS requires matching hostnames, so here we need to explicitly
// specify `localhost` + IPv4 instead of `127.0.0.1`
async function connectionStringWithLocalhost(
  setup: MongodSetup,
  searchParams: Record<string, string> = {}
): Promise<string> {
  const cs = await setup.connectionStringUrl();
  cs.hosts = cs.hosts.map((host) =>
    host.replace(/^(127.0.0.1)(?=$|:)/, 'localhost')
  );
  cs.searchParams.set('family', '4');
  for (const [key, value] of Object.entries(searchParams))
    cs.searchParams.set(key, value);
  return cs.toString();
}

// eslint-disable-next-line mocha/no-exports
export {
  useTmpdir,
  readReplLogFile,
  fakeExternalEditor,
  setTemporaryHomeDirectory,
  connectionStringWithLocalhost,
  MongoLogEntryFromFile,
};
