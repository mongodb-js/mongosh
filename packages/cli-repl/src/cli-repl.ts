import { CliServiceProvider, NodeOptions } from '@mongosh/service-provider-server';
import ShellEvaluator from '@mongosh/shell-evaluator';
import isRecoverableError from 'is-recoverable-error';
import { MongoshWarning } from '@mongosh/errors';
import { changeHistory } from '@mongosh/history';
import getConnectInfo from './connect-info';
import formatOutput from './format-output';
import { TELEMETRY } from './constants';
import CliOptions from './cli-options';
import completer from './completer';
import { REPLServer, Recoverable } from 'repl';
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

  /**
   * Connect to the cluster.
   *
   * @param {string} driverUrl - The driver URI.
   * @param {NodeOptions} driverOptions - The driver options.
   */
  async connect(driverUri: string, driverOptions: NodeOptions): Promise<void> {
    console.log(i18n.__(CONNECTING), clr(redactPwd(driverUri), 'bold'));
    this.bus.emit('mongosh:connect', driverUri);

    this.serviceProvider = await CliServiceProvider.connect(driverUri, driverOptions);
    this.ShellEvaluator = new ShellEvaluator(this.serviceProvider, this.bus, this);
    this.buildInfo = await this.serviceProvider.buildInfo();
    const cmdLineOpts = await this.getCmdLineOpts();
    const topology = this.serviceProvider.getTopology();

    const connectInfo = getConnectInfo(
      driverUri,
      this.buildInfo,
      cmdLineOpts,
      topology
    );

    this.bus.emit('connect', connectInfo);
    this.start();
  }

  /**
   * Instantiate the new CLI Repl.
   */
  constructor(driverUri: string, driverOptions: NodeOptions, options: CliOptions) {
    this.options = options;
    this.mongoshDir = path.join(os.homedir(), '.mongodb/mongosh/');

    this.createMongoshDir();
    this.generateOrReadTelemetryConfig();

    this.bus = new Nanobus('mongosh');
    logger(this.bus, this.mongoshDir);

    if (this.isPasswordMissing(driverOptions)) {
      this.requirePassword(driverUri, driverOptions);
    } else {
      this.connect(driverUri, driverOptions);
    }
  }

  async getCmdLineOpts(): Promise<any> {
    try {
      const cmdLineOpts = await this.serviceProvider.getCmdLineOpts();
      return cmdLineOpts;
    } catch (e) {
      // error is thrown here for atlas and DataLake connections.
      // don't actually throw, as this is only used to log out non-genuine
      // mongodb connections
      this.bus.emit('mongodb:error', e)
      return null;
    }
  }

  /**
  * Creates a directory to store all mongosh logs, history and config
  */
  createMongoshDir(): void {
    try {
      mkdirp.sync(this.mongoshDir);
    } catch(e) {
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
      this.enableTelemetry = true ;
      this.disableGreetingMessage = false;
      this.writeConfigFileSync(configPath);
    } catch (err) {
      if (err.code === 'EEXIST') {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        this.userId = config.userId;
        this.disableGreetingMessage = true;
        this.enableTelemetry = config.enableTelemetry;
        return;
      }
      this.bus.emit('mongosh:error', err)
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

    const configPath = path.join(this.mongoshDir, 'config');
    this.writeConfigFileSync(configPath);

    if (enabled) {
      return i18n.__('cli-repl.cli-repl.enabledTelemetry');
    } else {
      return i18n.__('cli-repl.cli-repl.disabledTelemetry');
    }
  }

  /** write file sync given path and contents
  *
  * @param {string} path - path to file
  */
  writeConfigFileSync(path: string): void {
    const config = {
      userId: this.userId,
      enableTelemetry: this.enableTelemetry,
      disableGreetingMessage: this.disableGreetingMessage
    };

    try {
      fs.writeFileSync(path, JSON.stringify(config));
    } catch(err) {
      this.bus.emit('mongosh:error', err)
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
    // console.log('result', result)
    if (result && result.message && typeof result.stack === 'string') {
      this.bus.emit('mongosh:error', result);
      this.ShellEvaluator.revertState();

      return formatOutput({type: 'Error', value: result});
    }

    return formatOutput(result);
  }

  /**
   * The greeting for the shell.
   */
  greet(): void {
    console.log(`Using MongoDB: ${this.buildInfo.version} \n`);
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
      !driverOptions.auth.password
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
      driverOptions.auth.password = password;
      this.connect(driverUri, driverOptions);
    });
  }

  /**
   * Start the REPL.
   */
  start(): void {
    this.greet();

    const version = this.buildInfo.version;

    this.repl = repl.start({
      prompt: `$ mongosh > `,
      ignoreUndefined: true,
      writer: this.writer,
      completer: completer.bind(null, version),
    });

    const originalEval = util.promisify(this.repl.eval);

    const customEval = async(input, context, filename, callback) => {
      let result;
      let err = null;

      try {
        result = await this.ShellEvaluator.customEval(originalEval, input, context, filename);
      } catch (err) {
        if (isRecoverableError(input)) {
          return callback(new Recoverable(err));
        } else {
          result = err;
        }
      }
      callback (null, result)
    };

    // @ts-ignore
    this.repl.eval = customEval;

    const historyFile = path.join(this.mongoshDir,  '.mongosh_repl_history');
    const redactInfo = this.options.redactInfo;
    this.repl.setupHistory(historyFile, function(err, repl) {
      const warn = new MongoshWarning('Unable to set up history file. History will not be persisting in this session')
      if (err) this.writer(warn);

      // repl.history is an array of previous commands. We need to hijack the
      // value we just typed, and shift it off the history array if the info is
      // sensitive.
      repl.on('flushHistory', function() {
        // @ts-ignore
        changeHistory(repl.history, redactInfo);
      })
    })

    this.repl.on('exit', () => {
      this.serviceProvider.close(true);
      process.exit();
    });

    this.ShellEvaluator.setCtx(this.repl.context);
  }
}

export default CliRepl;
