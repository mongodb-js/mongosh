/* eslint-disable mocha/no-exports */
import child_process from 'child_process';
import { promises as fs } from 'fs';
import { Log, MongoClient, type MongoClientOptions } from 'mongodb';
import path from 'path';
import semver from 'semver';
import { promisify } from 'util';
import which from 'which';
import type { LogEntry, MongoClusterOptions } from 'mongodb-runner';
import { MongoCluster } from 'mongodb-runner';
import { ConnectionString } from 'mongodb-connection-string-url';
import { downloadCryptLibrary } from '@mongosh/build';

const execFile = promisify(child_process.execFile);

// Return the path to the temporary directory and ensure that it exists.
async function getTmpdir(): Promise<string> {
  const tmpdir = path.resolve(__dirname, '..', 'tmp');
  await fs.mkdir(tmpdir, { recursive: true });
  return tmpdir;
}

// Represents one running test server instance.
// eslint-disable-next-line mocha/no-exports
export class MongodSetup {
  _connectionString: Promise<string>;
  _setConnectionString: (connectionString: string) => void;
  _serverVersion: string | null = null;
  _isCommunityServer: boolean | null = null;
  _bindir = '';

  constructor(connectionString?: string) {
    this._setConnectionString = () => {
      // no-op to make TypeScript happy.
    };
    this._connectionString = new Promise((resolve) => {
      this._setConnectionString = resolve;
    });

    if (connectionString) {
      this._setConnectionString(connectionString);
    }
  }

  async start(): Promise<void> {
    await Promise.reject(new Error('Server not managed'));
  }

  async stop(): Promise<void> {
    await Promise.reject(new Error('Server not managed'));
  }

  async connectionString(
    searchParams: Partial<Record<keyof MongoClientOptions, string>> = {},
    uriOptions: Partial<ConnectionString> = {}
  ): Promise<string> {
    if (
      Object.keys(searchParams).length + Object.keys(uriOptions).length ===
      0
    ) {
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

    const { version } = await this.withClient(async (client) => {
      return await client.db('db1').admin().serverStatus();
    });
    this._serverVersion = version;
    return version;
  }

  async isCommunityServer(): Promise<boolean> {
    if (this._isCommunityServer !== null) {
      return this._isCommunityServer;
    }

    const { modules } = await this.withClient(async (client) => {
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
        await client.close();
      }
    }
  }

  get bindir(): string {
    return this._bindir;
  }
}

// Spawn a mongodb-runner-managed instance with a specific set of arguments.
export class MongoRunnerSetup extends MongodSetup {
  private static _usedDirPrefix: Record<string, 0> = {};

  private static _buildDirPath(
    id: string,
    version?: string,
    topology?: string
  ) {
    const prefix = [id, version, topology]
      .filter(Boolean)
      .join('-')
      .replace(/[^a-zA-Z0-9_.-]/g, '');

    this._usedDirPrefix[prefix] ??= 0;

    const idx = this._usedDirPrefix[prefix];
    this._usedDirPrefix[prefix]++;

    return `${prefix}-${idx}`;
  }

  _id: string;
  _opts: Partial<MongoClusterOptions>;
  _cluster: MongoCluster | undefined;
  _warnings: LogEntry[] = [];
  _warningFilters: ((e: LogEntry) => boolean)[] = [];

  constructor(id: string, opts: Partial<MongoClusterOptions> = {}) {
    super();
    this._id = id;
    this._opts = opts;
  }

  async start(): Promise<void> {
    if (this._cluster) return;
    const tmpDir = await getTmpdir();
    const version = process.env.MONGOSH_SERVER_TEST_VERSION;
    const dirPath = MongoRunnerSetup._buildDirPath(
      this._id,
      version,
      this._opts.topology
    );

    this._cluster = await MongoCluster.start({
      topology: 'standalone',
      tmpDir: path.join(tmpDir, 'mongodb-runner', 'dbs', dirPath),
      logDir: path.join(tmpDir, 'mongodb-runner', 'logs', dirPath),
      downloadDir: path.join(tmpDir, 'mongodb-runner'),
      version: version,
      ...this._opts,
    });

    this._setConnectionString(this._cluster.connectionString);

    // Setup logging
    const ignoreCtx = new Set<string>();
    this._cluster.on('mongoLog', (_server, entry) => {
      // Ignore events coming from internal clients (e.g. replset clients)
      if (entry.id === 51800 && entry.attr?.doc?.driver?.name === 'MongoDB Internal Client' && entry.context.startsWith('conn')) {
        ignoreCtx.add(entry.context);
      }
      if (ignoreCtx.has(entry.context)) return;

      if (['W', 'E', 'F'].includes(entry.severity) && !this._warningFilters.some(f => f(entry))) {
        this._warnings.push(entry);
      }
    });
    for (const filter of MongoRunnerSetup.defaultAllowedWarnings)
      this.allowWarning(filter);
  }

  async stop(): Promise<void> {
    await this._cluster?.close();
    this._cluster = undefined;
  }

  get warnings(): LogEntry[] {
    return [...this._warnings];
  }

  noServerWarningsCheckpoint(): void {
    const warnings = this.warnings;
    this._warnings = [];
    if (warnings.length > 0) {
      throw new Error(`Unexpected MongoDB server log warnings found: ${JSON.stringify(warnings, null, 2)}`);
    }
  }

  allowWarning(filter: number | ((entry: LogEntry) => boolean)): () => void {
    if (typeof filter === 'number') {
      const id = filter;
      filter = entry => entry.id === id;
    }
    this._warningFilters.push(filter);
    return () => {
      this._warningFilters = this._warningFilters.filter(f => f !== filter);
    };
  }

  static defaultAllowedWarnings = [
    4615610, // "Failed to check socket connectivity", generic disconnect error
    7012500, // "Failed to refresh query analysis configurations", normal sharding behavior
    4906901, // "Arbiters are not supported in quarterly binary versions"
    6100702, // "Failed to get last stable recovery timestamp due to lock acquire timeout. Note this is expected if shutdown is in progress."
    (l: LogEntry) => l.component === 'STORAGE', // Outside of mongosh's control
    (l: LogEntry) => {
      // "Aggregate command executor error", we get this a lot for things like
      // $collStats which internally tries to open collections that may or may not exist
      return l.id === 23799 && l.attr?.error?.codeName === 'NamespaceNotFound';
    },
    (l: LogEntry) => {
      // "getMore command executor error" can happen under normal circumstances
      // for client errors
      return l.id === 20478 && l.attr?.error?.codeName === 'ClientDisconnect';
    },
    (l: LogEntry) => {
      // "$jsonSchema validator does not allow '_id' field" warning
      // incorrectly issued for the implicit schema of config.settings
      // https://github.com/mongodb/mongo/blob/0c265adbde984c981946f804279693078e0b9f8a/src/mongo/db/global_catalog/ddl/sharding_catalog_manager.cpp#L558-L559
      // https://github.com/mongodb/mongo/blob/0c265adbde984c981946f804279693078e0b9f8a/src/mongo/s/balancer_configuration.cpp#L122-L143
      return l.id === 3216000 && ['ReplWriterWorker', 'OplogApplier'].some(match => l.context.includes(match));
    }
  ];
}

async function getInstalledMongodVersion(): Promise<string> {
  await Promise.all([which('mongod'), which('mongos')]);
  const { stdout } = await execFile('mongod', ['--version']);
  const { version } = stdout.match(/^db version (?<version>.+)$/m)!
    .groups as any;
  return version;
}

export async function downloadCurrentCryptSharedLibrary(
  versionSpec?: string
): Promise<string> {
  if (process.platform === 'linux') {
    return (
      await downloadCryptLibrary(
        `linux-${process.arch.replace('ppc64', 'ppc64le')}` as any,
        versionSpec
      )
    ).cryptLibrary;
  }
  return (await downloadCryptLibrary('host', versionSpec)).cryptLibrary;
}

/**
 * Starts a local server and returns an object with information that can be used to connect to the
 * server.
 *
 * @export
 * @returns {MongodSetup} - Object with information about the started server.
 */
let sharedSetup: MongoRunnerSetup | null = null;
export function startTestServer(
  id: string,
  args: Partial<MongoClusterOptions> = {}
): MongoRunnerSetup {
  const server = new MongoRunnerSetup(id, args);
  before(async function () {
    this.timeout(120_000); // Include potential mongod download time.
    await server.start();
  });

  after(async function () {
    this.timeout(30_000);
    await server.stop();
  });

  return server;
}

/**
 * Starts or reuse an existing shared local server managed by this process.
 *
 * If env.MONGOSH_TEST_SERVER_URL is set it assumes a server
 * is already running on that uri and returns an object whose
 * .connectionString() method points to the contents of that environment
 * variable instead.
 *
 * @export
 * @returns {MongodSetup} - Object with information about the started server.
 */
export function startSharedTestServer(): (MongodSetup & Partial<MongoRunnerSetup>) | MongoRunnerSetup {
  if (process.env.MONGOSH_TEST_SERVER_URL) {
    return new MongodSetup(process.env.MONGOSH_TEST_SERVER_URL);
  }

  const server = sharedSetup ?? (sharedSetup = new MongoRunnerSetup('shared'));

  before(async function () {
    this.timeout(120_000); // Include potential mongod download time.
    await server.start();
  });

  afterEach(function () {
    server.noServerWarningsCheckpoint();
  });

  // NOTE: no after hook here, cause the shared server is only
  // cleaned up once we're done with everything.
  return server;
}

global.after?.(async function () {
  if (sharedSetup !== null) {
    this.timeout(30_000);
    await sharedSetup.stop();
  }
});

// The same as startTestServer(), except that this starts multiple servers
// in parallel in the same before() call.
export function startTestCluster(
  id: string,
  ...argLists: Partial<MongoClusterOptions>[]
): MongoRunnerSetup[] {
  const servers = argLists.map((args) => new MongoRunnerSetup(id, args));

  before(async function () {
    this.timeout(90_000 + 30_000 * servers.length);
    await Promise.all(servers.map((server: MongodSetup) => server.start()));
  });

  afterEach(function() {
    for (const server of servers) {
      server.noServerWarningsCheckpoint();
    }
  });

  after(async function () {
    this.timeout(30_000 * servers.length);
    await Promise.all(servers.map((server: MongodSetup) => server.stop()));
  });

  return servers;
}

function skipIfVersion(
  test: any,
  testServerVersion: string,
  semverCondition: string
): void {
  if (
    semver.satisfies(testServerVersion, semverCondition, {
      includePrerelease: true,
    })
  ) {
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
export function skipIfServerVersion(
  server: MongodSetup,
  semverCondition: string
): void {
  before(async function () {
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
  before(async function () {
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
  before(function () {
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
  before(async function () {
    let testServerVersion = process.env.MONGOSH_SERVER_TEST_VERSION;
    if (!testServerVersion) {
      try {
        testServerVersion = await getInstalledMongodVersion();
      } catch (e: any) {
        // no explicitly specified version but also no local mongod installation
        testServerVersion = '9999.9999.9999';
      }
    } else {
      testServerVersion = testServerVersion
        .split('-')[0]
        .split('.')
        .map((num) => (/[0-9]+/.test(num) ? num : '0'))
        .join('.');
    }
    skipIfVersion(this, testServerVersion, semverCondition);
  });
}

export function sortObjectArray<T extends any[]>(arr: T): T {
  return arr.sort((a, b) => {
    const aStr = JSON.stringify(a);
    const bStr = JSON.stringify(b);
    if (aStr < bStr) return -1;
    if (aStr > bStr) return 1;
    return 0;
  });
}
