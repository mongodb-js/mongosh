/* eslint no-console: 0, no-sync: 0*/

import { CliServiceProvider, NodeOptions, CliOptions } from '@mongosh/service-provider-server';
import { getShellApiType, ShellInternalState } from '@mongosh/shell-api';
import { ShellEvaluator, ShellResult } from '@mongosh/shell-evaluator';
import formatOutput, { formatError } from './format-output';
import { LineByLineInput } from './line-by-line-input';
import { TELEMETRY, MONGOSH_WIKI } from './constants';
import isRecoverableError from 'is-recoverable-error';
import { MongoshInternalError, MongoshWarning } from '@mongosh/errors';
import { changeHistory, retractPassword } from '@mongosh/history';
import { REPLServer, Recoverable } from 'repl';
import completer from '@mongosh/autocomplete';
import i18n from '@mongosh/i18n';
import { bson } from '@mongosh/service-provider-core';
import repl from 'pretty-repl';
import Nanobus from 'nanobus';
import setupLoggerAndTelemetry from './setup-logger-and-telemetry';
import mkdirp from 'mkdirp';
import clr, { StyleDefinition } from './clr';
import path from 'path';
import util from 'util';
import read from 'read';
import os from 'os';
import fs from 'fs';
import semver from 'semver';
import type { Readable } from 'stream';

/**
 * Connecting text key.
 */
const CONNECTING = 'cli-repl.cli-repl.connecting';

type ConfigFileContents = {
  userId: string;
  enableTelemetry: boolean;
  disableGreetingMessage: boolean;
};

/**
 * The REPL used from the terminal.
 */
class CliRepl {
  private shellEvaluator: ShellEvaluator;
  private repl: REPLServer;
  private bus: Nanobus;
  private internalState: ShellInternalState;
  private enableTelemetry: boolean;
  private disableGreetingMessage: boolean;
  private userId: string;
  private options: CliOptions;
  private mongoshDir: string;
  private lineByLineInput: LineByLineInput;

  /**
   * Instantiate the new CLI Repl.
   */
  constructor(driverUri: string, driverOptions: NodeOptions, options: CliOptions) {
    // <MakeTypeScriptHappy>. This might be yet another good reason to restructure
    // some bits and pieces of this class. :)
    this.shellEvaluator = null as unknown as ShellEvaluator;
    this.repl = null as unknown as REPLServer;
    this.internalState = null as unknown as ShellInternalState;
    this.enableTelemetry = false;
    this.disableGreetingMessage = false;
    this.userId = '';
    // </MakeTypeScriptHappy>

    this.bus = new Nanobus('mongosh');

    this.verifyNodeVersion();
    this.options = options;

    this.mongoshDir = path.join(os.homedir(), '.mongodb/mongosh/');
    this.createMongoshDir();

    setupLoggerAndTelemetry(this.bus, this.mongoshDir);

    this.generateOrReadTelemetryConfig();

    this.lineByLineInput = new LineByLineInput(process.stdin);

    if (this.isPasswordMissing(driverOptions)) {
      this.requirePassword(driverUri, driverOptions);
    } else {
      this.setupRepl(driverUri, driverOptions).catch((error) => {
        return this._fatalError(error);
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
    const initialServiceProvider = await this.connect(driverUri, driverOptions);
    this.internalState = new ShellInternalState(initialServiceProvider, this.bus, this.options);
    this.shellEvaluator = new ShellEvaluator(this.internalState, this);
    this.shellEvaluator.setEvaluationListener(this);
    await this.internalState.fetchConnectionInfo();
    this.start();
  }

  /**
   * Connect to the cluster.
   *
   * @param {string} driverUri - The driver URI.
   * @param {NodeOptions} driverOptions - The driver options.
   */
  async connect(driverUri: string, driverOptions: NodeOptions): Promise<any> {
    if (!this.options.nodb) {
      console.log(i18n.__(CONNECTING), '    ', this.clr(retractPassword(driverUri), ['bold', 'green']));
    }
    return await CliServiceProvider.connect(driverUri, driverOptions, this.options);
  }

  /**
   * Start the REPL.
   */
  start(): void {
    this.greet();

    const version = this.internalState.connectionInfo.buildInfo.version;

    this.repl = repl.start({
      input: this.lineByLineInput as unknown as Readable,
      output: process.stdout,
      prompt: '> ',
      writer: this.writer,
      completer: completer.bind(null, version),
      breakEvalOnSigint: true,
      preview: false,
      terminal: process.env.MONGOSH_FORCE_TERMINAL ? true : undefined
    });

    const originalDisplayPrompt = this.repl.displayPrompt.bind(this.repl);

    this.repl.displayPrompt = (...args: any[]): any => {
      originalDisplayPrompt(...args);
      this.lineByLineInput.nextLine();
    };

    if (this.repl.commands.editor) {
      const originalEditorAction = this.repl.commands.editor.action.bind(this.repl);

      this.repl.commands.editor.action = (...args: Parameters<typeof originalEditorAction>): any => {
        this.lineByLineInput.disableBlockOnNewline();
        return originalEditorAction(...args);
      };
    }

    this.repl.defineCommand('clear', {
      help: '',
      action: () => {
        this.repl.displayPrompt();
      }
    });

    const replEval = this.repl.eval.bind(this.repl);
    const originalEval = util.promisify(this.wrapNoSyncDomainError(replEval));

    const customEval = async(
      input: string,
      context: any,
      filename: string,
      callback: (err?: Error | null, result?: any) => void): Promise<any> => {
      this.lineByLineInput.enableBlockOnNewLine();

      let result;

      try {
        let sigintListener: (() => void) | undefined = undefined;
        let previousSigintListeners: any[] = [];
        try {
          result = await new Promise((resolve, reject) => {
            // Handle SIGINT (Ctrl+C) that occurs while we are stuck in `await`
            // by racing a listener for 'SIGINT' against the evalResult Promise.
            // We remove all 'SIGINT' listeners and install our own.
            sigintListener = (): void => {
              // Reject with an exception similar to one thrown by Node.js
              // itself if the `customEval` itself is interrupted.
              reject(new Error('Asynchronous execution was interrupted by `SIGINT`'));
            };
            previousSigintListeners = this.repl.rawListeners('SIGINT');

            this.repl.removeAllListeners('SIGINT');
            this.repl.once('SIGINT', sigintListener);

            const evalResult = this.shellEvaluator.customEval(originalEval, input, context, filename);

            process.once('SIGINT', sigintListener);
            evalResult.then(resolve, reject);
          });
        } finally {
          // Remove our 'SIGINT' listener and re-install the REPL one(s).
          if (sigintListener !== undefined) {
            this.repl.removeListener('SIGINT', sigintListener);
            process.removeListener('SIGINT', sigintListener);
          }
          for (const listener of previousSigintListeners) {
            this.repl.on('SIGINT', listener);
          }
        }
      } catch (err) {
        try {
          if (isRecoverableError(input)) {
            return callback(new Recoverable(err));
          }
          return callback(err);
        } catch (callbackErr) {
          const wrapError = new MongoshInternalError(callbackErr.message);
          wrapError.stack = callbackErr.stack;
          return callback(wrapError);
        }
      }
      try {
        return callback(null, result);
      } catch (callbackErr) {
        const wrapError = new MongoshInternalError(callbackErr.message);
        wrapError.stack = callbackErr.stack;
        return callback(wrapError);
      }
    };

    (this.repl as any).eval = customEval;

    const historyFile = path.join(this.mongoshDir, '.mongosh_repl_history');
    const redactInfo = this.options.redactInfo;
    // eslint thinks we are redefining this.repl here, we are not.
    // eslint-disable-next-line no-shadow
    this.repl.setupHistory(historyFile, (err, repl) => {
      const warn = new MongoshWarning('Unable to set up history file. History will not be persisting in this session');
      if (err) repl.writer(warn);

      // repl.history is an array of previous commands. We need to hijack the
      // value we just typed, and shift it off the history array if the info is
      // sensitive.
      repl.on('flushHistory', function() {
        changeHistory((repl as any).history, redactInfo);
      });
    });

    this.repl.on('exit', async() => {
      await this.internalState.close(true);
      process.exit();
    });

    this.internalState.setCtx(this.repl.context);
    Object.defineProperty(this.repl.context, 'db', {
      set: (newDb) => {
        if (getShellApiType(newDb) !== 'Database') {
          const warn = new MongoshWarning('Cannot reassign \'db\' to non-Database type');
          console.log(warn);
          return;
        }
        this.internalState.setDbFunc(newDb);
      },
      get: () => (this.internalState.currentDb)
    });
  }

  /**
   * Creates a directory to store all mongosh logs, history and config
   */
  createMongoshDir(): void {
    try {
      mkdirp.sync(this.mongoshDir);
    } catch (e) {
      this._fatalError(e);
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
      this.userId = new bson.ObjectId().toString();
      this.enableTelemetry = true;
      this.disableGreetingMessage = false;
      this.bus.emit('mongosh:new-user', this.userId, this.enableTelemetry);
      this.writeConfigFileSync(configPath);
    } catch (err) {
      if (err.code === 'EEXIST') {
        // make sure we catch errors for json parse and always have err and
        // value on config result
        let config: ConfigFileContents;
        try {
          config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        } catch (err) {
          this.bus.emit('mongosh:error', 'Unable to parse user config', err);
          return;
        }

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
    const config: ConfigFileContents = {
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
    if (result && (
      (result.message !== undefined && typeof result.stack === 'string') ||
      (result.code !== undefined && result.errmsg !== undefined)
    )) {
      this.shellEvaluator.revertState();

      const output = {
        ...result,
        message: result.message || result.errmsg,
        name: result.name || 'MongoshInternalError',
        stack: result.stack
      };
      this.bus.emit('mongosh:error', output);
      return this.formatOutput({ type: 'Error', value: output });
    }

    return this.formatOutput({ type: result.type, value: result.printable });
  };

  verifyNodeVersion(): void {
    const { engines } = require('../package.json');
    // Strip -rc.0, -pre, etc. from the Node.js version because semver rejects those otherwise.
    const baseNodeVersion = process.version.replace(/-.*$/, '');
    if (!semver.satisfies(baseNodeVersion, engines.node)) {
      const warning = new MongoshWarning(`Mismatched node version. Required version: ${engines.node}. Currently using: ${process.version}. Exiting...\n\n`);
      this._fatalError(warning);
    }
  }

  /**
   * The greeting for the shell.
   */
  greet(): void {
    const { version } = require('../package.json');
    console.log(`Using MongoDB:      ${this.internalState.connectionInfo.buildInfo.version}`);
    console.log(`${this.clr('Using Mongosh Beta', ['bold', 'yellow'])}: ${version}`);
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
    return !!(driverOptions.auth &&
      driverOptions.auth.user &&
      !driverOptions.auth.password);
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
        return console.log(this.formatError(error));
      }

      (driverOptions.auth as any).password = password;
      this.setupRepl(driverUri, driverOptions).catch((e) => {
        this._fatalError(e);
      });
    });
  }

  wrapNoSyncDomainError<Args extends any[], Ret>(fn: (...args: Args) => Ret) {
    return (...args: Args): Ret => {
      const { Domain } = require('domain');
      const origEmit = Domain.prototype.emit;

      // When the Node.js core REPL encounters an exception during synchronous
      // evaluation, it does not pass the exception value to the callback
      // (or in this case, reject the Promise here), as one might inspect.
      // Instead, it skips straight ahead to abandoning evaluation and acts
      // as if the error had been thrown asynchronously. This works for them,
      // but for us that's not great, because we rely on the core eval function
      // calling its callback in order to be informed about a possible error
      // that occurred (... and in order for this async function to finish at all.)
      // We monkey-patch `process.domain.emit()` to avoid that, and instead
      // handle a possible error ourselves:
      // https://github.com/nodejs/node/blob/59ca56eddefc78bab87d7e8e074b3af843ab1bc3/lib/repl.js#L488-L493
      // It's not clear why this is done this way in Node.js, however,
      // removing the linked code does lead to failures in the Node.js test
      // suite, so somebody sufficiently motivated could probably find out.
      // For now, this is a hack and probably not considered officially
      // supported, but it works.
      // We *may* want to consider not relying on the built-in eval function
      // at all at some point.
      Domain.prototype.emit = function(ev: string, ...eventArgs: any[]): void {
        if (ev === 'error') {
          throw eventArgs[0];
        }
        return origEmit.call(this, ev, ...eventArgs);
      };

      try {
        return fn(...args);
      } finally {
        // Reset the `emit` function after synchronous evaluation, because
        // we need the Domain functionality for the asynchronous bits.
        Domain.prototype.emit = origEmit;
      }
    };
  }

  private _fatalError(error: any): void {
    if (this.bus) {
      this.bus.emit('mongosh:error', error);
    }

    console.error(this.formatError(error));
    return process.exit(1);
  }

  onPrint(values: ShellResult[]): void {
    const joined = values.map(this.writer).join(' ');
    this.repl.output.write(joined + '\n');
  }

  formatOutput(value: any): string {
    return formatOutput(value, this.getFormatOptions());
  }

  formatError(value: any): string {
    return formatError(value, this.getFormatOptions());
  }

  clr(text: string, style: StyleDefinition): string {
    return clr(text, style, this.getFormatOptions());
  }

  getFormatOptions(): { colors: boolean } {
    return {
      colors: this.repl ? this.repl.useColors :
        process.stdout.isTTY && process.stdout.getColorDepth() > 1
    };
  }
}

export default CliRepl;
