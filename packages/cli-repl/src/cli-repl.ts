import { MongoshInternalError, MongoshRuntimeError, MongoshWarning } from '@mongosh/errors';
import { redactURICredentials } from '@mongosh/history';
import i18n from '@mongosh/i18n';
import { bson, AutoEncryptionOptions } from '@mongosh/service-provider-core';
import { CliOptions, CliServiceProvider, MongoClientOptions } from '@mongosh/service-provider-server';
import { SnippetManager } from '@mongosh/snippet-manager';
import Analytics from 'analytics-node';
import askpassword from 'askpassword';
import Nanobus from 'nanobus';
import semver from 'semver';
import { Readable, Writable } from 'stream';
import type { StyleDefinition } from './clr';
import { ConfigManager, ShellHomeDirectory, ShellHomePaths } from './config-directory';
import { CliReplErrors } from './error-codes';
import { MongoLogManager, MongoLogWriter } from 'mongodb-log-writer';
import { MongocryptdManager } from './mongocryptd-manager';
import MongoshNodeRepl, { MongoshNodeReplOptions } from './mongosh-repl';
import setupLoggerAndTelemetry from './setup-logger-and-telemetry';
import { MongoshBus, CliUserConfig } from '@mongosh/types';
import { promises as fs } from 'fs';
import path from 'path';
import { promisify } from 'util';

/**
 * Connecting text key.
 */
const CONNECTING = 'cli-repl.cli-repl.connecting';

/**
 * The set of options for Segment analytics support.
 */
type AnalyticsOptions = {
  /** The hostname of the HTTP endpoint for Segment. */
  host?: string;
  /** The Segment API key. */
  apiKey?: string;
  /** Whether to enable telemetry even if we are running in CI. */
  alwaysEnable?: boolean;
};

/**
 * The set of options taken by CliRepl instances.
 */
export type CliReplOptions = {
  /** The set of parsed command line flags. */
  shellCliOptions: CliOptions;
  /** The list of executable paths for mongocryptd. */
  mongocryptdSpawnPaths?: string[][],
  /** The stream to read user input from. */
  input: Readable;
  /** The stream to write shell output to. */
  output: Writable;
  /** The set of home directory paths used by this shell instance. */
  shellHomePaths: ShellHomePaths;
  /** A handler for when the REPL exits, e.g. for `exit()` */
  onExit: (code?: number) => never;
  /** Optional analytics override options. */
  analyticsOptions?: AnalyticsOptions;
} & Pick<MongoshNodeReplOptions, 'nodeReplOptions'>;

/** The set of config options that is *always* available in config files stored on the file system. */
type CliUserConfigOnDisk = Partial<CliUserConfig> & Pick<CliUserConfig, 'enableTelemetry' | 'userId'>;

/**
 * The REPL used from the terminal.
 *
 * Unlike MongoshNodeRepl, this class implements I/O interactions.
 */
class CliRepl {
  mongoshRepl: MongoshNodeRepl;
  bus: MongoshBus;
  cliOptions: CliOptions;
  mongocryptdManager: MongocryptdManager;
  shellHomeDirectory: ShellHomeDirectory;
  configDirectory: ConfigManager<CliUserConfigOnDisk>;
  config: CliUserConfigOnDisk;
  logManager: MongoLogManager;
  logWriter?: MongoLogWriter;
  input: Readable;
  output: Writable;
  analyticsOptions?: AnalyticsOptions;
  analytics?: Analytics;
  warnedAboutInaccessibleFiles = false;
  onExit: (code?: number) => Promise<never>;
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
    this.onExit = options.onExit;
    this.config = {
      userId: new bson.ObjectId().toString(),
      enableTelemetry: true
    };

    this.shellHomeDirectory = new ShellHomeDirectory(options.shellHomePaths);
    this.configDirectory = new ConfigManager<CliUserConfigOnDisk>(
      this.shellHomeDirectory)
      .on('error', (err: Error) =>
        this.bus.emit('mongosh:error', err, 'config'))
      .on('new-config', (config: CliUserConfigOnDisk) =>
        this.bus.emit('mongosh:new-user', config.userId, config.enableTelemetry))
      .on('update-config', (config: CliUserConfigOnDisk) =>
        this.bus.emit('mongosh:update-user', config.userId, config.enableTelemetry));

    this.mongocryptdManager = new MongocryptdManager(
      options.mongocryptdSpawnPaths ?? [],
      this.shellHomeDirectory,
      this.bus);

    this.logManager = new MongoLogManager({
      directory: this.shellHomeDirectory.localPath('.'),
      retentionDays: 30,
      onerror: (err: Error) => this.bus.emit('mongosh:error', err, 'log'),
      onwarn: (err: Error, path: string) => this.warnAboutInaccessibleFile(err, path)
    });

    // We can't really do anything meaningfull if the output stream is broken or
    // closed. To avoid throwing an error while writing to it, let's send it to
    // the telemetry instead
    this.output.on('error', (err: Error) => {
      this.bus.emit('mongosh:error', err, 'io');
    });

    this.mongoshRepl = new MongoshNodeRepl({
      ...options,
      nodeReplOptions: options.nodeReplOptions ?? {
        terminal: process.env.MONGOSH_FORCE_TERMINAL ? true : undefined,
      },
      bus: this.bus,
      ioProvider: this
    });
  }

  /**
   * Setup CLI environment: serviceProvider, ShellEvaluator, log connection
   * information, and finally start the repl.
   *
   * @param {string} driverUri - The driver URI.
   * @param {MongoClientOptions} driverOptions - The driver options.
   */
  // eslint-disable-next-line complexity
  async start(driverUri: string, driverOptions: MongoClientOptions): Promise<void> {
    const { version } = require('../package.json');
    await this.verifyNodeVersion();
    if (this.isPasswordMissing(driverOptions)) {
      await this.requirePassword(driverUri, driverOptions);
    }
    this.ensurePasswordFieldIsPresentInAuth(driverOptions);

    try {
      await this.shellHomeDirectory.ensureExists();
    } catch (err) {
      this.warnAboutInaccessibleFile(err);
    }

    await this.logManager.cleanupOldLogfiles();
    const logger = await this.logManager.createLogWriter();
    if (!this.cliOptions.quiet) {
      this.output.write(`Current Mongosh Log ID:\t${logger.logId}\n`);
    }
    this.logWriter = logger;

    setupLoggerAndTelemetry(
      logger.logId,
      this.bus,
      () => logger,
      () => {
        if (process.env.IS_MONGOSH_EVERGREEN_CI && !this.analyticsOptions?.alwaysEnable) {
          // This error will be in the log file, but otherwise not visible to users
          throw new Error('no analytics setup for the mongosh CI environment');
        }
        this.analytics = new Analytics(
          // analytics-config.js gets written as a part of a release
          this.analyticsOptions?.apiKey ?? require('./build-info.json').segmentApiKey,
          this.analyticsOptions);
        return this.analytics;
      });

    try {
      this.config = await this.configDirectory.generateOrReadConfig(this.config);
    } catch (err) {
      this.warnAboutInaccessibleFile(err);
    }

    if (driverOptions.autoEncryption) {
      const extraOptions = {
        ...(driverOptions.autoEncryption.extraOptions ?? {}),
        ...(await this.startMongocryptd())
      };

      driverOptions.autoEncryption = { ...driverOptions.autoEncryption, extraOptions };
    }

    const initialServiceProvider = await this.connect(driverUri, driverOptions);
    const initialized = await this.mongoshRepl.initialize(initialServiceProvider);

    let snippetManager: SnippetManager | undefined;
    if (this.config.snippetIndexSourceURLs !== '') {
      snippetManager = new SnippetManager({
        installdir: this.shellHomeDirectory.roamingPath('snippets'),
        instanceState: this.mongoshRepl.runtimeState().instanceState
      });
    }

    const commandLineLoadFiles = this.cliOptions.fileNames ?? [];
    if (commandLineLoadFiles.length > 0 || this.cliOptions.eval !== undefined) {
      this.mongoshRepl.setIsInteractive(!!this.cliOptions.shell);
      this.bus.emit('mongosh:start-loading-cli-scripts', { usesShellOption: !!this.cliOptions.shell });
      await this.loadCommandLineFilesAndEval(commandLineLoadFiles);
      if (!this.cliOptions.shell) {
        await this.exit(0);
        return;
      }
    } else {
      this.mongoshRepl.setIsInteractive(true);
    }
    if (!this.cliOptions.norc) {
      await snippetManager?.loadAllSnippets();
    }
    await this.loadRcFiles();
    this.bus.emit('mongosh:start-mongosh-repl', { version });
    await this.mongoshRepl.startRepl(initialized);
  }

  async loadCommandLineFilesAndEval(files: string[]) {
    if (this.cliOptions.eval) {
      this.bus.emit('mongosh:eval-cli-script');
      const evalResult = await this.mongoshRepl.loadExternalCode(this.cliOptions.eval, '@(shell eval)');
      this.output.write(this.mongoshRepl.writer(evalResult) + '\n');
    } else if (this.cliOptions.eval === '') {
      // This happens e.g. when --eval is followed by another option, for example
      // when running `mongosh --eval --shell "eval script"`, which can happen
      // if you're like me and sometimes insert options in the wrong place
      const msg = 'Warning: --eval requires an argument, but no argument was given\n';
      this.output.write(this.clr(msg, ['bold', 'yellow']));
    }
    for (const file of files) {
      if (!this.cliOptions.quiet) {
        this.output.write(`Loading file: ${this.clr(file, ['bold', 'blue'])}\n`);
      }
      await this.mongoshRepl.loadExternalFile(file);
    }
  }

  /**
   * Load the .mongoshrc.js file, and warn about mismatched filenames, if any.
   */
  async loadRcFiles(): Promise<void> {
    if (this.cliOptions.norc) {
      return;
    }
    const legacyPath = this.shellHomeDirectory.rcPath('.mongorc.js');
    const mongoshrcPath = this.shellHomeDirectory.rcPath('.mongoshrc.js');
    const mongoshrcMisspelledPath = this.shellHomeDirectory.rcPath('.mongoshrc');

    let hasMongoshRc = false;
    try {
      await fs.stat(mongoshrcPath);
      hasMongoshRc = true;
    } catch { /* file not present */ }
    if (hasMongoshRc) {
      try {
        this.bus.emit('mongosh:mongoshrc-load');
        await this.mongoshRepl.loadExternalFile(mongoshrcPath);
      } catch (err) {
        this.output.write(this.clr('Error while running ~/.mongoshrc.js:\n', ['bold', 'yellow']));
        this.output.write(this.mongoshRepl.writer(err) + '\n');
      }
      return;
    }

    if (this.cliOptions.quiet) {
      return;
    }

    let hasLegacyRc = false;
    try {
      await fs.stat(legacyPath);
      hasLegacyRc = true;
    } catch { /* file not present */ }
    if (hasLegacyRc) {
      this.bus.emit('mongosh:mongoshrc-mongorc-warn');
      const msg =
        'Warning: Found ~/.mongorc.js, but not ~/.mongoshrc.js. ~/.mongorc.js will not be loaded.\n' +
        '  You may want to copy or rename ~/.mongorc.js to ~/.mongoshrc.js.\n';
      this.output.write(this.clr(msg, ['bold', 'yellow']));
      return;
    }

    let hasMisspelledFilename = false;
    try {
      await fs.stat(mongoshrcMisspelledPath);
      hasMisspelledFilename = true;
    } catch { /* file not present */ }
    if (hasMisspelledFilename) {
      const msg =
        'Warning: Found ~/.mongoshrc, but not ~/.mongoshrc.js. Did you forget to add .js?\n';
      this.output.write(this.clr(msg, ['bold', 'yellow']));
    }
  }

  /**
   * Use when a warning about an inaccessible config file needs to be written.
   */
  warnAboutInaccessibleFile(err: Error, path?: string): void {
    this.bus.emit('mongosh:error', err, 'config');
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
    if (!this.cliOptions.nodb && !this.cliOptions.quiet) {
      this.output.write(i18n.__(CONNECTING) + '\t\t' + this.clr(redactURICredentials(driverUri), ['bold', 'green']) + '\n');
    }
    const provider = await CliServiceProvider.connect(driverUri, driverOptions, this.cliOptions, this.bus);
    this.bus.emit('mongosh:driver-initialized', provider.driverMetadata);
    return provider;
  }

  /** Return the file path used for the REPL history. */
  getHistoryFilePath(): string {
    return this.shellHomeDirectory.roamingPath('mongosh_repl_history');
  }

  /**
   * Implements getConfig from the {@link ConfigProvider} interface.
   */
  // eslint-disable-next-line @typescript-eslint/require-await
  async getConfig<K extends keyof CliUserConfig>(key: K): Promise<CliUserConfig[K]> {
    return (this.config as CliUserConfig)[key] ?? (new CliUserConfig())[key];
  }

  /**
   * Implements setConfig from the {@link ConfigProvider} interface.
   */
  async setConfig<K extends keyof CliUserConfig>(key: K, value: CliUserConfig[K]): Promise<'success'> {
    this.config[key] = value;
    if (key === 'enableTelemetry') {
      this.bus.emit('mongosh:update-user', this.config.userId, this.config.enableTelemetry);
    }
    try {
      await this.configDirectory.writeConfigFile(this.config);
    } catch (err) {
      this.warnAboutInaccessibleFile(err, this.configDirectory.path());
    }
    return 'success';
  }

  /**
   * Implements listConfigOptions from the {@link ConfigProvider} interface.
   */
  listConfigOptions(): string[] {
    const keys = Object.keys(new CliUserConfig()) as (keyof CliUserConfig)[];
    return keys.filter(key => key !== 'userId' && key !== 'disableGreetingMessage');
  }

  /**
   * Verify that we are running on a supported Node.js version, and error out if not.
   */
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
    return !!(
      driverOptions.auth &&
      driverOptions.auth.username &&
      !driverOptions.auth.password &&
      driverOptions.authMechanism !== 'GSSAPI' // no need for a password for Kerberos
    );
  }

  /**
   * Sets the auth.password field to undefined in the driverOptions if the auth
   * object is present with a truthy username. This is required by the driver, e.g.
   * in the case of password-less Kerberos authentication.
   */
  ensurePasswordFieldIsPresentInAuth(driverOptions: MongoClientOptions): void {
    if (driverOptions.auth && driverOptions.auth.username && !('password' in driverOptions.auth)) {
      driverOptions.auth.password = undefined;
    }
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
      try {
        (driverOptions.auth as any).password = (await passwordPromise).toString();
      } finally {
        this.output.write('\n');
      }
    } catch (error) {
      await this._fatalError(error);
    }
  }

  private async _fatalError(error: any): Promise<never> {
    this.bus.emit('mongosh:error', error, 'fatal');

    this.output.write(this.mongoshRepl.formatError(error) + '\n');
    return this.exit(1);
  }

  /**
   * Close all open resources held by this REPL instance.
   */
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
    this.mongocryptdManager.close();
    await this.logWriter?.flush?.();
    this.bus.emit('mongosh:closed');
  }

  /**
   * Called when exit() or quit() is called from the shell,
   * or when the REPL is ended because the input stream ends.
   *
   * @param code The user-provided exit code, if any.
   */
  async exit(code?: number): Promise<never> {
    await this.close();
    await this.onExit(code);
    // onExit never returns. If it does, that's a bug.
    const error = new MongoshInternalError('onExit() unexpectedly returned');
    this.bus.emit('mongosh:error', error, 'fatal');
    throw error;
  }

  /** Read a file from disk. */
  async readFileUTF8(filename: string): Promise<{ contents: string, absolutePath: string }> {
    const resolved = path.resolve(filename);
    return {
      contents: await fs.readFile(resolved, 'utf8'),
      absolutePath: resolved
    };
  }

  /** Colorize a string using a specified set of styles. */
  clr(text: string, style: StyleDefinition): string {
    return this.mongoshRepl.clr(text, style);
  }

  /** Start a mongocryptd instance for automatic FLE. */
  async startMongocryptd(): Promise<AutoEncryptionOptions['extraOptions']> {
    try {
      return await this.mongocryptdManager.start();
    } catch (e) {
      if (e.code === 'ENOENT') {
        throw new MongoshRuntimeError('Could not find a working mongocryptd - ensure your local installation works correctly. See the mongosh log file for additional information. Please also refer to the documentation: https://docs.mongodb.com/manual/reference/security-client-side-encryption-appendix/');
      }
      throw e;
    }
  }

  /** Provide extra information for reporting internal errors */
  bugReportErrorMessageInfo(): string {
    return `Please include the log file for this session (${this.logWriter?.logFilePath}).`;
  }
}

export default CliRepl;
