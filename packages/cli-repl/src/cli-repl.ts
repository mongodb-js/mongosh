import { CliServiceProvider } from 'mongosh-service-provider-server';
import { NodeOptions } from 'mongosh-transport-server';
import { execSync } from 'child_process';
import { compile } from 'mongosh-mapper';
import ShellApi from 'mongosh-shell-api';
import repl, { REPLServer } from 'repl';
import CliOptions from './cli-options';
import changeHistory from './history';
import Mapper from 'mongosh-mapper';
import completer from './completer';
import { Transform } from 'stream';
import i18n from 'mongosh-i18n';
import write from './writer';
import path from 'path';
import util from 'util';
import read from 'read';
import os from 'os';
import fs from 'fs';

/**
 * Connecting text key.
 */
const CONNECTING = 'cli-repl.cli-repl.connecting';

/**
 * The REPL used from the terminal.
 */
class CliRepl {
  private useAntlr?: boolean;
  private serviceProvider: CliServiceProvider;
  private mapper: Mapper;
  private shellApi: ShellApi;
  private mdbVersion: any;
  private repl: REPLServer;
  private options: CliOptions;

  /**
   * Connect to the cluster.
   *
   * @param {string} driverUrl - The driver URI.
   * @param {NodeOptions} driverOptions - The driver options.
   */
  connect(driverUri: string, driverOptions: NodeOptions): void {
    console.log(i18n.__(CONNECTING), driverUri);
    CliServiceProvider.connect(driverUri, driverOptions).then((serviceProvider) => {
      this.serviceProvider = serviceProvider;
      this.mapper = new Mapper(this.serviceProvider);
      this.shellApi = new ShellApi(this.mapper);
      // .toString() output since child_process execution returns a Buffer
      // grab version info from the first line from output
      this.mdbVersion = execSync('mongod --version')
        .toString()
        .split('\n')[0]
        .replace('db version ', '');
      this.start();
    });
  }

  /**
   * Instantiate the new CLI Repl.
   */
  constructor(driverUri: string, driverOptions: NodeOptions, options: CliOptions) {
    this.useAntlr = !!options.antlr;
    this.options = options;

    if (this.isPasswordMissing(driverOptions)) {
      this.requirePassword(driverUri, driverOptions);
    } else {
      this.connect(driverUri, driverOptions);
    }
  }

  /**
   * The custom evaluation function.
   *
   * @param {} originalEval - The original eval function.
   * @param {} input - The input.
   * @param {} context - The context.
   * @param {} filename - The filename.
   */
  async evaluator(originalEval: any, input: string, context: any, filename: string) {
    const argv = input.trim().split(' ');
    const cmd = argv[0];
    argv.shift();
    switch(cmd) {
      case 'use':
        return this.shellApi.use(argv[0]);
      case 'it':
        return this.shellApi.it();
      case 'help()':
        return this.shellApi.help;
      case 'var':
        this.mapper.cursorAssigned = true;
      default:
        const finalValue = await originalEval(input, context, filename);
        return await write(finalValue);
    }
  }

  /**
   * The greeting for the shell.
   */
  greet(): void {
    console.log(`Using MongoDB: ${this.mdbVersion}`);
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

    const version = this.mdbVersion;

    this.repl = repl.start({
      prompt: `$ mongosh > `,
      ignoreUndefined: true,
      writer: write,
      completer: completer.bind(null, version),
    });

    const originalEval = util.promisify(this.repl.eval);

    const customEval = async(input, context, filename, callback) => {
      try {
        let str;
        if (this.useAntlr) {
          // Eval once with execution turned off and a throwaway copy of the context
          this.mapper.checkAwait = true;
          this.mapper.awaitLoc = [];
          const copyCtx = context;// _.cloneDeep(context);
          await this.evaluator(originalEval, input, copyCtx, filename);

          // Pass the locations to a parser so that it can add 'await' if any function calls contain 'await' locations
          const syncStr = compile(input, this.mapper.awaitLoc);
          if (syncStr.trim() !== input.trim()) {
            console.log(`DEBUG: rewrote input "${input.trim()}" to "${syncStr.trim()}"`);
          }

          // Eval the rewritten string, this time for real
          this.mapper.checkAwait = false;
          str = await this.evaluator(originalEval, syncStr, context, filename);
        } else {
          str = await this.evaluator(originalEval, input, context, filename);
        }
        callback(null, str);
      } catch (err) {
        callback(err, null);
      } finally {
        this.mapper.cursorAssigned = false;
      }
    };

    // @ts-ignore
    this.repl.eval = customEval;
    
    const historyFile = path.join(os.homedir(), '.mongosh_repl_history');
    const redactInfo = this.options.redactInfo;
    this.repl.setupHistory(historyFile, function(err, repl) {
      // TODO: @lrlna format this error
      if (err) console.log(err);

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

    Object.keys(this.shellApi)
      .filter(k => (!k.startsWith('_')))
      .forEach(k => (this.repl.context[k] = this.shellApi[k]));
    this.mapper.setCtx(this.repl.context);
  }
}

export default CliRepl;
