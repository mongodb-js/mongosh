import semver from 'semver';
// Installing @types/mongodb at the lerna root breaks some of the tests...
// Yikes. Stick with ts-ignore for now.
// @ts-ignore
import { MongoClient } from 'mongodb';
import { promisify } from 'util';
import child_process from 'child_process';
import crypto from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';
import rimraf from 'rimraf';
import { URL } from 'url';
import which from 'which';
import { once } from 'events';
import { downloadMongoDb } from './download-mongodb';

const execFile = promisify(child_process.execFile);

// Return the stat results or, if the file does not exist, `undefined`.
async function statIfExists(path: string): Promise<ReturnType<typeof fs.stat> | undefined> {
  try {
    return await fs.stat(path);
  } catch (err) {
    if (err.code === 'ENOENT') {
      return undefined;
    }
    throw err;
  }
}

// Return the path to the temporary directory and ensure that it exists.
async function getTmpdir(): Promise<string> {
  const tmpdir = path.resolve(__dirname, '..', 'tmp');
  await fs.mkdir(tmpdir, { recursive: true });
  return tmpdir;
}

// Get the path we use to spawn mlaunch, and potential environment variables
// necessary to run it successfully. This tries to install it locally if it
// cannot find an existing installation.
let mlaunchPath: { exec: string, env: Record<string,string> } | undefined;
async function getMlaunchPath(): Promise<{ exec: string, env: Record<string,string> }> {
  const tmpdir = await getTmpdir();
  if (mlaunchPath !== undefined) {
    return mlaunchPath;
  }

  try {
    // If `mlaunch` is already in the PATH: Great, we're done.
    return mlaunchPath = { exec: await which('mlaunch'), env: {} };
  } catch {}

  // Figure out where python3 might live (python3, python, $PYTHON).
  let python = '';
  try {
    await which('python3');
    python = 'python3';
  } catch {
    try {
      // Fun fact on the side: Python 2.x writes the version to stderr,
      // Python 3.x writes to stdout.
      const { stdout } = await execFile('python', ['-V']);
      if (stdout.includes('Python 3')) {
        python = 'python';
      }
    } catch {
      const pythonEnv = process.env.PYTHON;
      if (pythonEnv) {
        const { stdout } = await execFile(pythonEnv as string, ['-V']);
        if (stdout.includes('Python 3')) {
          python = pythonEnv as string;
        }
      }
    }
  }
  if (!python) {
    throw new Error('Could not find Python 3.x installation, install mlaunch manually');
  }

  // Install mlaunch, preferably locally and otherwise attempt to do so globally.
  try {
    await execFile('pip3', ['install', '--target', tmpdir, 'mtools[mlaunch]']);
    const mlaunchPy = path.join(tmpdir, 'bin', 'mlaunch');
    for (const ext of ['', '.exe', '.bat']) {
      try {
        await fs.stat(mlaunchPy + ext);
        return mlaunchPath = {
          exec: mlaunchPy + ext,
          env: { PYTHONPATH: tmpdir }
        };
      } catch {}
    }
  } catch {}

  await execFile('pip3', ['install', '--user', 'mtools[mlaunch]']);
  // Figure out the most likely target path for pip3 --user and use mlaunch
  // from there.
  const pythonBase = (await execFile(python, ['-m', 'site', '--user-base'])).stdout.trim();
  const pythonPath = (await execFile(python, ['-m', 'site', '--user-site'])).stdout.trim();
  const mlaunchExec = path.join(pythonBase, 'bin', 'mlaunch');
  let lastErr = new Error('unreachable');
  for (const ext of ['', '.exe', '.bat']) {
    try {
      await fs.stat(mlaunchExec + ext);
      return mlaunchPath = {
        exec: mlaunchExec + ext,
        env: { PYTHONPATH: pythonPath }
      };
    } catch(err) {
      lastErr = err;
    }
  }
  throw lastErr;
}

type MlaunchCommand = 'init' | 'start' | 'stop' | 'list' | 'kill';
// Run a specific mlaunch command, trying to ensure that `mlaunch` is accessible
// and installing it if necessary.
async function execMlaunch(command: MlaunchCommand, ...args: string[]): Promise<void> {
  const mlaunchPath = await getMlaunchPath();

  // command could be part of args, but the extra typechecking here has helped
  // me at least once.
  const fullCmd = [mlaunchPath.exec, command, ...args];
  // console.info('Running command', fullCmd.join(' '));
  const proc = child_process.spawn(fullCmd[0], fullCmd.slice(1), {
    env: { ...process.env, ...mlaunchPath.env },
    stdio: 'inherit'
  });
  await once(proc, 'exit');
  // console.info('Successfully ran command', fullCmd.join(' '));
}

// Remove all potential leftover mlaunch instances.
export async function clearMlaunch() {
  const tmpdir = await getTmpdir();
  for await (const { name } of await fs.opendir(tmpdir)) {
    if (name.startsWith('mlaunch-')) {
      const fullPath = path.join(tmpdir, name);
      try {
        await execMlaunch('kill', '--dir', fullPath);
        await promisify(rimraf)(fullPath);
      } catch (err) {
        console.warn(`Removing ${fullPath} failed:`, err);
      }
    }
  }
  await promisify(rimraf)(path.join(tmpdir, '.current-port'));
}

// Represents one running test server instance.
export class MongodSetup {
  _connectionString: string;
  _serverVersion: string | null = null;

  constructor(connectionString: string) {
    this._connectionString = connectionString;
  }

  async start(): Promise<void> {
    throw new Error('Server not managed');
  }

  async stop(): Promise<void> {
    throw new Error('Server not managed');
  }

  connectionString(): string {
    return this._connectionString;
  }

  host(): string {
    return new URL(this.connectionString()).hostname;
  }

  port(): string {
    return new URL(this.connectionString()).port ?? '27017';
  }

  async serverVersion(): Promise<string> {
    if (this._serverVersion !== null) {
      return this._serverVersion;
    }

    let client;
    try {
      client = await MongoClient.connect(this.connectionString(), {
        useUnifiedTopology: true,
        useNewUrlParser: true
      });

      const { version } = await client.db().admin().serverStatus();
      this._serverVersion = version;
      return version;
    } finally {
      if (client) {
        client.close();
      }
    }
  }
}

// Add .connectionString(), .host(), port() as async methods on the returned
// Promise itself, for easier access.
type MongodSetupPromise = Promise<MongodSetup> & {
  connectionString(): Promise<string>;
  host(): Promise<string>;
  port(): Promise<string>;
};
function makeMongodSetupPromise(p: MongodSetup | Promise<MongodSetup>): MongodSetupPromise {
  return Object.assign(
    Promise.resolve(p),
    {
      async connectionString(): Promise<string> {
        return (await p).connectionString();
      },
      async host(): Promise<string> {
        return (await p).host();
      },
      async port(): Promise<string> {
        return (await p).port();
      }
    });
}

// Spawn mlaunch with a specific set of arguments.
async function startMlaunch(...args: string[]): Promise<MongodSetup> {
  const random = (await promisify(crypto.randomBytes)(16)).toString('hex');
  const tag = `${process.pid}-${random}`;

  const tmpdir = await getTmpdir();
  const mlaunchdir = path.join(tmpdir, `mlaunch-${tag}`);

  let port: number;
  if (args.includes('--port')) {
    const index = args.indexOf('--port');
    port = +args.splice(index, 2)[1];
  } else {
    // If no port was specified, we pick one in the range [30000, 40000].
    // We pick by writing to a file, looking up the index at which we wrote,
    // and adding that to the base port, so that there is a low likelihood of
    // port collisions between different test runs even when two tests call
    // startMlaunch() at the same time.
    // Ideally, we would handle failures from port conflicts that occur when
    // mlaunch starts, but we don't currently have access to that information
    // until .start() is called.
    const portfile = path.join(tmpdir, '.current-port');
    await fs.appendFile(portfile, `${tag}\n`);
    const portfileContent = (await fs.readFile(portfile, 'utf8')).split('\n');
    const writeIndex = portfileContent.indexOf(tag);
    if (writeIndex === -1) {
      throw new Error(`Could not figure out port number, ${portfile} may be corrupt`);
    }
    port = 30000 + (writeIndex * 30) % 10000;
  }

  if (!args.includes('--replicaset') && !args.includes('--single')) {
    args.push('--single');
  }

  // Make sure mongod and mongos are accessible
  try {
    await Promise.all([which('mongod'), which('mongos')]);
  } catch {
    args.unshift('--binarypath', await downloadMongoDb());
  }

  let refs = 0;
  let currentAction = Promise.resolve();

  class MlaunchSetup extends MongodSetup {
    async start(): Promise<void> {
      return currentAction = (async() => {
        await currentAction;
        // Keep track of .start() and .stop() calls. Starting multiple times
        // increases the ref count, stopping multipple times decreases.
        if (refs++ !== 0) {
          return;
        }
        if (await statIfExists(mlaunchdir)) {
          // There might be leftovers from previous runs. Remove them.
          await execMlaunch('kill', '--dir', mlaunchdir);
          await promisify(rimraf)(mlaunchdir);
        }
        await fs.mkdir(mlaunchdir, { recursive: true });
        await execMlaunch('init', '--dir', mlaunchdir, '--port', `${port}`, ...args);
      })();
    }

    async stop(): Promise<void> {
      return currentAction = (async() => {
        await currentAction;
        if (refs === 0) {
          throw new Error('stop() without matching start()');
        }
        if (--refs > 0) {
          return;
        }
        await execMlaunch('stop', '--dir', mlaunchdir);
        try {
          await promisify(rimraf)(mlaunchdir);
        } catch (err) {
          console.error(`Cannot remove directory ${mlaunchdir}`, err);
        }
      })();
    }
  }

  return new MlaunchSetup(`mongodb://localhost:${port}`);
}


/**
 * Starts a local server unless the `MONGOSH_TEST_SERVER_URL`
 * environment variable is set.
 *
 * It returns an object with information that can be used to connect to the
 * server.
 *
 * If env.MONGOSH_TEST_SERVER_URL is set it assumes a server
 * is already running on that uri and returns an object whose
 * .connectionString() method points to the contents of that environment
 * variable.
 *
 * If `shareMode` is `shared`, then no arguments may be passed. In that case,
 * this may re-use an existing test server managed by this process.
 *
 * @export
 * @returns {MongodSetup} - Object with information about the started server.
 */
let sharedSetup : Promise<MongodSetup> | null = null;
export function startTestServer(shareMode: 'shared' | 'not-shared', ...args: string[]): MongodSetupPromise {
  if (shareMode === 'shared' && process.env.MONGOSH_TEST_SERVER_URL) {
    return makeMongodSetupPromise(new MongodSetup(process.env.MONGOSH_TEST_SERVER_URL));
  }

  let setupPromise : Promise<MongodSetup>;
  if (shareMode === 'shared') {
    if (args.length > 0) {
      throw new Error('Cannot specify arguments for shared mongod');
    }
    setupPromise = sharedSetup ?? (sharedSetup = startMlaunch());
  } else {
    setupPromise = startMlaunch(...args);
  }

  before(async function() {
    this.timeout(120_000);  // Include potential mongod download time.
    await (await setupPromise).start();
  });

  after(async function() {
    this.timeout(30_000);
    await (await setupPromise).stop();
  });

  return makeMongodSetupPromise(setupPromise);
}

// The same as startTestServer(), except that this starts multiple servers
// in parallel in the same before() call.
export function startTestCluster(...argLists: string[][]): MongodSetupPromise[] {
  const setupPromises = argLists.map(args => startMlaunch(...args));

  before(async function() {
    this.timeout(90_000 + 30_000 * setupPromises.length);
    await Promise.all(setupPromises.map(async (setupPromise: Promise<MongodSetup>) => {
      await (await setupPromise).start();
    }));
  });

  after(async function() {
    this.timeout(30_000 * setupPromises.length);
    await Promise.all(setupPromises.map(async (setupPromise: Promise<MongodSetup>) => {
      await (await setupPromise).stop();
    }));
  });

  return setupPromises.map(makeMongodSetupPromise);
}

/**
 * Skip tests in the suite if the test server version matches a specific semver
 * condition.
 *
 * describe('...', () => {
 *   ie. skipIfServerVersion(testServer, '< 4.4')
 * });
 *
 * @export
 * @returns {string} - uri that can be used to connect to the server.
 */
export function skipIfServerVersion(server: MongodSetup | Promise<MongodSetup>, semverCondition: string) {
  before(async function() {
    const testServerVersion = await (await server).serverVersion();
    if (semver.satisfies(testServerVersion, semverCondition)) {
      this.skip();
    }
  });
}
