import { CliServiceProvider, MongoClientOptions, CliOptions } from '@mongosh/service-provider-server';
import { ConfigManager, ShellHomeDirectory } from './config-directory';
import { MongoshInternalError, MongoshWarning } from '@mongosh/errors';
import { redactPassword } from '@mongosh/history';
import i18n from '@mongosh/i18n';
import { bson } from '@mongosh/service-provider-core';
import MongoshNodeRepl from './mongosh-repl';
import Nanobus from 'nanobus';
import setupLoggerAndTelemetry from './setup-logger-and-telemetry';
import type { StyleDefinition } from './clr';
import askpassword from 'askpassword';
import semver from 'semver';
import type { Readable, Writable } from 'stream';
import Analytics from 'analytics-node';
import pino from 'pino';
import { UserConfig } from './types';

/**
 * Connecting text key.
 */
const CONNECTING = 'cli-repl.cli-repl.connecting';

export type CliReplOptions = {
  shellCliOptions: CliOptions,
  input: Readable;
  output: Writable;
  shellHomePath: string;
  onExit: (code: number) => never;
};

/**
 * The REPL used from the terminal.
 */
class CliRepl {
  mongoshRepl: MongoshNodeRepl;
  bus: Nanobus;
  cliOptions: CliOptions;
  shellHomeDirectory: ShellHomeDirectory;
  configDirectory: ConfigManager<UserConfig>;
  config: UserConfig = new UserConfig();
  input: Readable;
  output: Writable;

  /**
   * Instantiate the new CLI Repl.
   */
  constructor(options: CliReplOptions) {
    this.bus = new Nanobus('mongosh');
    this.cliOptions = options.shellCliOptions;
    this.input = options.input;
    this.output = options.output;

    this.shellHomeDirectory = new ShellHomeDirectory(options.shellHomePath);
    this.configDirectory = new ConfigManager<UserConfig>(
      this.shellHomeDirectory)
      .on('error', (err: Error) =>
        this.bus.emit('mongosh:error', err))
      .on('new-config', (config: UserConfig) =>
        this.bus.emit('mongosh:new-user', config.userId, config.enableTelemetry))
      .on('update-config', (config: UserConfig) =>
        this.bus.emit('mongosh:update-user', config.userId, config.enableTelemetry));

    this.mongoshRepl = new MongoshNodeRepl({
      ...options,
      nodeReplOptions: {
        terminal: process.env.MONGOSH_FORCE_TERMINAL ? true : undefined,
      },
      bus: this.bus,
      configProvider: this
    });

    this.bus.on('mongosh:exit', (code: number) => options.onExit(code));
  }

  /**
   * setup CLI environment: serviceProvider, ShellEvaluator, log connection
   * information, and finally start the repl.
   *
   * @param {string} driverUri - The driver URI.
   * @param {MongoClientOptions} driverOptions - The driver options.
   */
  async start(driverUri: string, driverOptions: MongoClientOptions): Promise<void> {
    this.verifyNodeVersion();
    if (this.isPasswordMissing(driverOptions)) {
      await this.requirePassword(driverUri, driverOptions);
    }

    const logId = new bson.ObjectId().toString();
    this.output.write(`Current Mongosh Log ID: ${logId}\n`);

    try {
      await this.shellHomeDirectory.ensureExists();
    } catch (err) {
      this._fatalError(err);
    }

    setupLoggerAndTelemetry(
      logId,
      this.bus,
      () => pino({ name: 'monogsh' }, pino.destination(this.shellHomeDirectory.path(`${logId}_log`))),
      // analytics-config.js gets written as a part of a release
      () => new Analytics(require('./analytics-config.js').SEGMENT_API_KEY));

    this.config = await this.configDirectory.generateOrReadConfig({
      userId: new bson.ObjectId().toString(),
      enableTelemetry: true,
      disableGreetingMessage: false
    });

    const initialServiceProvider = await this.connect(driverUri, driverOptions);
    await this.mongoshRepl.start(initialServiceProvider);
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
    return await CliServiceProvider.connect(driverUri, driverOptions, this.cliOptions);
  }

  getHistoryFilePath(): string {
    return this.shellHomeDirectory.path('.mongosh_repl_history');
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
    await this.configDirectory.writeConfigFile(this.config);
  }

  verifyNodeVersion(): void {
    if (process.env.MONGOSH_SKIP_NODE_VERSION_CHECK) {
      return;
    }
    const { engines } = require('../package.json');
    // Strip -rc.0, -pre, etc. from the Node.js version because semver rejects those otherwise.
    const baseNodeVersion = process.version.replace(/-.*$/, '');
    if (!semver.satisfies(baseNodeVersion, engines.node)) {
      const warning = new MongoshWarning(`Mismatched node version. Required version: ${engines.node}. Currently using: ${process.version}. Exiting...\n\n`);
      this._fatalError(warning);
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
      driverOptions.auth.user &&
      !(driverOptions.auth as any).password); // TODO: Node 4.0 takes pass?
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
      this.bus.emit('mongosh:error', error);
      return this._fatalError(error);
    }
  }

  private _fatalError(error: any): never {
    this.bus.emit('mongosh:error', error);

    this.output.write(this.mongoshRepl.formatError(error) + '\n');
    this.exit(1);
  }

  exit(code: number): never {
    this.bus.emit('mongosh:exit', code);
    // Emitting mongosh:exit never returns. If it does, that's a bug.
    throw new MongoshInternalError('mongosh:exit unexpectedly returned');
  }

  clr(text: string, style: StyleDefinition): string {
    return this.mongoshRepl.clr(text, style);
  }
}

export default CliRepl;
