import { MongoshInternalError, MongoshRuntimeError, MongoshWarning } from '@mongosh/errors';
import { redactURICredentials } from '@mongosh/history';
import i18n from '@mongosh/i18n';
import { bson, AutoEncryptionOptions } from '@mongosh/service-provider-core';
import { CliOptions, CliServiceProvider, MongoClientOptions } from '@mongosh/service-provider-server';
import { SnippetManager } from '@mongosh/snippet-manager';
import { Editor } from '@mongosh/editor';
import { redactSensitiveData } from '@mongosh/history';
import Analytics from 'analytics-node';
import askpassword from 'askpassword';
import yaml from 'js-yaml';
import ConnectionString from 'mongodb-connection-string-url';
import Nanobus from 'nanobus';
import semver from 'semver';
import { Readable, Writable } from 'stream';
import { buildInfo } from './build-info';
import type { StyleDefinition } from './clr';
import { ConfigManager, ShellHomeDirectory, ShellHomePaths } from './config-directory';
import { CliReplErrors } from './error-codes';
import { MongoLogManager, MongoLogWriter, mongoLogId } from 'mongodb-log-writer';
import { MongocryptdManager } from './mongocryptd-manager';
import MongoshNodeRepl, { MongoshNodeReplOptions } from './mongosh-repl';
import { setupLoggerAndTelemetry, ToggleableAnalytics } from '@mongosh/logging';
import { MongoshBus, CliUserConfig, CliUserConfigValidator } from '@mongosh/types';
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
  /** The ordered list of paths in which to look for a global configuration file. */
  globalConfigPaths?: string[];
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
  globalConfig: Partial<CliUserConfig> | null = null;
  globalConfigPaths: string[];
  logManager: MongoLogManager;
  logWriter?: MongoLogWriter;
  input: Readable;
  output: Writable;
  analyticsOptions?: AnalyticsOptions;
  segmentAnalytics?: Analytics;
  toggleableAnalytics: ToggleableAnalytics = new ToggleableAnalytics();
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

    this.globalConfigPaths = options.globalConfigPaths ?? [];
    this.shellHomeDirectory = new ShellHomeDirectory(options.shellHomePaths);
    this.configDirectory = new ConfigManager<CliUserConfigOnDisk>(
      this.shellHomeDirectory)
      .on('error', (err: Error) => {
        this.bus.emit('mongosh:error', err, 'config');
      })
      .on('new-config', (config: CliUserConfigOnDisk) => {
        this.setTelemetryEnabled(config.enableTelemetry);
        this.bus.emit('mongosh:new-user', config.userId);
      })
      .on('update-config', (config: CliUserConfigOnDisk) => {
        this.setTelemetryEnabled(config.enableTelemetry);
        this.bus.emit('mongosh:update-user', config.userId);
      });

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

    // We can't really do anything meaningful if the output stream is broken or
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
   * information, external editor, and finally start the repl.
   *
   * @param {string} driverUri - The driver URI.
   * @param {MongoClientOptions} driverOptions - The driver options.
   */
  // eslint-disable-next-line complexity
  async start(driverUri: string, driverOptions: MongoClientOptions): Promise<void> {
    const { version } = require('../package.json');
    await this.verifyNodeVersion();

    if (!this.cliOptions.nodb) {
      const cs = new ConnectionString(driverUri);
      if (!cs.searchParams.get('appName')) {
        cs.searchParams.set('appName', `mongosh ${version}`);
      }

      if (this.isPasswordMissingOptions(driverOptions)) {
        (driverOptions.auth as any).password = await this.requirePassword();
      } else if (this.isPasswordMissingURI(cs)) {
        cs.password = await this.requirePassword();
      }
      this.ensurePasswordFieldIsPresentInAuth(driverOptions);

      driverUri = cs.href;
    }

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

    logger.info('MONGOSH', mongoLogId(1_000_000_000), 'log', 'Starting log', {
      execPath: process.execPath,
      envInfo: redactSensitiveData(this.getLoggedEnvironmentVariables()),
      ...buildInfo()
    });

    let analyticsSetupError: Error | null = null;
    try {
      this.setupAnalytics();
    } catch (err) {
      // Need to delay emitting the error on the bus so that logging is in place
      // as well
      analyticsSetupError = err;
    }

    setupLoggerAndTelemetry(
      this.bus,
      logger,
      this.toggleableAnalytics,
      {
        platform: process.platform,
        arch: process.arch
      },
      require('../package.json').version);

    if (analyticsSetupError) {
      this.bus.emit('mongosh:error', analyticsSetupError, 'analytics');
    }

    try {
      this.config = await this.configDirectory.generateOrReadConfig(this.config);
    } catch (err) {
      this.warnAboutInaccessibleFile(err);
    }

    this.globalConfig = await this.loadGlobalConfigFile();

    if (driverOptions.autoEncryption) {
      const extraOptions = {
        ...(driverOptions.autoEncryption.extraOptions ?? {}),
        ...(await this.startMongocryptd())
      };

      driverOptions.autoEncryption = { ...driverOptions.autoEncryption, extraOptions };
    }

    const initialServiceProvider = await this.connect(driverUri, driverOptions);
    const initialized = await this.mongoshRepl.initialize(initialServiceProvider);

    const commandLineLoadFiles = this.cliOptions.fileNames ?? [];
    const willExecuteCommandLineScripts = commandLineLoadFiles.length > 0 || this.cliOptions.eval !== undefined;
    const willEnterInteractiveMode = !willExecuteCommandLineScripts || !!this.cliOptions.shell;

    let snippetManager: SnippetManager | undefined;
    if (this.config.snippetIndexSourceURLs !== '') {
      snippetManager = SnippetManager.create({
        installdir: this.shellHomeDirectory.roamingPath('snippets'),
        instanceState: this.mongoshRepl.runtimeState().instanceState,
        skipInitialIndexLoad: !willEnterInteractiveMode
      });
    }

    Editor.create({
      input: this.input,
      vscodeDir: this.shellHomeDirectory.rcPath('.vscode'),
      tmpDir: this.shellHomeDirectory.localPath('editor'),
      instanceState: this.mongoshRepl.runtimeState().instanceState,
      loadExternalCode: this.mongoshRepl.loadExternalCode.bind(this.mongoshRepl)
    });

    if (willExecuteCommandLineScripts) {
      this.mongoshRepl.setIsInteractive(willEnterInteractiveMode);
      this.bus.emit('mongosh:start-loading-cli-scripts', { usesShellOption: !!this.cliOptions.shell });
      await this.loadCommandLineFilesAndEval(commandLineLoadFiles);
      if (!this.cliOptions.shell) {
        // We flush the telemetry data as part of exiting. Make sure we have
        // the right config value.
        this.setTelemetryEnabled(await this.getConfig('enableTelemetry'));
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
    // We only enable/disable here, since the rc file/command line scripts
    // can disable the telemetry setting.
    this.setTelemetryEnabled(await this.getConfig('enableTelemetry'));
    this.bus.emit('mongosh:start-mongosh-repl', { version });
    await this.mongoshRepl.startRepl(initialized);
  }

  setupAnalytics(): void {
    if (process.env.IS_MONGOSH_EVERGREEN_CI && !this.analyticsOptions?.alwaysEnable) {
      throw new Error('no analytics setup for the mongosh CI environment');
    }
    // build-info.json is created as a part of the release process
    const apiKey = this.analyticsOptions?.apiKey ?? require('./build-info.json').segmentApiKey;
    this.segmentAnalytics = new Analytics(
      apiKey,
      this.analyticsOptions);
    this.toggleableAnalytics = new ToggleableAnalytics(this.segmentAnalytics);
  }

  setTelemetryEnabled(enabled: boolean): void {
    if (this.globalConfig === null) {
      // This happens when the per-user config file is loaded before we have
      // started loading the global config file. Keep telemetry paused in that
      // case.
      return;
    }
    if (enabled && !this.globalConfig.forceDisableTelemetry) {
      this.toggleableAnalytics.enable();
    } else {
      this.toggleableAnalytics.disable();
    }
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
      this.output.write(this.clr(msg, 'mongosh:warning'));
    }
    for (const file of files) {
      if (!this.cliOptions.quiet) {
        this.output.write(`Loading file: ${this.clr(file, 'mongosh:filename')}\n`);
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
        this.output.write(this.clr('Error while running ~/.mongoshrc.js:\n', 'mongosh:warning'));
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
      this.output.write(this.clr(msg, 'mongosh:warning'));
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
      this.output.write(this.clr(msg, 'mongosh:warning'));
    }
  }

  async loadGlobalConfigFile(): Promise<Partial<CliUserConfig>> {
    let fileContents = '';
    let filename = '';
    for (filename of this.globalConfigPaths) {
      try {
        fileContents = await fs.readFile(filename, 'utf8');
        break;
      } catch (err) {
        if (err.code !== 'ENOENT') {
          this.bus.emit('mongosh:error', err, 'config');
        }
      }
    }
    this.bus.emit('mongosh:globalconfig-load', { filename, found: fileContents.length > 0 });
    try {
      let config: CliUserConfig;
      if (fileContents.trim().startsWith('{')) {
        config = bson.EJSON.parse(fileContents) as any;
      } else {
        config = (yaml.load(fileContents) as any)?.mongosh ?? {};
      }
      for (const [key, value] of Object.entries(config) as [keyof CliUserConfig, any][]) {
        const validationResult = await CliUserConfigValidator.validate(key, value);
        if (validationResult) {
          const msg = `Warning: Ignoring config option "${key}" from ${filename}: ${validationResult}\n`;
          this.output.write(this.clr(msg, 'mongosh:warning'));
          delete config[key];
        }
      }
      return config;
    } catch (err) {
      this.bus.emit('mongosh:error', err, 'config');
      const msg = `Warning: Could not parse global configuration file at ${filename}: ${err.message}\n`;
      this.output.write(this.clr(msg, 'mongosh:warning'));
      return {};
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
    this.output.write(this.clr(msg, 'mongosh:warning'));
  }

  /**
   * Connect to the cluster.
   *
   * @param {string} driverUri - The driver URI.
   * @param {MongoClientOptions} driverOptions - The driver options.
   */
  async connect(driverUri: string, driverOptions: MongoClientOptions): Promise<CliServiceProvider> {
    if (!this.cliOptions.nodb && !this.cliOptions.quiet) {
      this.output.write(i18n.__(CONNECTING) + '\t\t' + this.clr(redactURICredentials(driverUri), 'mongosh:uri') + '\n');
    }
    return await CliServiceProvider.connect(driverUri, driverOptions, this.cliOptions, this.bus);
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
    return (this.config as CliUserConfig)[key]
      ?? (this.globalConfig as CliUserConfig)?.[key]
      ?? (new CliUserConfig())[key];
  }

  /**
   * Implements setConfig from the {@link ConfigProvider} interface.
   */
  async setConfig<K extends keyof CliUserConfig>(key: K, value: CliUserConfig[K]): Promise<'success'> {
    if (key === 'forceDisableTelemetry') {
      throw new MongoshRuntimeError("The 'forceDisableTelemetry' setting cannot be modified");
    }
    this.config[key] = value;
    if (key === 'enableTelemetry') {
      this.setTelemetryEnabled(this.config.enableTelemetry);
      this.bus.emit('mongosh:update-user', this.config.userId);
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
    const hiddenKeys = ['userId', 'disableGreetingMessage', 'forceDisableTelemetry'];
    const keys = Object.keys(new CliUserConfig());
    return keys.filter(key => !hiddenKeys.includes(key));
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
  isPasswordMissingOptions(driverOptions: MongoClientOptions): boolean {
    return !!(
      driverOptions.auth &&
      driverOptions.auth.username &&
      !driverOptions.auth.password &&
      driverOptions.authMechanism !== 'GSSAPI' // no need for a password for Kerberos
    );
  }

  /**
   * Is the password missing from the connection string?
   *
   * @param {ConnectionString} cs - The existing connection string.
   *
   * @returns {boolean} If the password is missing.
   */
  isPasswordMissingURI(cs: ConnectionString): boolean {
    return !!(
      cs.username &&
      !cs.password &&
      cs.searchParams.get('authMechanism') !== 'GSSAPI' // no need for a password for Kerberos
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
  async requirePassword(): Promise<string> {
    const passwordPromise = askpassword({
      input: this.input,
      output: this.output,
      replacementCharacter: '*'
    });
    this.output.write('Enter password: ');
    try {
      try {
        return (await passwordPromise).toString();
      } finally {
        this.output.write('\n');
      }
    } catch (error) {
      await this._fatalError(error);
    }
    return ''; // unreachable
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
    const analytics = this.segmentAnalytics;
    let flushError: string | null = null;
    let flushDuration: number | null = null;
    if (analytics) {
      const flushStart = Date.now();
      try {
        await promisify(analytics.flush.bind(analytics))();
      } catch (err: any) {
        flushError = err.message;
      } finally {
        flushDuration = Date.now() - flushStart;
      }
    }
    this.mongocryptdManager.close();
    // eslint-disable-next-line chai-friendly/no-unused-expressions
    this.logWriter?.info('MONGOSH', mongoLogId(1_000_000_045), 'analytics', 'Flushed outstanding data', {
      flushError,
      flushDuration
    });
    await this.logWriter?.flush();
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

  /** Return environment variables that can be useful for troubleshooting */
  getLoggedEnvironmentVariables(): Record<string, string | undefined> {
    const { EDITOR, NODE_OPTIONS, TERM } = process.env;
    return { EDITOR, NODE_OPTIONS, TERM };
  }
}

export default CliRepl;
