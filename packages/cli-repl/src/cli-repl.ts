import { MongoshInternalError, MongoshWarning } from '@mongosh/errors';
import { redactPassword } from '@mongosh/history';
import i18n from '@mongosh/i18n';
import { bson } from '@mongosh/service-provider-core';
import { CliOptions, CliServiceProvider, MongoClientOptions } from '@mongosh/service-provider-server';
import Analytics from 'analytics-node';
import askpassword from 'askpassword';
import Nanobus from 'nanobus';
import pino from 'pino';
import semver from 'semver';
import { Readable, Writable } from 'stream';
import type { StyleDefinition } from './clr';
import { ConfigManager, ShellHomeDirectory, ShellHomePaths } from './config-directory';
import { CliReplErrors } from './error-codes';
import MongoshNodeRepl, { MongoshNodeReplOptions } from './mongosh-repl';
import setupLoggerAndTelemetry from './setup-logger-and-telemetry';
import { MongoshBus, UserConfig } from '@mongosh/types';
import { once } from 'events';
import { createWriteStream } from 'fs';
import { promisify } from 'util';

/**
 * Connecting text key.
 */
const CONNECTING = 'cli-repl.cli-repl.connecting';

type AnalyticsOptions = { host?: string, apiKey?: string };

export type CliReplOptions = {
  shellCliOptions: CliOptions & { mongocryptdSpawnPath?: string },
  input: Readable;
  output: Writable;
  shellHomePaths: ShellHomePaths;
  onExit: (code: number) => never;
  analyticsOptions?: AnalyticsOptions;
} & Pick<MongoshNodeReplOptions, 'nodeReplOptions'>;

/**
 * The REPL used from the terminal.
 */
class CliRepl {
  mongoshRepl: MongoshNodeRepl;
  bus: MongoshBus;
  cliOptions: CliOptions;
  shellHomeDirectory: ShellHomeDirectory;
  configDirectory: ConfigManager<UserConfig>;
  config: UserConfig = new UserConfig();
  input: Readable;
  output: Writable;
  logId: string;
  analyticsOptions?: AnalyticsOptions;
  analytics?: Analytics;
  warnedAboutInaccessibleFiles = false;
  onExit: (code: number) => Promise<never>;
  closing = false;

  /**
   * Instantiate the new CLI Repl.
   */
  constructor(options: CliReplOptions) {
    this.bus = new Nanobus('mongosh');
    this.cliOptions = options.shellCliOptions;
    this.input = options.input;
    this.output = options.output;
    this.analyticsOptions = options.analyticsOptions;
    this.logId = new bson.ObjectId().toString();
    this.onExit = options.onExit;

    this.shellHomeDirectory = new ShellHomeDirectory(options.shellHomePaths);
    this.configDirectory = new ConfigManager<UserConfig>(
      this.shellHomeDirectory)
      .on('error', (err: Error) =>
        this.bus.emit('mongosh:error', err))
      .on('new-config', (config: UserConfig) =>
        this.bus.emit('mongosh:new-user', config.userId, config.enableTelemetry))
      .on('update-config', (config: UserConfig) =>
        this.bus.emit('mongosh:update-user', config.userId, config.enableTelemetry));

    // We can't really do anything meaningfull if the output stream is broken or
    // closed. To avoid throwing an error while writing to it, let's send it to
    // the telemetry instead
    this.output.on('error', (err: Error) => {
      this.bus.emit('mongosh:error', err);
    });

    this.mongoshRepl = new MongoshNodeRepl({
      ...options,
      nodeReplOptions: options.nodeReplOptions ?? {
        terminal: process.env.MONGOSH_FORCE_TERMINAL ? true : undefined,
      },
      bus: this.bus,
      configProvider: this
    });
  }

  /**
   * setup CLI environment: serviceProvider, ShellEvaluator, log connection
   * information, and finally start the repl.
   *
   * @param {string} driverUri - The driver URI.
   * @param {MongoClientOptions} driverOptions - The driver options.
   */
  async start(driverUri: string, driverOptions: MongoClientOptions): Promise<void> {
    await this.verifyNodeVersion();
    if (this.isPasswordMissing(driverOptions)) {
      await this.requirePassword(driverUri, driverOptions);
    }

    this.output.write(`Current Mongosh Log ID: ${this.logId}\n`);

    try {
      await this.shellHomeDirectory.ensureExists();
    } catch (err) {
      this.warnAboutInaccessibleFile(err);
    }

    const logStream = await this.openLogStream();
    setupLoggerAndTelemetry(
      this.logId,
      this.bus,
      () => pino({ name: 'mongosh' }, logStream),
      () => {
        this.analytics = new Analytics(
          // analytics-config.js gets written as a part of a release
          this.analyticsOptions?.apiKey ?? require('./analytics-config.js').SEGMENT_API_KEY,
          this.analyticsOptions);
        return this.analytics;
      });

    this.config = {
      userId: new bson.ObjectId().toString(),
      enableTelemetry: true,
      disableGreetingMessage: false
    };
    try {
      this.config = await this.configDirectory.generateOrReadConfig(this.config);
    } catch (err) {
      this.warnAboutInaccessibleFile(err);
    }

    const initialServiceProvider = await this.connect(driverUri, driverOptions);
    await this.mongoshRepl.start(initialServiceProvider);
  }

  /**
   * Open a writable stream for the current log file.
   */
  async openLogStream(): Promise<Writable> {
    const path = this.shellHomeDirectory.localPath(`${this.logId}_log`);
    try {
      const stream = createWriteStream(path, { mode: 0o600 });
      await once(stream, 'ready');
      return stream;
    } catch (err) {
      this.warnAboutInaccessibleFile(err, path);
      return new Writable({
        write(chunk, enc, cb) {
          // Just ignore log data if there was an error.
          cb();
        }
      });
    }
  }

  warnAboutInaccessibleFile(err: Error, path?: string): void {
    this.bus.emit('mongosh:error', err);
    if (this.warnedAboutInaccessibleFiles) {
      // If one of the files mongosh tries to access, it's also likely that
      // the others are as well. In that case, there is no point in spamming the
      // user with repeated warnings.
      return;
    }
    this.warnedAboutInaccessibleFiles = true;
    const msg = `Warning: Could not access file${path ? 'at ' + path : ''}: ${err.message}\n`;
    this.output.write(this.clr(msg, ['bold', 'yellow']));
  }

  /**
   * Connect to the cluster.
   *
   * @param {string} driverUri - The driver URI.
   * @param {MongoClientOptions} driverOptions - The driver options.
   */
  async connect(driverUri: string, driverOptions: MongoClientOptions): Promise<CliServiceProvider> {
    if (!this.cliOptions.nodb) {
      this.output.write(i18n.__(CONNECTING) + '    ' + this.clr(redactPassword(driverUri), ['bold', 'green']) + '\n');
    }
    const provider = await CliServiceProvider.connect(driverUri, driverOptions, this.cliOptions);
    this.bus.emit('mongosh:driver-initialized', provider.driverMetadata);
    return provider;
  }

  getHistoryFilePath(): string {
    return this.shellHomeDirectory.roamingPath('mongosh_repl_history');
  }

  async getConfig<K extends keyof UserConfig>(key: K): Promise<UserConfig[K]> {
    return this.config[key];
  }

  async setConfig<K extends keyof UserConfig>(key: K, value: UserConfig[K]): Promise<void> {
    this.config[key] = value;
    if (key === 'enableTelemetry') {
      this.config.disableGreetingMessage = true;
      this.bus.emit('mongosh:update-user', this.config.userId, this.config.enableTelemetry);
    }
    try {
      await this.configDirectory.writeConfigFile(this.config);
    } catch (err) {
      this.warnAboutInaccessibleFile(err, this.configDirectory.path());
    }
  }

  async verifyNodeVersion(): Promise<void> {
    if (process.env.MONGOSH_SKIP_NODE_VERSION_CHECK) {
      return;
    }
    const { engines } = require('../package.json');
    // Strip -rc.0, -pre, etc. from the Node.js version because semver rejects those otherwise.
    const baseNodeVersion = process.version.replace(/-.*$/, '');
    if (!semver.satisfies(baseNodeVersion, engines.node)) {
      const warning = new MongoshWarning(`Mismatched node version. Required version: ${engines.node}. Currently using: ${process.version}. Exiting...\n\n`, CliReplErrors.NodeVersionMismatch);
      await this._fatalError(warning);
    }
  }

  /**
   * Is the password missing from the options?
   *
   * @param {MongoClientOptions} driverOptions - The driver options.
   *
   * @returns {boolean} If the password is missing.
   */
  isPasswordMissing(driverOptions: MongoClientOptions): boolean {
    return !!(driverOptions.auth &&
      driverOptions.auth.username &&
      !driverOptions.auth.password);
  }

  /**
   * Require the user to enter a password.
   *
   * @param {string} driverUrl - The driver URI.
   * @param {MongoClientOptions} driverOptions - The driver options.
   */
  async requirePassword(driverUri: string, driverOptions: MongoClientOptions): Promise<void> {
    const passwordPromise = askpassword({
      input: this.input,
      output: this.output,
      replacementCharacter: '*'
    });
    this.output.write('Enter password: ');
    try {
      (driverOptions.auth as any).password = (await passwordPromise).toString();
    } catch (error) {
      await this._fatalError(error);
    }
  }

  private async _fatalError(error: any): Promise<never> {
    this.bus.emit('mongosh:error', error);

    this.output.write(this.mongoshRepl.formatError(error) + '\n');
    return this.exit(1);
  }

  async close(): Promise<void> {
    if (this.closing) {
      return;
    }
    this.closing = true;
    const analytics = this.analytics;
    if (analytics) {
      try {
        await promisify(analytics.flush.bind(analytics))();
      } catch { /* ignore */ }
    }
    this.bus.emit('mongosh:closed');
  }

  async exit(code: number): Promise<never> {
    await this.close();
    await this.onExit(code);
    // onExit never returns. If it does, that's a bug.
    const error = new MongoshInternalError('onExit() unexpectedly returned');
    this.bus.emit('mongosh:error', error);
    throw error;
  }

  clr(text: string, style: StyleDefinition): string {
    return this.mongoshRepl.clr(text, style);
  }
}

export default CliRepl;
