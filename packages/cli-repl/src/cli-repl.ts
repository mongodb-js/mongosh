/* eslint no-console: 0, no-sync: 0*/

import { CliServiceProvider, NodeOptions } from '@mongosh/service-provider-server';
import formatOutput, { formatError } from './format-output';
import ShellEvaluator from '@mongosh/shell-evaluator';
import isRecoverableError from 'is-recoverable-error';
import { MongoshWarning } from '@mongosh/errors';
import { changeHistory } from '@mongosh/history';
import { REPLServer, Recoverable } from 'repl';
import getConnectInfo from './connect-info';
import { TELEMETRY, MONGOSH_WIKI } from './constants';
import CliOptions from './cli-options';
import completer from './completer';
import i18n from '@mongosh/i18n';
import { ObjectId } from 'bson';
import repl from 'pretty-repl';
import Nanobus from 'nanobus';
import logger from './logger';
import mkdirp from 'mkdirp';
import clr from './clr';
import path from 'path';
import util from 'util';
import read from 'read';
import os from 'os';
import fs from 'fs';
import { redactPwd } from '.';
import { LineByLineInput } from './line-by-line-input';

/**
 * Connecting text key.
 */
const CONNECTING = 'cli-repl.cli-repl.connecting';

/**
 * The REPL used from the terminal.
 */
class CliRepl {
  private serviceProvider: CliServiceProvider;
  private ShellEvaluator: ShellEvaluator;
  private buildInfo: any;
  private repl: REPLServer;
  private bus: Nanobus;
  private enableTelemetry: boolean;
  private disableGreetingMessage: boolean;
  private userId: ObjectId;
  private options: CliOptions;
  private mongoshDir: string;
  private lineByLineInput: LineByLineInput;

  /**
   * Instantiate the new CLI Repl.
   */
  constructor(driverUri: string, driverOptions: NodeOptions, options: CliOptions) {
    this.options = options;
    this.mongoshDir = path.join(os.homedir(), '.mongodb/mongosh/');
    this.lineByLineInput = new LineByLineInput(process.stdin);

    this.createMongoshDir();

    this.bus = new Nanobus('mongosh');
    logger(this.bus, this.mongoshDir);

    this.generateOrReadTelemetryConfig();

    if (this.isPasswordMissing(driverOptions)) {
      this.requirePassword(driverUri, driverOptions);
    } else {
      this.setupRepl(driverUri, driverOptions).catch((error) => {
        this.bus.emit('mongosh:error', error);
        console.log(formatError(error));
        return;
      });
    }
  }

  /**
   * setup CLI environment: serviceProvider, ShellEvaluator, log connection
   * information, and finally start the repl.
   *
   * @param {string} driverUri - The driver URI.
   * @param {NodeOptions} driverOptions - The driver options.
   */
  async setupRepl(driverUri: string, driverOptions: NodeOptions): Promise<void> {
    this.serviceProvider = await this.connect(driverUri, driverOptions);
    this.ShellEvaluator = new ShellEvaluator(this.serviceProvider, this.bus, this);
    this.buildInfo = await this.serviceProvider.buildInfo();
    this.logBuildInfo(driverUri);
    this.start();
  }

  /**
   * Connect to the cluster.
   *
   * @param {string} driverUri - The driver URI.
   * @param {NodeOptions} driverOptions - The driver options.
   */
  async connect(driverUri: string, driverOptions: NodeOptions): Promise<any> {
    console.log(i18n.__(CONNECTING), clr(redactPwd(driverUri), ['bold', 'green']));
    return await CliServiceProvider.connect(driverUri, driverOptions);
  }

  /**
   * Start the REPL.
   */
  start(): void {
    this.greet();

    const version = this.buildInfo.version;

    this.repl = repl.start({
      input: this.lineByLineInput,
      output: process.stdout,
      prompt: '> ',
      writer: this.writer,
      completer: completer.bind(null, version),
    });

    const originalDisplayPrompt = this.repl.displayPrompt.bind(this.repl);

    this.repl.displayPrompt = (...args: any[]): any => {
      originalDisplayPrompt(...args);
      this.lineByLineInput.nextLine();
    };

    const originalEditorAction = this.repl.commands.editor.action.bind(this.repl);

    this.repl.commands.editor.action = (): any => {
      this.lineByLineInput.disableBlockOnNewline();
      return originalEditorAction();
    };

    this.repl.defineCommand('clear', {
      help: '',
      action: () => {
        this.repl.displayPrompt();
      }
    });

    const originalEval = util.promisify(this.repl.eval);

    const customEval = async(input, context, filename, callback): Promise<any> => {
      this.lineByLineInput.enableBlockOnNewLine();

      let result;

      try {
        result = await this.ShellEvaluator.customEval(originalEval, input, context, filename);
      } catch (err) {
        if (isRecoverableError(input)) {
          return callback(new Recoverable(err));
        }
        result = err;
      }
      callback(null, result);
    };

    (this.repl as any).eval = customEval;

    const historyFile = path.join(this.mongoshDir, '.mongosh_repl_history');
    const redactInfo = this.options.redactInfo;
    // eslint thinks we are redefining this.repl here, we are not.
    // eslint-disable-next-line no-shadow
    this.repl.setupHistory(historyFile, function(err, repl) {
      const warn = new MongoshWarning('Unable to set up history file. History will not be persisting in this session');
      if (err) this.writer(warn);

      // repl.history is an array of previous commands. We need to hijack the
      // value we just typed, and shift it off the history array if the info is
      // sensitive.
      repl.on('flushHistory', function() {
        changeHistory((repl as any).history, redactInfo);
      });
    });

    this.repl.on('exit', () => {
      this.serviceProvider.close(true);
      process.exit();
    });

    this.ShellEvaluator.setCtx(this.repl.context);
  }

  /**
   * Log information about the current connection using buildInfo, topology,
   * current driverUri, and cmdLineOpts.
   *
   * @param {string} driverUri - The driver URI.
   */
  async logBuildInfo(driverUri: string): Promise<void> {
    const cmdLineOpts = await this.getCmdLineOpts();
    const topology = this.serviceProvider.getTopology();

    const connectInfo = getConnectInfo(
      driverUri,
      this.buildInfo,
      cmdLineOpts,
      topology
    );

    this.bus.emit('mongosh:connect', connectInfo);
  }

  /**
   * run getCmdLineOpts() command to get cmdLineOpts necessary for logging.
   */
  async getCmdLineOpts(): Promise<any> {
    try {
      const cmdLineOpts = await this.serviceProvider.getCmdLineOpts();
      return cmdLineOpts;
    } catch (e) {
      // error is thrown here for atlas and DataLake connections.
      // don't actually throw, as this is only used to log out non-genuine
      // mongodb connections
      this.bus.emit('mongosh:error', e);
      return null;
    }
  }

  /**
  * Creates a directory to store all mongosh logs, history and config
  */
  createMongoshDir(): void {
    try {
      mkdirp.sync(this.mongoshDir);
    } catch (e) {
      this.bus.emit('mongosh:error', e);
      throw e;
    }
  }

  /**
  * Checks if config file exists.
  *
  * If exists: sets userId and enabledTelemetry to this.
  * If does not exist: writes a new file with a newly generated ObjectID for
  * userid and enableTelemetry set to false.
  */
  generateOrReadTelemetryConfig(): void {
    const configPath = path.join(this.mongoshDir, 'config');

    let fd;

    try {
      fd = fs.openSync(configPath, 'wx');
      this.userId = new ObjectId(Date.now());
      this.enableTelemetry = true;
      this.disableGreetingMessage = false;
      this.bus.emit('mongosh:new-user', this.userId, this.enableTelemetry);
      this.writeConfigFileSync(configPath);
    } catch (err) {
      if (err.code === 'EEXIST') {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        this.userId = config.userId;
        this.disableGreetingMessage = true;
        this.enableTelemetry = config.enableTelemetry;
        this.bus.emit('mongosh:update-user', this.userId, this.enableTelemetry);
        return;
      }
      this.bus.emit('mongosh:error', err);
      throw err;
    } finally {
      if (fd !== undefined) fs.closeSync(fd);
    }
  }

  /**
  * sets CliRepl.enableTelemetry based on a bool, and writes the selection to
  * config file.
  *
  * @param {boolean} enabled - enabled or disabled status
  *
  * @returns {string} Status of telemetry logging: disabled/enabled
  */
  toggleTelemetry(enabled: boolean): string {
    this.enableTelemetry = enabled;
    this.disableGreetingMessage = true;

    this.bus.emit('mongosh:update-user', this.userId, this.enableTelemetry);
    const configPath = path.join(this.mongoshDir, 'config');
    this.writeConfigFileSync(configPath);

    if (enabled) {
      return i18n.__('cli-repl.cli-repl.enabledTelemetry');
    }

    return i18n.__('cli-repl.cli-repl.disabledTelemetry');
  }

  /** write file sync given path and contents
  *
  * @param {string} filePath - path to file
  */
  writeConfigFileSync(filePath: string): void {
    const config = {
      userId: this.userId,
      enableTelemetry: this.enableTelemetry,
      disableGreetingMessage: this.disableGreetingMessage
    };

    try {
      fs.writeFileSync(filePath, JSON.stringify(config));
    } catch (err) {
      this.bus.emit('mongosh:error', err);
      throw err;
    }
  }

  /**
   * Format the result to a string so it can be written to the output stream.
   */
  writer = (result: any): string => {
    // This checks for error instances.
    // The writer gets called immediately by the internal `this.repl.eval`
    // in case of errors.
    if (result && result.message && typeof result.stack === 'string') {
      this.bus.emit('mongosh:error', result);
      this.ShellEvaluator.revertState();

      return formatOutput({ type: 'Error', value: result });
    }

    return formatOutput(result);
  };

  /**
   * The greeting for the shell.
   */
  greet(): void {
    console.log(`Using MongoDB: ${this.buildInfo.version}`);
    console.log(`${MONGOSH_WIKI}`);
    if (!this.disableGreetingMessage) console.log(TELEMETRY);
  }

  /**
   * Is the password missing from the options?
   *
   * @param {NodeOptions} driverOptions - The driver options.
   *
   * @returns {boolean} If the password is missing.
   */
  isPasswordMissing(driverOptions: NodeOptions): boolean {
    return driverOptions.auth &&
      driverOptions.auth.user &&
      !driverOptions.auth.password;
  }

  /**
   * Require the user to enter a password.
   *
   * @param {string} driverUrl - The driver URI.
   * @param {NodeOptions} driverOptions - The driver options.
   */
  requirePassword(driverUri: string, driverOptions: NodeOptions): void {
    const readOptions = {
      prompt: 'Enter password: ',
      silent: true,
      replace: '*'
    };
    read(readOptions, (error, password) => {
      if (error) {
        this.bus.emit('mongosh:error', error);
        return console.log(formatError(error));
      }

      driverOptions.auth.password = password;
      this.setupRepl(driverUri, driverOptions).catch((e) => {
        this.bus.emit('mongosh:error', e);
        console.log(formatError(e));
        return;
      });
    });
  }
}

export default CliRepl;
