import child_process from 'child_process';
import { promises as fs } from 'fs';
import { MongoClient, MongoClientOptions } from 'mongodb';
import path from 'path';
import semver from 'semver';
import { URL } from 'url';
import { promisify } from 'util';
import which from 'which';
import { ConnectionString } from 'mongodb-connection-string-url';
import { MongoCluster, MongoClusterOptions } from 'mongodb-runner';
import { downloadMongoDb } from '@mongodb-js/mongodb-downloader';
import { downloadCryptLibrary } from '../packages/build/src/packaging/download-crypt-library';

const execFile = promisify(child_process.execFile);

const isCI = !!process.env.IS_CI;
function ciLog(...args: any[]) {
  if (isCI) {
    console.error(...args);
  }
}

// Return the path to the temporary directory and ensure that it exists.
async function getTmpdir(): Promise<string> {
  const tmpdir = path.resolve(__dirname, '..', 'tmp');
  await fs.mkdir(tmpdir, { recursive: true });
  return tmpdir;
}

// Represents one running test server instance.
export class MongodSetup {
  _connectionString: Promise<string>;
  _setConnectionString: (connectionString: string) => void;
  _serverVersion: string | null = null;
  _isCommunityServer: boolean | null = null;
  _bindir = '';

  constructor(connectionString?: string) {
    this._setConnectionString = (connectionString: string) => {};  // Make TypeScript happy.
    this._connectionString = new Promise(resolve => {
      this._setConnectionString = resolve;
    });

    if (connectionString) {
      this._setConnectionString(connectionString);
    }
  }

  async start(): Promise<void> {
    throw new Error('Server not managed');
  }

  async stop(): Promise<void> {
    throw new Error('Server not managed');
  }

  async connectionString(searchParams: Partial<Record<keyof MongoClientOptions, string>> = {}, uriOptions: Partial<ConnectionString> = {}): Promise<string> {
    if (Object.keys(searchParams).length + Object.keys(uriOptions).length === 0) {
      return this._connectionString;
    }

    const url = await this.connectionStringUrl();
    for (const [key, value] of Object.entries(searchParams))
      url.searchParams.set(key, value);
    for (const [key, value] of Object.entries(uriOptions))
      (url as any)[key] = value;
    return url.toString();
  }

  async connectionStringUrl(): Promise<ConnectionString> {
    return new ConnectionString(await this.connectionString());
  }

  async port(): Promise<string> {
    return (await this.hostport()).split(':').reverse()[0];
  }

  async hostport(): Promise<string> {
    return (await this.connectionStringUrl()).hosts[0];
  }

  async serverVersion(): Promise<string> {
    if (this._serverVersion !== null) {
      return this._serverVersion;
    }

    const { version } = await this.withClient(async client => {
      return await client.db('db1').admin().serverStatus();
    });
    this._serverVersion = version;
    return version;
  }

  async isCommunityServer(): Promise<boolean> {
    if (this._isCommunityServer !== null) {
      return this._isCommunityServer;
    }

    const { modules } = await this.withClient(async client => {
      return await client.db('db1').admin().command({ buildInfo: 1 });
    });
    const isCommunityServer = !modules.includes('enterprise');
    this._isCommunityServer = isCommunityServer;
    return isCommunityServer;
  }

  async withClient<T>(fn: (client: MongoClient) => Promise<T>): Promise<T> {
    let client;
    try {
      client = await MongoClient.connect(await this.connectionString(), {});
      return await fn(client);
    } finally {
      if (client) {
        client.close();
      }
    }
  }

  get bindir(): string {
    return this._bindir;
  }
}

// Spawn a mongodb-runner-managed instance with a specific set of arguments.
export class MongoRunnerSetup extends MongodSetup {
  _opts: Partial<MongoClusterOptions>;
  _cluster: MongoCluster | undefined;

  constructor(opts: Partial<MongoClusterOptions> = {}) {
    super();
    this._opts = opts;
  }

  async start(): Promise<void> {
    if (this._cluster) return;
    this._cluster = await MongoCluster.start({
      topology: 'standalone',
      tmpDir: await getTmpdir(),
      version: process.env.MONGOSH_SERVER_TEST_VERSION,
      ...this._opts
    })

    this._setConnectionString(this._cluster.connectionString);
  }

  async stop(): Promise<void> {
    await this._cluster?.close();
    this._cluster = undefined;
  }
}

async function getInstalledMongodVersion(): Promise<string> {
  await Promise.all([which('mongod'), which('mongos')]);
  const { stdout } = await execFile('mongod', ['--version']);
  const { version } = stdout.match(/^db version (?<version>.+)$/m)!.groups as any;
  return version;
}

export async function downloadCurrentCryptSharedLibrary(): Promise<string> {
  if (process.platform === 'linux') {
    return await downloadCryptLibrary(`linux-${process.arch.replace('ppc64', 'ppc64le')}` as any);
  }
  return downloadCryptLibrary('host');
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
let sharedSetup : MongodSetup | null = null;
export function startTestServer(shareMode: 'shared' | 'not-shared', args: Partial<MongoClusterOptions> = {}): MongodSetup {
  if (shareMode === 'shared' && process.env.MONGOSH_TEST_SERVER_URL) {
    return new MongodSetup(process.env.MONGOSH_TEST_SERVER_URL);
  }

  let server : MongodSetup;
  if (shareMode === 'shared') {
    if (Object.keys(args).length > 0) {
      throw new Error('Cannot specify arguments for shared mongod');
    }
    server = sharedSetup ?? (sharedSetup = new MongoRunnerSetup());
  } else {
    server = new MongoRunnerSetup(args);
  }

  before(async function() {
    this.timeout(120_000);  // Include potential mongod download time.
    await server.start();
  });

  after(async function() {
    // Clean the shared server only up once we're done with everything.
    if (shareMode !== 'shared') {
      this.timeout(30_000);
      await server.stop();
    }
  });

  return server;
}

global.after?.(async function() {
  if (sharedSetup !== null) {
    this.timeout(30_000);
    await sharedSetup.stop();
  }
});

// The same as startTestServer(), except that this starts multiple servers
// in parallel in the same before() call.
export function startTestCluster(...argLists: Partial<MongoClusterOptions>[]): MongodSetup[] {
  const servers = argLists.map(args => new MongoRunnerSetup(args));

  before(async function() {
    this.timeout(90_000 + 30_000 * servers.length);
    await Promise.all(servers.map((server: MongodSetup) => server.start()));
  });

  after(async function() {
    this.timeout(30_000 * servers.length);
    await Promise.all(servers.map((server: MongodSetup) => server.stop()));
  });

  return servers;
}

function skipIfVersion(test: any, testServerVersion: string, semverCondition: string): void {
  if (semver.satisfies(testServerVersion, semverCondition, { includePrerelease: true })) {
    test.skip();
  }
}

/**
 * Skip tests in the suite if the test server version matches a specific semver
 * condition.
 *
 * describe('...', () => {
 *   e.g. skipIfServerVersion(testServer, '< 4.4')
 * });
 */
export function skipIfServerVersion(server: MongodSetup, semverCondition: string): void {
  before(async function() {
    skipIfVersion(this, await server.serverVersion(), semverCondition);
  });
}

/**
 * Skip tests in the suite if the test server is a community server.
 *
 * describe('...', () => {
 *   e.g. skipIfCommunityServer(testServer)
 * });
 */
export function skipIfCommunityServer(server: MongodSetup): void {
  before(async function() {
    if (await server.isCommunityServer()) {
      this.skip();
    }
  });
}

/**
 * Skip tests if environment variables signal that every test runs with
 * --apiStrict.
 */
export function skipIfApiStrict(): void {
  before(function() {
    if (process.env.MONGOSH_TEST_FORCE_API_STRICT) {
      this.skip();
    }
  });
}

/**
 * Skip tests in the suite if the test server version
 * (configured as environment variable or the currently installed one)
 * matches a specific semver version.
 *
 * If this method cannot find an environment variable or already installed
 * mongod, it uses `9999.9999.9999` as version to compare against, since
 * `startTestServer` will use the latest available version.
 *
 * IMPORTANT: As the environment variable might be `4.0.x` it will be converted
 * to `4.0.0` to be able to do a semver comparison!
 *
 * @param semverCondition Semver condition
 */
export function skipIfEnvServerVersion(semverCondition: string): void {
  before(async function() {
    let testServerVersion = process.env.MONGOSH_SERVER_TEST_VERSION;
    if (!testServerVersion) {
      try {
        testServerVersion = await getInstalledMongodVersion();
      } catch(e: any) {
        // no explicitly specified version but also no local mongod installation
        testServerVersion = '9999.9999.9999';
      }
    } else {
      testServerVersion = testServerVersion.split('-')[0].split('.')
        .map(num => /[0-9]+/.test(num) ? num : '0')
        .join('.');
    }
    skipIfVersion(this, testServerVersion, semverCondition);
  });
}
