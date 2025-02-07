import {
  MongoshInternalError,
  MongoshRuntimeError,
  MongoshWarning,
} from '@mongosh/errors';
import { redactURICredentials } from '@mongosh/history';
import i18n from '@mongosh/i18n';
import type { AutoEncryptionOptions } from '@mongosh/service-provider-core';
import { bson } from '@mongosh/service-provider-core';
import { NodeDriverServiceProvider } from '@mongosh/service-provider-node-driver';
import type { CliOptions, DevtoolsConnectOptions } from '@mongosh/arg-parser';
import { SnippetManager } from '@mongosh/snippet-manager';
import { Editor } from '@mongosh/editor';
import { redactSensitiveData } from '@mongosh/history';
import type { Analytics as SegmentAnalytics } from '@segment/analytics-node';
import askpassword from 'askpassword';
import { EventEmitter, once } from 'events';
import yaml from 'js-yaml';
import ConnectionString from 'mongodb-connection-string-url';
import semver from 'semver';
import type { Readable, Writable } from 'stream';
import { buildInfo, getGlibcVersion } from './build-info';
import type { StyleDefinition } from './clr';
import type { ShellHomePaths } from './config-directory';
import { ConfigManager, ShellHomeDirectory } from './config-directory';
import { CliReplErrors } from './error-codes';
import type { CryptLibraryPathResult } from './crypt-library-paths';
import { formatForJSONOutput } from './format-json';
import type { MongoLogWriter } from 'mongodb-log-writer';
import { MongoLogManager, mongoLogId } from 'mongodb-log-writer';
import type { MongoshNodeReplOptions, MongoshIOProvider } from './mongosh-repl';
import MongoshNodeRepl from './mongosh-repl';
import type { MongoshLoggingAndTelemetry } from '@mongosh/logging';
import { setupLoggingAndTelemetry } from '@mongosh/logging';
import {
  ToggleableAnalytics,
  ThrottledAnalytics,
  SampledAnalytics,
} from '@mongosh/logging';
import type { MongoshBus } from '@mongosh/types';
import {
  CliUserConfig,
  CliUserConfigValidator,
  TimingCategories,
} from '@mongosh/types';
import { promises as fs } from 'fs';
import path from 'path';
import { getOsInfo } from './get-os-info';
import { UpdateNotificationManager } from './update-notification-manager';
import { getTimingData, markTime, summariseTimingData } from './startup-timing';
import type { IdPInfo } from 'mongodb';
import type {
  AgentWithInitialize,
  DevtoolsProxyOptions,
} from '@mongodb-js/devtools-proxy-support';
import { useOrCreateAgent } from '@mongodb-js/devtools-proxy-support';

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
  /** A function for getting the shared library path for in-use encryption. */
  getCryptLibraryPaths?: (bus: MongoshBus) => Promise<CryptLibraryPathResult>;
  /** The stream to read user input from. */
  input: Readable;
  /** The stream to write shell output to. */
  output: Writable;
  /**
   * The stream to write prompt output to when requesting data from user, like password.
   * Helpful when user wants to redirect the output to a file or null device.
   * If not provided, the `output` stream will be used.
   */
  promptOutput?: Writable;
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
type CliUserConfigOnDisk = Partial<CliUserConfig> &
  Pick<CliUserConfig, 'enableTelemetry' | 'userId' | 'telemetryAnonymousId'>;

/**
 * The REPL used from the terminal.
 *
 * Unlike MongoshNodeRepl, this class implements I/O interactions.
 */
export class CliRepl implements MongoshIOProvider {
  mongoshRepl: MongoshNodeRepl;
  bus: MongoshBus;
  cliOptions: Readonly<CliOptions>;
  getCryptLibraryPaths?: (bus: MongoshBus) => Promise<CryptLibraryPathResult>;
  cachedCryptLibraryPath?: Promise<CryptLibraryPathResult>;
  shellHomeDirectory: ShellHomeDirectory;
  configDirectory: ConfigManager<CliUserConfigOnDisk>;
  config: CliUserConfigOnDisk;
  globalConfig: Partial<CliUserConfig> | null = null;
  globalConfigPaths: string[];
  logManager?: MongoLogManager;
  logWriter?: MongoLogWriter;
  input: Readable;
  output: Writable;
  promptOutput: Writable;
  analyticsOptions?: AnalyticsOptions;
  segmentAnalytics?: SegmentAnalytics;
  toggleableAnalytics: ToggleableAnalytics = new ToggleableAnalytics();
  warnedAboutInaccessibleFiles = false;
  onExit: (code?: number) => Promise<never>;
  closingPromise?: Promise<void>;
  isContainerizedEnvironment = false;
  hasOnDiskTelemetryId = false;
  proxyOptions: DevtoolsProxyOptions = {
    useEnvironmentVariableProxies: true,
  };
  agent: AgentWithInitialize | undefined;
  updateNotificationManager: UpdateNotificationManager;
  fetchMongoshUpdateUrlRegardlessOfCiEnvironment = false; // for testing
  cachedGlibcVersion: null | string | undefined = null;

  private loggingAndTelemetry: MongoshLoggingAndTelemetry | undefined;

  /**
   * Instantiate the new CLI Repl.
   */
  constructor(options: CliReplOptions) {
    this.bus = new EventEmitter();
    this.cliOptions = options.shellCliOptions;
    this.input = options.input;
    this.output = options.output;
    this.promptOutput = options.promptOutput ?? options.output;
    this.analyticsOptions = options.analyticsOptions;
    this.onExit = options.onExit;

    const id = new bson.ObjectId().toHexString();
    this.config = {
      userId: id,
      telemetryAnonymousId: id,
      enableTelemetry: true,
    };

    this.getCryptLibraryPaths = options.getCryptLibraryPaths;
    this.globalConfigPaths = options.globalConfigPaths ?? [];
    this.shellHomeDirectory = new ShellHomeDirectory(options.shellHomePaths);
    this.configDirectory = new ConfigManager<CliUserConfigOnDisk>(
      this.shellHomeDirectory
    )
      .on('error', (err: Error) => {
        this.bus.emit('mongosh:error', err, 'config');
      })
      .on('new-config', (config: CliUserConfigOnDisk) => {
        this.hasOnDiskTelemetryId = !!(
          config.userId || config.telemetryAnonymousId
        );
        this.setTelemetryEnabled(config.enableTelemetry);
        this.bus.emit('mongosh:new-user', {
          userId: config.userId,
          anonymousId: config.telemetryAnonymousId,
        });
      })
      .on('update-config', (config: CliUserConfigOnDisk) => {
        this.hasOnDiskTelemetryId = !!(
          config.userId || config.telemetryAnonymousId
        );
        this.setTelemetryEnabled(config.enableTelemetry);
        this.bus.emit('mongosh:update-user', {
          userId: config.userId,
          anonymousId: config.telemetryAnonymousId,
        });
      });

    this.agent = useOrCreateAgent(this.proxyOptions);
    this.updateNotificationManager = new UpdateNotificationManager({
      proxyOptions: this.agent,
    });

    // We can't really do anything meaningful if the output stream is broken or
    // closed. To avoid throwing an error while writing to it, let's send it to
    // the telemetry instead
    this.output.on('error', (err: Error) => {
      this.bus.emit('mongosh:error', err, 'io');
    });

    let jsContext = this.cliOptions.jsContext;
    const { willEnterInteractiveMode, quiet } = CliRepl.getFileAndEvalInfo(
      this.cliOptions
    );
    if (jsContext === 'auto' || !jsContext) {
      jsContext = willEnterInteractiveMode ? 'repl' : 'plain-vm';
    }

    this.mongoshRepl = new MongoshNodeRepl({
      ...options,
      shellCliOptions: { ...this.cliOptions, jsContext, quiet },
      nodeReplOptions: options.nodeReplOptions ?? {
        terminal: process.env.MONGOSH_FORCE_TERMINAL ? true : undefined,
      },
      bus: this.bus,
      ioProvider: this,
    });

    this.setupOIDCTokenDumpListener();
  }

  async getIsContainerizedEnvironment() {
    // Check for dockerenv file first
    try {
      await fs.stat('/.dockerenv');
      return true;
    } catch {
      try {
        // Check if there is any mention of docker / lxc / k8s in control groups
        const cgroup = await fs.readFile('/proc/self/cgroup', 'utf8');
        return /\b(docker|lxc|kubepods)\b/.test(cgroup);
      } catch {
        return false;
      }
    }
  }

  get forceDisableTelemetry(): boolean {
    return (
      this.globalConfig?.forceDisableTelemetry ||
      (this.isContainerizedEnvironment && !this.mongoshRepl.isInteractive) ||
      !!process.env.MONGOSH_FORCE_DISABLE_TELEMETRY_FOR_TESTING
    );
  }

  /** Setup log writer and start logging. */
  private async startLogging(): Promise<void> {
    if (!this.loggingAndTelemetry) {
      throw new Error('Logging and telemetry not setup');
    }

    this.logManager ??= new MongoLogManager({
      directory:
        (await this.getConfig('logLocation')) ||
        this.shellHomeDirectory.localPath('.'),
      retentionDays: await this.getConfig('logRetentionDays'),
      maxLogFileCount: +(
        process.env.MONGOSH_TEST_ONLY_MAX_LOG_FILE_COUNT || 100
      ),
      onerror: (err: Error) => this.bus.emit('mongosh:error', err, 'log'),
      onwarn: (err: Error, path: string) =>
        this.warnAboutInaccessibleFile(err, path),
    });

    // Do not wait for log cleanup and log errors if MongoLogManager throws any.
    void this.logManager
      .cleanupOldLogFiles()
      .catch((err) => {
        this.bus.emit('mongosh:error', err, 'log');
      })
      .finally(() => {
        markTime(TimingCategories.Logging, 'cleaned up log files');
      });

    if (!this.logWriter) {
      this.logWriter ??= await this.logManager.createLogWriter();

      const { quiet } = CliRepl.getFileAndEvalInfo(this.cliOptions);
      if (!quiet) {
        this.output.write(`Current Mongosh Log ID:\t${this.logWriter.logId}\n`);
      }

      markTime(TimingCategories.Logging, 'instantiated log writer');
    }

    this.loggingAndTelemetry.attachLogger(this.logWriter);

    this.logWriter.info(
      'MONGOSH',
      mongoLogId(1_000_000_000),
      'log',
      'Starting log',
      {
        execPath: process.execPath,
        envInfo: redactSensitiveData(this.getLoggedEnvironmentVariables()),
        ...(await buildInfo()),
      }
    );
    markTime(TimingCategories.Logging, 'logged initial message');
  }

  /**
   * Setup CLI environment: serviceProvider, ShellEvaluator, log connection
   * information, external editor, and finally start the repl.
   *
   * @param {string} driverUri - The driver URI.
   * @param {DevtoolsConnectOptions} driverOptions - The driver options.
   */
  async start(
    driverUri: string,
    driverOptions: DevtoolsConnectOptions
  ): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { version }: { version: string } = require('../package.json');
    await this.verifyNodeVersion();
    markTime(TimingCategories.REPLInstantiation, 'verified node version');

    this.isContainerizedEnvironment =
      await this.getIsContainerizedEnvironment();
    markTime(
      TimingCategories.REPLInstantiation,
      'checked containerized environment'
    );

    if (!this.cliOptions.nodb) {
      const cs = new ConnectionString(driverUri);
      const searchParams = cs.typedSearchParams<DevtoolsConnectOptions>();
      if (!searchParams.get('appName')) {
        searchParams.set('appName', `mongosh ${version}`);
      }

      if (this.isPasswordMissingURI(cs)) {
        cs.password = encodeURIComponent(await this.requirePassword());
      }

      if (await this.isTlsKeyFilePasswordMissingURI(searchParams)) {
        const keyFilePassword = encodeURIComponent(
          await this.requirePassword('Enter TLS key file password')
        );
        searchParams.set('tlsCertificateKeyFilePassword', keyFilePassword);
      }

      this.ensurePasswordFieldIsPresentInAuth(driverOptions);
      driverUri = cs.toString();
    }

    try {
      await this.shellHomeDirectory.ensureExists();
    } catch (err: unknown) {
      this.warnAboutInaccessibleFile(err as Error);
    }
    markTime(TimingCategories.REPLInstantiation, 'ensured shell homedir');

    let analyticsSetupError: Error | null = null;
    try {
      await this.setupAnalytics();
    } catch (err: unknown) {
      // Need to delay emitting the error on the bus so that logging is in place
      // as well
      analyticsSetupError = err as Error;
    }

    markTime(TimingCategories.Telemetry, 'created analytics instance');

    this.loggingAndTelemetry = setupLoggingAndTelemetry({
      bus: this.bus,
      analytics: this.toggleableAnalytics,
      userTraits: {
        platform: process.platform,
        arch: process.arch,
        is_containerized: this.isContainerizedEnvironment,
        ...(await getOsInfo()),
      },
      mongoshVersion: version,
    });

    markTime(TimingCategories.Telemetry, 'completed telemetry setup');

    if (analyticsSetupError) {
      this.bus.emit('mongosh:error', analyticsSetupError, 'analytics');
    }

    // Read local and global configuration
    try {
      this.config = await this.configDirectory.generateOrReadConfig(
        this.config
      );
    } catch (err: unknown) {
      this.warnAboutInaccessibleFile(err as Error);
    }

    this.globalConfig = await this.loadGlobalConfigFile();
    markTime(TimingCategories.UserConfigLoading, 'read global config files');

    await this.setLoggingEnabled(!(await this.getConfig('disableLogging')));

    // Needs to happen after loading the mongosh config file(s)
    void this.fetchMongoshUpdateUrl();

    if (driverOptions.autoEncryption) {
      const origExtraOptions = driverOptions.autoEncryption.extraOptions ?? {};
      if (origExtraOptions.cryptSharedLibPath) {
        // If a CSFLE path has been specified through 'driverOptions', save it
        // for later use.
        this.cachedCryptLibraryPath = Promise.resolve({
          cryptSharedLibPath: origExtraOptions.cryptSharedLibPath,
        });
      }

      const extraOptions = {
        ...origExtraOptions,
        ...(await this.getCryptLibraryOptions()),
      };

      driverOptions.autoEncryption = {
        ...driverOptions.autoEncryption,
        extraOptions,
      };
    }
    if (
      Object.keys(driverOptions.autoEncryption ?? {}).join(',') ===
      'extraOptions'
    ) {
      // In this case, autoEncryption opts were only specified for crypt library specs
      delete driverOptions.autoEncryption;
    }

    driverOptions = await this.prepareOIDCOptions(driverUri, driverOptions);
    markTime(TimingCategories.DriverSetup, 'prepared OIDC options');

    let initialServiceProvider;
    try {
      initialServiceProvider = await this.connect(driverUri, driverOptions);
    } catch (err) {
      if (
        typeof err === 'object' &&
        err?.constructor.name === 'MongoDBOIDCError' &&
        !String(driverOptions.oidc?.allowedFlows)?.includes('device-auth')
      ) {
        (err as Error).message +=
          '\nConsider specifying --oidcFlows=auth-code,device-auth if you are running mongosh in an environment without browser access.';
      }
      throw err;
    }
    markTime(TimingCategories.DriverSetup, 'completed SP setup');
    const initialized = await this.mongoshRepl.initialize(
      initialServiceProvider,
      await this.getMoreRecentMongoshVersion()
    );
    markTime(TimingCategories.REPLInstantiation, 'initialized mongosh repl');
    this.injectReplFunctions();

    const {
      commandLineLoadFiles,
      evalScripts,
      willEnterInteractiveMode,
      willExecuteCommandLineScripts,
    } = CliRepl.getFileAndEvalInfo(this.cliOptions);

    if (
      (evalScripts.length === 0 ||
        this.cliOptions.shell ||
        commandLineLoadFiles.length > 0) &&
      this.cliOptions.json
    ) {
      throw new MongoshRuntimeError(
        'Cannot use --json without --eval or with --shell or with extra files'
      );
    }

    let snippetManager: SnippetManager | undefined;
    if (this.config.snippetIndexSourceURLs !== '') {
      snippetManager = SnippetManager.create({
        installdir: this.shellHomeDirectory.roamingPath('snippets'),
        instanceState: this.mongoshRepl.runtimeState().instanceState,
        skipInitialIndexLoad: !willEnterInteractiveMode,
        proxyOptions: this.agent,
      });
    }

    Editor.create({
      input: this.input,
      vscodeDir: this.shellHomeDirectory.rcPath('.vscode'),
      tmpDir: this.shellHomeDirectory.localPath('editor'),
      instanceState: this.mongoshRepl.runtimeState().instanceState,
      loadExternalCode: this.mongoshRepl.loadExternalCode.bind(
        this.mongoshRepl
      ),
    });
    markTime(TimingCategories.REPLInstantiation, 'set up editor');

    if (willExecuteCommandLineScripts) {
      this.mongoshRepl.setIsInteractive(willEnterInteractiveMode);

      this.bus.emit('mongosh:start-session', {
        isInteractive: false,
        jsContext: this.mongoshRepl.jsContext(),
        timings: summariseTimingData(getTimingData()),
      });

      this.bus.emit('mongosh:start-loading-cli-scripts', {
        usesShellOption: !!this.cliOptions.shell,
      });

      const exitCode = await this.loadCommandLineFilesAndEval(
        commandLineLoadFiles,
        evalScripts
      );

      if (exitCode !== 0) {
        await this.exit(exitCode);
        return;
      }
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
      /**
       * We are deliberately loading snippets only after handling command line
       * scripts and files:
       * - Snippets are mostly supposed to make human interaction easier, less
       *   programmatic usage
       * - Snippets can take a while to run because they're mongosh scripts
       * - Programmatic users should ideally make their dependencies explicit
       *   and include them via load() or require() instead of relying on
       *   snippets, which are part of the local mongosh installation's state
       * - Programmatic users who really want a dependency on a snippet can use
       *   snippet('load-all') to explicitly load snippets
       */
      markTime(TimingCategories.SnippetLoading, 'start load snippets');
      await snippetManager?.loadAllSnippets();
      markTime(TimingCategories.SnippetLoading, 'done load snippets');
    }

    markTime(TimingCategories.ResourceFileLoading, 'loading rc files');
    await this.loadRcFiles();
    markTime(TimingCategories.ResourceFileLoading, 'loaded rc files');

    this.verifyPlatformSupport();

    // We only enable/disable here, since the rc file/command line scripts
    // can disable the telemetry setting.
    this.setTelemetryEnabled(await this.getConfig('enableTelemetry'));
    this.bus.emit('mongosh:start-mongosh-repl', { version });
    markTime(TimingCategories.REPLInstantiation, 'starting repl');
    await this.mongoshRepl.startRepl(initialized);

    this.bus.emit('mongosh:start-session', {
      isInteractive: true,
      jsContext: this.mongoshRepl.jsContext(),
      timings: summariseTimingData(getTimingData()),
    });
  }

  private static getFileAndEvalInfo(cliOptions: CliOptions): {
    commandLineLoadFiles: string[];
    evalScripts: string[];
    willExecuteCommandLineScripts: boolean;
    willEnterInteractiveMode: boolean;
    quiet: boolean;
  } {
    const commandLineLoadFiles = cliOptions.fileNames ?? [];
    const evalScripts = cliOptions.eval ?? [];
    const willExecuteCommandLineScripts =
      commandLineLoadFiles.length > 0 || evalScripts.length > 0;
    const willEnterInteractiveMode =
      !willExecuteCommandLineScripts || !!cliOptions.shell;
    const quiet =
      cliOptions.quiet ?? !(cliOptions.verbose ?? willEnterInteractiveMode);
    return {
      commandLineLoadFiles,
      evalScripts,
      willEnterInteractiveMode,
      willExecuteCommandLineScripts,
      quiet,
    };
  }

  injectReplFunctions(): void {
    const functions = {
      async buildInfo() {
        return await buildInfo();
      },
    } as const;
    const { context } = this.mongoshRepl.runtimeState();
    for (const [name, impl] of Object.entries(functions)) {
      context[name] = (...args: Parameters<typeof impl>) => {
        return Object.assign(impl(...args), {
          [Symbol.for('@@mongosh.syntheticPromise')]: true,
        });
      };
    }
  }

  async setupAnalytics(): Promise<void> {
    if (
      process.env.IS_MONGOSH_EVERGREEN_CI &&
      !this.analyticsOptions?.alwaysEnable
    ) {
      throw new Error('no analytics setup for the mongosh CI environment');
    }
    // build-info.json is created as a part of the release process
    const apiKey =
      this.analyticsOptions?.apiKey ??
      (await buildInfo({ withSegmentApiKey: true })).segmentApiKey;
    if (!apiKey) {
      throw new Error('no analytics API key defined');
    }
    // 'http' is not supported in startup snapshots yet.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { Analytics } = require('@segment/analytics-node');
    this.segmentAnalytics = new Analytics({
      writeKey: apiKey,
      maxRetries: 0,
      httpRequestTimeout: 1000,
      ...this.analyticsOptions,
    });
    this.toggleableAnalytics = new ToggleableAnalytics(
      new SampledAnalytics({
        target: new ThrottledAnalytics({
          target: this.segmentAnalytics,
          throttle: {
            rate: 30,
            metadataPath: this.shellHomeDirectory.paths.shellLocalDataPath,
          },
        }),
        sampling: () =>
          !!process.env.MONGOSH_ANALYTICS_SAMPLE || Math.random() <= 0.01,
      })
    );
  }

  async setLoggingEnabled(enabled: boolean): Promise<void> {
    if (enabled) {
      await this.startLogging();
    } else {
      this.loggingAndTelemetry?.detachLogger();
    }
  }

  setTelemetryEnabled(enabled: boolean): void {
    if (this.globalConfig === null) {
      // This happens when the per-user config file is loaded before we have
      // started loading the global config file. Keep telemetry paused in that
      // case.
      return;
    }

    if (enabled && this.hasOnDiskTelemetryId && !this.forceDisableTelemetry) {
      this.toggleableAnalytics.enable();
    } else {
      this.toggleableAnalytics.disable();
    }
  }

  async loadCommandLineFilesAndEval(
    files: string[],
    evalScripts: string[]
  ): Promise<number> {
    let lastEvalResult: unknown;
    let exitCode = 0;
    try {
      markTime(TimingCategories.Eval, 'start eval scripts');
      for (const script of evalScripts) {
        this.bus.emit('mongosh:eval-cli-script');
        lastEvalResult = await this.mongoshRepl.loadExternalCode(
          script,
          '@(shell eval)'
        );
      }
      markTime(TimingCategories.Eval, 'finished eval scripts');
    } catch (err) {
      // We have two distinct flows of control in the exception case;
      // if we are running in --json mode, we treat the error as a
      // special kind of output, otherwise we just pass the exception along.
      // We should *probably* change this so that CliRepl.start() doesn't result
      // in any user-caused exceptions, including script execution or failure to
      // connect, and instead always take the --json flow, but that feels like
      // it might be too big of a breaking change right now.
      exitCode = 1;
      if (this.cliOptions.json) {
        lastEvalResult = err;
      } else {
        throw err;
      }
    }
    if (lastEvalResult !== undefined) {
      let formattedResult;
      if (this.cliOptions.json) {
        try {
          formattedResult = formatForJSONOutput(
            lastEvalResult,
            this.cliOptions.json
          );
        } catch (e) {
          // If formatting the result as JSON fails, instead treat the error
          // itself as the output, as if the script had been e.g.
          // `try { ... } catch(e) { throw EJSON.serialize(e); }`
          // Do not try to format as EJSON repeatedly, if it fails then
          // there's little we can do about it.
          exitCode = 1;
          formattedResult = formatForJSONOutput(e, this.cliOptions.json);
        }
      } else {
        formattedResult = this.mongoshRepl.writer(lastEvalResult);
      }
      this.output.write(formattedResult + '\n');
    }

    markTime(TimingCategories.Eval, 'wrote eval output');
    markTime(TimingCategories.EvalFile, 'start loading external files');
    const { quiet } = CliRepl.getFileAndEvalInfo(this.cliOptions);
    for (const file of files) {
      if (!quiet) {
        this.output.write(
          `Loading file: ${this.clr(file, 'mongosh:filename')}\n`
        );
      }
      await this.mongoshRepl.loadExternalFile(file);
    }
    markTime(TimingCategories.EvalFile, 'finished external files');
    return exitCode;
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
    const mongoshrcMisspelledPath =
      this.shellHomeDirectory.rcPath('.mongoshrc');

    let hasMongoshRc = false;
    try {
      await fs.stat(mongoshrcPath);
      hasMongoshRc = true;
    } catch {
      /* file not present */
    }
    if (hasMongoshRc) {
      try {
        this.bus.emit('mongosh:mongoshrc-load');
        await this.mongoshRepl.loadExternalFile(mongoshrcPath);
      } catch (err: any) {
        this.output.write(
          this.clr('Error while running ~/.mongoshrc.js:\n', 'mongosh:warning')
        );
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
    } catch {
      /* file not present */
    }
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
    } catch {
      /* file not present */
    }
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
      } catch (err: any) {
        if (err?.code !== 'ENOENT') {
          this.bus.emit('mongosh:error', err, 'config');
        }
      }
    }
    this.bus.emit('mongosh:globalconfig-load', {
      filename,
      found: fileContents.length > 0,
    });
    try {
      let config: CliUserConfig;
      if (fileContents.trim().startsWith('{')) {
        config = bson.EJSON.parse(fileContents);
      } else {
        config = (yaml.load(fileContents) as any)?.mongosh ?? {};
      }
      for (const [key, value] of Object.entries(config) as [
        keyof CliUserConfig,
        any
      ][]) {
        const validationResult = await CliUserConfigValidator.validate(
          key,
          value
        );
        if (validationResult) {
          const msg = `Warning: Ignoring config option "${key}" from ${filename}: ${validationResult}\n`;
          this.output.write(this.clr(msg, 'mongosh:warning'));
          delete config[key];
        }
      }
      return config;
    } catch (err: any) {
      this.bus.emit('mongosh:error', err, 'config');
      const msg = `Warning: Could not parse global configuration file at ${filename}: ${err?.message}\n`;
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
    const msg = `Warning: Could not access file${path ? 'at ' + path : ''}: ${
      err.message
    }\n`;
    this.output.write(this.clr(msg, 'mongosh:warning'));
  }

  /**
   * Connect to the cluster.
   *
   * @param {string} driverUri - The driver URI.
   * @param {DevtoolsConnectOptions} driverOptions - The driver options.
   */
  async connect(
    driverUri: string,
    driverOptions: DevtoolsConnectOptions
  ): Promise<NodeDriverServiceProvider> {
    const { quiet } = CliRepl.getFileAndEvalInfo(this.cliOptions);
    if (!this.cliOptions.nodb && !quiet) {
      this.output.write(
        i18n.__(CONNECTING) +
          '\t\t' +
          this.clr(redactURICredentials(driverUri), 'mongosh:uri') +
          '\n'
      );
    }
    return await NodeDriverServiceProvider.connect(
      driverUri,
      driverOptions,
      this.cliOptions,
      this.bus
    );
  }

  /** Return the file path used for the REPL history. */
  getHistoryFilePath(): string {
    return this.shellHomeDirectory.roamingPath('mongosh_repl_history');
  }

  /**
   * Implements getConfig from the {@link ConfigProvider} interface.
   */
  // eslint-disable-next-line @typescript-eslint/require-await
  async getConfig<K extends keyof CliUserConfig>(
    key: K
  ): Promise<CliUserConfig[K]> {
    return (
      (this.config as CliUserConfig)[key] ??
      (this.globalConfig as CliUserConfig)?.[key] ??
      new CliUserConfig()[key]
    );
  }

  /**
   * Implements setConfig from the {@link ConfigProvider} interface.
   */
  async setConfig<K extends keyof CliUserConfig>(
    key: K,
    value: CliUserConfig[K]
  ): Promise<'success'> {
    if (key === 'forceDisableTelemetry') {
      throw new MongoshRuntimeError(
        "The 'forceDisableTelemetry' setting cannot be modified"
      );
    }
    this.config[key] = value;
    if (key === 'enableTelemetry') {
      if (this.forceDisableTelemetry) {
        throw new MongoshRuntimeError(
          "Cannot modify telemetry settings while 'forceDisableTelemetry' is set to true"
        );
      }
      this.setTelemetryEnabled(this.config.enableTelemetry);
      this.bus.emit('mongosh:update-user', {
        userId: this.config.userId,
        anonymousId: this.config.telemetryAnonymousId,
      });
    }
    if (key === 'disableLogging') {
      await this.setLoggingEnabled(!value);
    }
    try {
      await this.configDirectory.writeConfigFile(this.config);
    } catch (err: any) {
      this.warnAboutInaccessibleFile(err, this.configDirectory.path());
    }
    return 'success';
  }

  /**
   * Implements listConfigOptions from the {@link ConfigProvider} interface.
   */
  listConfigOptions(): string[] {
    const hiddenKeys = [
      'userId',
      'telemetryAnonymousId',
      'disableGreetingMessage',
      'forceDisableTelemetry',
    ];
    const keys = Object.keys(new CliUserConfig());
    return keys.filter((key) => !hiddenKeys.includes(key));
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
      const warning = new MongoshWarning(
        `Mismatched node version. Required version: ${engines.node}. Currently using: ${process.version}. Exiting...\n\n`,
        CliReplErrors.NodeVersionMismatch
      );
      await this._fatalError(warning);
    }
  }

  // Factored out for testing
  getGlibcVersion = getGlibcVersion;

  verifyPlatformSupport(): void {
    const { quiet } = CliRepl.getFileAndEvalInfo(this.cliOptions);
    if (quiet) {
      return;
    }

    const glibcVersion = this.getGlibcVersion();

    const warnings: string[] = [];
    const RECOMMENDED_GLIBC = '>=2.28.0';
    const RECOMMENDED_OPENSSL = '>=3.0.0';
    const RECOMMENDED_NODEJS = '>=20.0.0';
    const semverRangeCheck = (
      semverLikeVersion: string,
      range: string
    ): boolean => {
      const semverVersion = semver.valid(semver.coerce(semverLikeVersion));
      // We don't push warnings for versions where we can't reliably get a
      // semver like version string
      if (!semverVersion) {
        return true;
      }

      return semver.satisfies(semverVersion, range);
    };
    const satisfiesGLIBCRequirement = (glibcVersion: string) =>
      semverRangeCheck(glibcVersion, RECOMMENDED_GLIBC);
    if (
      glibcVersion !== undefined &&
      !satisfiesGLIBCRequirement(glibcVersion)
    ) {
      warnings.push(
        '  - Using mongosh on the current operating system is deprecated, and support may be removed in a future release.'
      );
    }

    const satisfiesOpenSSLRequirement = (opensslVersion: string) =>
      semverRangeCheck(opensslVersion, RECOMMENDED_OPENSSL);
    if (!satisfiesOpenSSLRequirement(process.versions.openssl)) {
      warnings.push(
        '  - Using mongosh with OpenSSL versions lower than 3.0.0 is deprecated, and support may be removed in a future release.'
      );
    }

    if (!semver.satisfies(process.version, RECOMMENDED_NODEJS)) {
      warnings.push(
        '  - Using mongosh with Node.js versions lower than 20.0.0 is deprecated, and support may be removed in a future release.'
      );
    }

    if (warnings.length) {
      const deprecationWarning = [
        'Deprecation warnings:',
        ...warnings,
        'See https://www.mongodb.com/docs/mongodb-shell/install/#supported-operating-systems for documentation on supported platforms.',
      ].join('\n');

      this.output.write(
        this.clr(`\n${deprecationWarning}\n`, 'mongosh:warning')
      );
    }
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
      // Only password-based mechanisms require a password, including the default SCRAM-SHA-* ones
      ['', 'MONGODB-CR', 'PLAIN', 'SCRAM-SHA-1', 'SCRAM-SHA-256'].includes(
        cs.searchParams.get('authMechanism') ?? ''
      )
    );
  }

  async isTlsKeyFilePasswordMissingURI(
    searchParams: ReturnType<
      typeof ConnectionString.prototype.typedSearchParams<DevtoolsConnectOptions>
    >
  ): Promise<boolean> {
    const tlsCertificateKeyFile = searchParams.get('tlsCertificateKeyFile');
    const tlsCertificateKeyFilePassword = searchParams.get(
      'tlsCertificateKeyFilePassword'
    );

    if (tlsCertificateKeyFile && !tlsCertificateKeyFilePassword) {
      const { contents } = await this.readFileUTF8(tlsCertificateKeyFile);

      // Matches standard encrypted key formats for PKCS#12/PKCS#8 and PKCS#1
      return (
        contents.search(/(ENCRYPTED PRIVATE KEY|Proc-Type: 4,ENCRYPTED)/) !== -1
      );
    }

    return false;
  }

  /**
   * Sets the auth.password field to undefined in the driverOptions if the auth
   * object is present with a truthy username. This is required by the driver, e.g.
   * in the case of password-less Kerberos authentication.
   */
  ensurePasswordFieldIsPresentInAuth(
    driverOptions: DevtoolsConnectOptions
  ): void {
    if (
      driverOptions.auth &&
      driverOptions.auth.username &&
      !('password' in driverOptions.auth)
    ) {
      driverOptions.auth.password = undefined;
    }
  }

  /**
   * Require the user to enter a password.
   */
  async requirePassword(passwordPrompt = 'Enter password'): Promise<string> {
    const passwordPromise = askpassword({
      input: this.input,
      output: this.promptOutput,
      replacementCharacter: '*',
    });
    this.promptOutput.write(`${passwordPrompt}: `);
    try {
      try {
        return (await passwordPromise).toString();
      } finally {
        this.promptOutput.write('\n');
      }
    } catch (error: any) {
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
    return (this.closingPromise ??= (async () => {
      markTime(TimingCategories.REPLInstantiation, 'start closing');
      this.agent?.destroy();
      if (!this.output.destroyed) {
        // Wait for output to be fully flushed before exiting.
        if (this.output.writableEnded) {
          // .end() has been called but not finished; 'close' will be emitted in that case.
          // (This should not typically happen in the context of mongosh, but there's also
          // no reason not to handle this case properly.)
          try {
            await once(this.output, 'close');
          } catch {
            /* ignore */
          }
        } else {
          // .end() has not been called; write an empty chunk and wait for it to be fully written.
          await new Promise((resolve) => this.output.write('', resolve));
        }
      }
      markTime(TimingCategories.REPLInstantiation, 'output flushed');
      const analytics = this.toggleableAnalytics;
      let flushError: string | null = null;
      let flushDuration: number | null = null;
      if (analytics) {
        const flushStart = Date.now();
        try {
          await analytics.flush();
          markTime(TimingCategories.Telemetry, 'flushed analytics');
        } catch (err: any) {
          flushError = err.message;
        } finally {
          flushDuration = Date.now() - flushStart;
        }
      }
      this.logWriter?.info(
        'MONGOSH',
        mongoLogId(1_000_000_045),
        'analytics',
        'Flushed outstanding data',
        {
          flushError,
          flushDuration,
        }
      );
      await this.logWriter?.flush();
      markTime(TimingCategories.Logging, 'flushed log writer');
      this.bus.emit('mongosh:closed');
    })());
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
  async readFileUTF8(
    filename: string
  ): Promise<{ contents: string; absolutePath: string }> {
    const resolved = path.resolve(filename);
    return {
      contents: await fs.readFile(resolved, 'utf8'),
      absolutePath: resolved,
    };
  }

  /** Colorize a string using a specified set of styles. */
  clr(text: string, style: StyleDefinition): string {
    return this.mongoshRepl.clr(text, style);
  }

  /** Get the right crypt shared library loading options. */
  async getCryptLibraryOptions(): Promise<
    AutoEncryptionOptions['extraOptions']
  > {
    if (!this.getCryptLibraryPaths) {
      throw new MongoshInternalError(
        'This instance of mongosh is not configured for in-use encryption'
      );
    }
    return (this.cachedCryptLibraryPath ??= this.getCryptLibraryPaths(
      this.bus
    ));
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

  /** Adjust `driverOptionsIn` with OIDC-specific settings from this CLI instance. */
  async prepareOIDCOptions(
    driverUri: string,
    driverOptionsIn: Readonly<DevtoolsConnectOptions>
  ): Promise<DevtoolsConnectOptions> {
    const driverOptions = {
      oidc: {},
      authMechanismProperties: {},
      ...driverOptionsIn,
    };

    driverOptions.oidc.allowedFlows ??= ['auth-code'];
    driverOptions.oidc.notifyDeviceFlow ??= ({ verificationUrl, userCode }) => {
      this.output.write(
        '\n' +
          `Visit the following URL to complete authentication: ${this.clr(
            verificationUrl,
            'mongosh:uri'
          )}\n` +
          `Enter the following code on that page: ${this.clr(
            userCode,
            'mongosh:uri'
          )}\nWaiting...\n`
      );
    };
    driverOptions.proxy ??= this.proxyOptions;
    driverOptions.applyProxyToOIDC ??= true;

    const [redirectURI, trustedEndpoints, browser] = await Promise.all([
      this.getConfig('oidcRedirectURI'),
      this.getConfig('oidcTrustedEndpoints'),
      this.getConfig('browser'),
    ]);
    if (redirectURI !== undefined) {
      driverOptions.oidc.redirectURI ??= redirectURI;
    }
    if (browser !== undefined) {
      driverOptions.oidc.openBrowser ??=
        browser !== false ? { command: browser } : browser;
    }
    if (trustedEndpoints !== undefined) {
      driverOptions.authMechanismProperties.ALLOWED_HOSTS ??= trustedEndpoints;
    }
    if (process.env.MONGOSH_OIDC_PARENT_HANDLE) {
      driverOptions.parentHandle ??= process.env.MONGOSH_OIDC_PARENT_HANDLE;
    }
    return driverOptions;
  }

  async fetchMongoshUpdateUrl() {
    const { quiet } = CliRepl.getFileAndEvalInfo(this.cliOptions);
    if (
      quiet ||
      (!this.fetchMongoshUpdateUrlRegardlessOfCiEnvironment &&
        (process.env.CI ||
          process.env.IS_CI ||
          this.isContainerizedEnvironment))
    ) {
      // No point in telling users about new versions if we are in
      // a CI or Docker-like environment. or the user has explicitly
      // requested no additional output.
      return;
    }

    try {
      const updateURL = (await this.getConfig('updateURL')).trim();
      if (!updateURL) return;

      const localFilePath = this.shellHomeDirectory.localPath(
        'update-metadata.json'
      );

      this.bus.emit('mongosh:fetching-update-metadata', {
        updateURL,
        localFilePath,
      });
      await this.updateNotificationManager.fetchUpdateMetadata(
        updateURL,
        localFilePath
      );
      this.bus.emit('mongosh:fetching-update-metadata-complete', {
        latest:
          await this.updateNotificationManager.getLatestVersionIfMoreRecent(''),
      });
    } catch (err: any) {
      this.bus.emit('mongosh:error', err, 'startup');
    }
  }

  async getMoreRecentMongoshVersion(): Promise<string | null> {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { version }: { version: string } = require('../package.json');
    return await this.updateNotificationManager.getLatestVersionIfMoreRecent(
      process.env
        .MONGOSH_ASSUME_DIFFERENT_VERSION_FOR_UPDATE_NOTIFICATION_TEST ||
        version
    );
  }

  private setupOIDCTokenDumpListener() {
    function tryParseJWT(
      token: string | null | undefined,
      redact: 'redact' | 'include-secrets'
    ): unknown {
      if (!token) return token;
      const jwtParts = token.split('.');
      if (
        // If this is a three-part token consisting of valid base64url-encoded
        // parts (without trailing `=`), assume that it is a JWT access/id token.
        jwtParts.length === 3 &&
        jwtParts.every(
          (part) =>
            Buffer.from(part, 'base64url')
              .toString('base64url')
              .replace(/=+$/, '') === part.replace(/=+$/, '')
        )
      ) {
        const [header, payload] = jwtParts.map((part) => {
          try {
            return JSON.parse(Buffer.from(part, 'base64url').toString('utf8'));
          } catch {
            // Not a valid JWT in this case.
          }
        });
        if (redact === 'include-secrets') {
          return { header, payload, signature: jwtParts[2] };
        }
        if (header && payload) {
          return { header, payload };
        }
      }
      return redact === 'include-secrets' ? token : '<non-JWT token>';
    }

    let lastServerIdPInfo: IdPInfo | undefined;
    const { oidcDumpTokens } = this.cliOptions;
    if (oidcDumpTokens) {
      this.bus.on(
        'mongodb-oidc-plugin:received-server-params',
        ({ params: { idpInfo } }) => {
          lastServerIdPInfo = idpInfo;
        }
      );
      this.bus.on(
        'mongodb-oidc-plugin:auth-succeeded',
        ({
          tokenType,
          refreshToken, // only an identifier, not the actual token
          expiresAt,
          passIdTokenAsAccessToken,
          tokens: { accessToken: at, refreshToken: rt, idToken: idt },
        }) => {
          const printable = {
            lastServerIdPInfo: lastServerIdPInfo && {
              issuer: lastServerIdPInfo?.issuer,
              clientId: lastServerIdPInfo?.clientId,
              requestScopes: lastServerIdPInfo?.requestScopes,
            },
            tokenType,
            refreshToken,
            expiresAt,
            passIdTokenAsAccessToken,
            tokens:
              oidcDumpTokens === 'include-secrets'
                ? {
                    accessToken: tryParseJWT(at, 'include-secrets'),
                    refreshToken: tryParseJWT(rt, 'include-secrets'),
                    idToken: tryParseJWT(idt, 'include-secrets'),
                  }
                : {
                    accessToken: tryParseJWT(at, 'redact'),
                    idToken: tryParseJWT(idt, 'redact'),
                  },
          };

          this.output.write(
            '\n' +
              this.clr(
                '----- BEGIN OIDC TOKEN DUMP -----',
                'mongosh:section-header'
              ) +
              '\n' +
              JSON.stringify(printable, null, 2) +
              '\n' +
              this.clr(
                '----- END OIDC TOKEN DUMP -----',
                'mongosh:section-header'
              ) +
              '\n'
          );
        }
      );
    }
  }
}
