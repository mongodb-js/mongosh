import completer from '@mongosh/autocomplete';
import { MongoshCommandFailed, MongoshInternalError, MongoshWarning } from '@mongosh/errors';
import { changeHistory } from '@mongosh/history';
import type { AutoEncryptionOptions, ServiceProvider } from '@mongosh/service-provider-core';
import { EvaluationListener, OnLoadResult, ShellCliOptions, ShellInternalState } from '@mongosh/shell-api';
import { ShellEvaluator, ShellResult } from '@mongosh/shell-evaluator';
import { CliUserConfig, ConfigProvider, CliUserConfigValidator, MongoshBus } from '@mongosh/types';
import askpassword from 'askpassword';
import { Console } from 'console';
import { once } from 'events';
import prettyRepl from 'pretty-repl';
import { ReplOptions, REPLServer, start as replStart } from 'repl';
import { PassThrough, Readable, Writable } from 'stream';
import type { ReadStream, WriteStream } from 'tty';
import { callbackify, promisify } from 'util';
import * as asyncRepl from './async-repl';
import clr, { StyleDefinition } from './clr';
import { MONGOSH_WIKI, TELEMETRY_GREETING_MESSAGE } from './constants';
import formatOutput, { formatError } from './format-output';
import { makeMultilineJSIntoSingleLine } from './js-multiline-to-singleline';
import { LineByLineInput } from './line-by-line-input';
import { LogEntry, parseAnyLogEntry } from './log-entry';

export type MongoshCliOptions = ShellCliOptions & {
  quiet?: boolean;
};

export type MongoshIOProvider = Omit<ConfigProvider<CliUserConfig>, 'validateConfig'> & {
  getHistoryFilePath(): string;
  exit(code: number): Promise<never>;
  readFileUTF8(filename: string): Promise<{ contents: string, absolutePath: string }>;
  startMongocryptd(): Promise<AutoEncryptionOptions['extraOptions']>;
};

export type MongoshNodeReplOptions = {
  input: Readable;
  output: Writable;
  bus: MongoshBus;
  ioProvider: MongoshIOProvider;
  shellCliOptions?: Partial<MongoshCliOptions>;
  nodeReplOptions?: Partial<ReplOptions>;
};

// Used to make sure start() can only be called after initialize().
export type InitializationToken = { __initialized: 'yes' };

type MongoshRuntimeState = {
  shellEvaluator: ShellEvaluator;
  internalState: ShellInternalState;
  repl: REPLServer;
  console: Console;
};

// Utility, inverse of Readonly<T>
type Mutable<T> = {
  -readonly[P in keyof T]: T[P]
};

// https://github.com/nodejs/node/pull/38314
function fixupReplForNodeBug38314(repl: REPLServer): void {
  {
    // Check whether bug is present:
    const input = new PassThrough();
    const output = new PassThrough();
    const evalFn = (code: any, ctx: any, filename: any, cb: any) => cb(new Error('err'));
    const prompt = 'prompt#';
    replStart({ input, output, eval: evalFn as any, prompt });
    input.end('s\n');
    if (!String(output.read()).includes('prompt#prompt#')) {
      return; // All good, nothing to do here.
    }
  }

  // If it is, fix up the REPL's domain 'error' listener to not call displayPrompt()
  const domain = (repl as any)._domain;
  const domainErrorListeners = domain.listeners('error');
  const origListener = domainErrorListeners.find((fn: any) => fn.name === 'debugDomainError');
  if (!origListener) {
    throw new Error('Could not find REPL domain error listener');
  }
  domain.removeListener('error', origListener);
  domain.on('error', function(this: any, err: Error) {
    const origDisplayPrompt = repl.displayPrompt;
    repl.displayPrompt = () => {};
    try {
      origListener.call(this, err);
    } finally {
      repl.displayPrompt = origDisplayPrompt;
    }
  });
}

/**
 * An instance of a `mongosh` REPL, without any of the actual I/O.
 */
class MongoshNodeRepl implements EvaluationListener {
  _runtimeState: MongoshRuntimeState | null;
  input: Readable;
  lineByLineInput: LineByLineInput;
  output: Writable;
  bus: MongoshBus;
  nodeReplOptions: Partial<ReplOptions>;
  shellCliOptions: Partial<MongoshCliOptions>;
  ioProvider: MongoshIOProvider;
  onClearCommand?: EvaluationListener['onClearCommand'];
  insideAutoCompleteOrGetPrompt: boolean;
  inspectCompact: number | boolean = 0;
  inspectDepth = 0;
  started = false;
  showStackTraces = false;
  loadNestingLevel = 0;
  redactHistory: 'keep' | 'remove' | 'remove-redact' = 'remove';

  constructor(options: MongoshNodeReplOptions) {
    this.input = options.input;
    this.lineByLineInput = new LineByLineInput(this.input as ReadStream);
    this.output = options.output;
    this.bus = options.bus;
    this.nodeReplOptions = options.nodeReplOptions || {};
    this.shellCliOptions = options.shellCliOptions || {};
    this.ioProvider = options.ioProvider;
    this.insideAutoCompleteOrGetPrompt = false;
    this._runtimeState = null;
  }

  setIsInteractive(value: boolean): void {
    this.runtimeState().internalState.isInteractive = value;
  }

  async initialize(serviceProvider: ServiceProvider): Promise<InitializationToken> {
    const internalState = new ShellInternalState(serviceProvider, this.bus, this.shellCliOptions);
    const shellEvaluator = new ShellEvaluator(internalState);
    internalState.setEvaluationListener(this);
    await internalState.fetchConnectionInfo();

    let mongodVersion = internalState.connectionInfo.buildInfo?.version;
    const apiVersion = serviceProvider.getRawClient()?.serverApi?.version;
    if (apiVersion) {
      mongodVersion = (mongodVersion ? mongodVersion + ' ' : '') + `(API Version ${apiVersion})`;
    }
    await this.greet(mongodVersion);
    await this.printStartupLog(internalState);

    this.inspectCompact = await this.getConfig('inspectCompact');
    this.inspectDepth = await this.getConfig('inspectDepth');
    this.showStackTraces = await this.getConfig('showStackTraces');

    const repl = asyncRepl.start({
      start: prettyRepl.start,
      input: this.lineByLineInput as unknown as Readable,
      output: this.output,
      prompt: '',
      writer: this.writer.bind(this),
      breakEvalOnSigint: true,
      preview: false,
      asyncEval: this.eval.bind(this),
      historySize: await this.getConfig('historyLength'),
      wrapCallbackError:
        (err: Error) => Object.assign(new MongoshInternalError(err.message), { stack: err.stack }),
      onAsyncSigint: this.onAsyncSigint.bind(this),
      ...this.nodeReplOptions
    });
    fixupReplForNodeBug38314(repl);

    const console = new Console({
      stdout: this.output,
      stderr: this.output,
      colorMode: this.getFormatOptions().colors
    });
    this.onClearCommand = console.clear.bind(console);
    repl.context.console = console;

    // Copy our context's Date object into the inner one because we have a custom
    // util.inspect override for Date objects.
    repl.context.Date = Date;

    this._runtimeState = {
      shellEvaluator,
      internalState,
      repl,
      console
    };

    const origReplCompleter =
      promisify(repl.completer.bind(repl)); // repl.completer is callback-style
    const mongoshCompleter =
      completer.bind(null, internalState.getAutocompleteParameters());
    (repl as Mutable<typeof repl>).completer =
      callbackify(async(text: string): Promise<[string[], string]> => {
        this.insideAutoCompleteOrGetPrompt = true;
        try {
          // Merge the results from the repl completer and the mongosh completer.
          const [ [replResults, replOrig], [mongoshResults,, mongoshResultsExclusive] ] = await Promise.all([
            (async() => await origReplCompleter(text) || [[]])(),
            (async() => await mongoshCompleter(text))()
          ]);
          this.bus.emit('mongosh:autocompletion-complete'); // For testing.

          // Sometimes the mongosh completion knows that what it is doing is right,
          // and that autocompletion based on inspecting the actual objects that
          // are being accessed will not be helpful, e.g. in `use a<tab>`, we know
          // that we want *only* database names and not e.g. `assert`.
          if (mongoshResultsExclusive) {
            return [mongoshResults, text];
          }

          // The REPL completer may not complete the entire string; for example,
          // when completing ".ed" to ".editor", it reports as having completed
          // only the last piece ("ed"), or when completing "{ $g", it completes
          // only "$g" and not the entire result.
          // The mongosh completer always completes on the entire string.
          // In order to align them, we always extend the REPL results to include
          // the full string prefix.
          const replResultPrefix = replOrig ? text.substr(0, text.lastIndexOf(replOrig)) : '';
          const longReplResults = replResults.map((result: string) => replResultPrefix + result);

          // Remove duplicates, because shell API methods might otherwise show
          // up in both completions.
          const deduped = [...new Set([...longReplResults, ...mongoshResults])];

          return [deduped, text];
        } finally {
          this.insideAutoCompleteOrGetPrompt = false;
        }
      });

    // This is used below for multiline history manipulation.
    let originalHistory: string[] | null = null;

    const originalDisplayPrompt = repl.displayPrompt.bind(repl);

    repl.displayPrompt = (...args: any[]) => {
      if (!this.started) {
        return;
      }
      originalDisplayPrompt(...args);
      this.lineByLineInput.nextLine();
    };

    if (repl.commands.editor) {
      const originalEditorAction = repl.commands.editor.action.bind(repl);

      repl.commands.editor.action = (...args: Parameters<typeof originalEditorAction>): any => {
        originalHistory = [...(repl as any).history];
        this.lineByLineInput.disableBlockOnNewline();
        return originalEditorAction(...args);
      };
    }

    repl.defineCommand('clear', {
      help: '',
      action: () => {
        repl.displayPrompt();
      }
    });

    // Work around a weird Node.js REPL bug where .line is expected to be
    // defined but not necessarily present during the .setupHistory() call.
    // https://github.com/nodejs/node/issues/36773
    (repl as Mutable<typeof repl>).line = '';

    const historyFile = this.ioProvider.getHistoryFilePath();
    try {
      await promisify(repl.setupHistory).call(repl, historyFile);
      // repl.history is an array of previous commands. We need to hijack the
      // value we just typed, and shift it off the history array if the info is
      // sensitive.
      repl.on('flushHistory', () => {
        if (this.redactHistory !== 'keep') {
          const history: string[] = (repl as any).history;
          changeHistory(history, this.redactHistory === 'remove-redact');
        }
      });
      // We also want to group multiline history entries and .editor input into
      // a single entry per evaluation, so that arrow-up functionality
      // is more useful.
      (repl as any).on(asyncRepl.evalFinish, (ev: asyncRepl.EvalFinishEvent) => {
        if (this.insideAutoCompleteOrGetPrompt) {
          return; // These are not the evaluations we are looking for.
        }
        const history: string[] = (repl as any).history;
        if (ev.success === false && ev.recoverable) {
          if (originalHistory === null) {
            // If this is the first recoverable error we encounter, store the
            // current history in order to be later able to restore it.
            // We skip the first entry because it is part of the multiline
            // input.
            originalHistory = history.slice(1);
          }
        } else if (originalHistory !== null) {
          // We are seeing the first completion after a recoverable error that
          // did not result in a recoverable error, i.e. the multiline input
          // is complete.
          // Add the current input, with newlines replaced by spaces, to the
          // front of the history array. We restore the original history, i.e.
          // any intermediate lines added to the history while we were gathering
          // the multiline input are replaced at this point.
          const newHistoryEntry = makeMultilineJSIntoSingleLine(ev.input);
          if (newHistoryEntry.length > 0) {
            originalHistory.unshift(newHistoryEntry);
          }
          history.splice(
            0,
            history.length,
            ...originalHistory);
          originalHistory = null;
        }
      });
    } catch (err) {
      // repl.setupHistory() only reports failure when something went wrong
      // *after* the file was already opened for the first time. If the initial
      // open fails, it will print a warning to the REPL and report success to us.
      const warn = new MongoshWarning('Error processing history file: ' + err.message);
      this.output.write(this.writer(warn) + '\n');
    }

    (repl as any).on(asyncRepl.evalFinish, () => {
      this.bus.emit('mongosh:evaluate-finished');
    });

    repl.on('exit', async() => {
      try {
        await this.onExit();
      } catch { /* ... */ }
    });

    internalState.setCtx(repl.context);
    return { __initialized: 'yes' };
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async startRepl(_initializationToken: InitializationToken): Promise<void> {
    this.started = true;
    const { repl } = this.runtimeState();
    // Only start reading from the input *after* we set up everything, including
    // internalState.setCtx().
    this.lineByLineInput.start();
    repl.setPrompt(await this.getShellPrompt());
    repl.displayPrompt();
  }

  /**
   * The greeting for the shell.
   */
  async greet(mongodVersion: string): Promise<void> {
    if (this.shellCliOptions.quiet) {
      return;
    }
    const { version } = require('../package.json');
    let text = '';
    if (!this.shellCliOptions.nodb) {
      text += `Using MongoDB:\t\t${mongodVersion}\n`;
    }
    text += `${this.clr('Using Mongosh Beta', ['bold', 'yellow'])}:\t${version}\n`;
    text += `${MONGOSH_WIKI}\n`;
    if (!await this.getConfig('disableGreetingMessage')) {
      text += `${TELEMETRY_GREETING_MESSAGE}\n`;
      await this.setConfig('disableGreetingMessage', true);
    }
    this.output.write(text);
  }

  async printStartupLog(internalState: ShellInternalState): Promise<void> {
    if (this.shellCliOptions.nodb || this.shellCliOptions.quiet) {
      return;
    }

    type GetLogResult = { ok: number, totalLinesWritten: number, log: string[] | undefined };
    let result;
    try {
      result = await internalState.currentDb.adminCommand({ getLog: 'startupWarnings' }) as GetLogResult;
      if (!result) {
        throw new MongoshCommandFailed('adminCommand getLog unexpectedly returned no result');
      }
    } catch (error) {
      this.bus.emit('mongosh:error', error);
      return;
    }

    if (!result.log || !result.log.length) {
      return;
    }

    let text = '';
    text += `${this.clr('------', ['bold', 'yellow'])}\n`;
    text += `   ${this.clr('The server generated these startup warnings when booting:', ['bold', 'yellow'])}\n`;
    result.log.forEach(logLine => {
      try {
        const entry: LogEntry = parseAnyLogEntry(logLine);
        text += `   ${entry.timestamp}: ${entry.message}\n`;
      } catch (e) {
        text += `   Unexpected log line format: ${logLine}\n`;
      }
    });
    text += `${this.clr('------', ['bold', 'yellow'])}\n`;
    text += '\n';
    this.output.write(text);
  }

  async eval(originalEval: asyncRepl.OriginalEvalFunction, input: string, context: any, filename: string): Promise<any> {
    if (!this.insideAutoCompleteOrGetPrompt) {
      this.lineByLineInput.enableBlockOnNewLine();
    }

    const { repl, shellEvaluator } = this.runtimeState();

    try {
      const shellResult = await shellEvaluator.customEval(originalEval, input, context, filename);
      if (!this.insideAutoCompleteOrGetPrompt) {
        return shellResult;
      }
      // The Node.js auto completion needs to access the raw values in order
      // to be able to autocomplete their properties properly. One catch is
      // that we peform some filtering of mongosh methods depending on
      // topology, server version, etc., so for those, we do not autocomplete
      // at all and instead leave that to the @mongosh/autocomplete package.
      return shellResult.type !== null ? null : shellResult.rawValue;
    } catch (err) {
      if (this.runtimeState().internalState.interrupted.isSet()) {
        this.bus.emit('mongosh:eval-interrupted');
        // The shell is interrupted by CTRL-C - so we ignore any errors
        // that happened during evaluation.
        const result: ShellResult = {
          type: null,
          rawValue: undefined,
          printable: undefined
        };
        return result;
      }

      if (!isErrorLike(err)) {
        throw new Error(this.formatOutput({
          value: err
        }));
      }
      throw err;
    } finally {
      if (!this.insideAutoCompleteOrGetPrompt) {
        repl.setPrompt(await this.getShellPrompt());
      }

      if (this.loadNestingLevel <= 1) {
        this.bus.emit('mongosh:eval-complete'); // For testing purposes.
      }
    }
  }

  async onLoad(filename: string): Promise<OnLoadResult> {
    const {
      contents,
      absolutePath
    } = await this.ioProvider.readFileUTF8(filename);

    return {
      resolvedFilename: absolutePath,
      evaluate: async() => {
        this.loadNestingLevel += 1;
        try {
          await this.loadExternalCode(contents, absolutePath);
        } finally {
          this.loadNestingLevel -= 1;
        }
      }
    };
  }

  async loadExternalFile(filename: string): Promise<void> {
    await this.runtimeState().internalState.shellApi.load(filename);
  }

  async loadExternalCode(code: string, filename: string): Promise<ShellResult> {
    const { repl } = this.runtimeState();
    return await promisify(repl.eval.bind(repl))(code, repl.context, filename);
  }

  async onAsyncSigint(): Promise<boolean> {
    const { internalState } = this.runtimeState();
    if (internalState.interrupted.isSet()) {
      return true;
    }
    this.output.write('Stopping execution...');

    const mongodVersion: string | undefined = internalState.connectionInfo.buildInfo?.version;
    if (mongodVersion?.match(/^(4\.0\.|3\.)\d+/)) {
      this.output.write(this.clr(
        `\nWARNING: Operations running on the server cannot be killed automatically for MongoDB ${mongodVersion}.` +
        '\n         Please make sure to kill them manually. Killing operations is supported starting with MongoDB 4.1.',
        ['bold', 'yellow']
      ));
    }

    const fullyInterrupted = await internalState.onInterruptExecution();
    // this is an async interrupt - the evaluation is still running in the background
    // we wait until it finally completes (which should happen immediately)
    await Promise.race([
      once(this.bus, 'mongosh:eval-interrupted'),
      new Promise(setImmediate)
    ]);

    const fullyResumed = await internalState.onResumeExecution();
    if (!fullyInterrupted || !fullyResumed) {
      this.output.write(this.formatError({
        name: 'MongoshInternalError',
        message: 'Could not re-establish all connections, we suggest to restart the shell.'
      }));
    }
    this.bus.emit('mongosh:interrupt-complete'); // For testing purposes.
    return true;
  }

  /**
   * Format the result to a string so it can be written to the output stream.
   */
  writer(result: any /* Error | ShellResult */): string {
    // This checks for error instances.
    // The writer gets called immediately by the internal `repl.eval`
    // in case of errors.
    if (isErrorLike(result)) {
      const output = {
        ...result,
        message: result.message || result.errmsg,
        name: result.name || 'MongoshInternalError',
        stack: result.stack
      };
      this.bus.emit('mongosh:error', output);
      return this.formatError(output);
    }

    return this.formatOutput({ type: result.type, value: result.printable });
  }

  onPrint(values: ShellResult[]): void {
    const joined = values.map((value) => this.writer(value)).join(' ');
    this.output.write(joined + '\n');
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async onPrompt(question: string, type: 'password'): Promise<string> {
    const passwordPromise = askpassword({
      input: this.input,
      output: this.output,
      replacementCharacter: '*'
    });
    this.output.write(question + '\n');
    return (await passwordPromise).toString();
  }

  formatOutput(value: { value: any, type?: string }): string {
    return formatOutput(value, this.getFormatOptions());
  }

  formatError(value: Error): string {
    return formatError(value, this.getFormatOptions());
  }

  clr(text: string, style: StyleDefinition): string {
    return clr(text, style, this.getFormatOptions());
  }

  getFormatOptions(): { colors: boolean, compact: number | boolean, depth: number, showStackTraces: boolean } {
    const output = this.output as WriteStream;
    return {
      colors: this._runtimeState?.repl?.useColors ??
        (output.isTTY && output.getColorDepth() > 1),
      compact: this.inspectCompact,
      depth: this.inspectDepth,
      showStackTraces: this.showStackTraces
    };
  }

  runtimeState(): MongoshRuntimeState {
    if (this._runtimeState === null) {
      throw new MongoshInternalError('Mongosh not started yet');
    }
    return this._runtimeState;
  }

  async close(): Promise<void> {
    const rs = this._runtimeState;
    if (rs) {
      this._runtimeState = null;
      rs.repl.close();
      await rs.internalState.close(true);
      if (this.output.writableLength > 0) {
        await once(this.output, 'drain');
      }
    }
  }

  async onExit(): Promise<never> {
    await this.close();
    return this.ioProvider.exit(0);
  }

  async getConfig<K extends keyof CliUserConfig>(key: K): Promise<CliUserConfig[K]> {
    return this.ioProvider.getConfig(key);
  }

  async setConfig<K extends keyof CliUserConfig>(key: K, value: CliUserConfig[K]): Promise<'success' | 'ignored'> {
    const result = await this.ioProvider.setConfig(key, value);
    if (result === 'success') {
      if (key === 'historyLength' && this._runtimeState) {
        (this.runtimeState().repl as any).historySize = value;
      }
      if (key === 'inspectCompact') {
        this.inspectCompact = value as CliUserConfig['inspectCompact'];
      }
      if (key === 'inspectDepth') {
        this.inspectDepth = value as CliUserConfig['inspectDepth'];
      }
      if (key === 'showStackTraces') {
        this.showStackTraces = value as CliUserConfig['showStackTraces'];
      }
      if (key === 'redactHistory') {
        this.redactHistory = value as CliUserConfig['redactHistory'];
      }
    }
    return result;
  }

  async validateConfig<K extends keyof CliUserConfig>(key: K, value: CliUserConfig[K]): Promise<string | null> {
    return CliUserConfigValidator.validate(key, value);
  }

  listConfigOptions(): Promise<string[]> | string[] {
    return this.ioProvider.listConfigOptions();
  }

  async startMongocryptd(): Promise<AutoEncryptionOptions['extraOptions']> {
    return this.ioProvider.startMongocryptd();
  }

  private async getShellPrompt(): Promise<string> {
    const { repl, internalState } = this.runtimeState();

    try {
      this.insideAutoCompleteOrGetPrompt = true;
      if (typeof repl.context.prompt !== 'undefined') {
        const promptResult = await this.loadExternalCode(`
        (() => {
          switch (typeof prompt) {
            case 'function':
              return prompt();
            case 'string':
              return prompt;
          }
        })()`, '<prompt loader>');
        if (typeof promptResult === 'string') {
          return promptResult;
        }
      }
    } catch {
      // ignore - we will use the default prompt
    } finally {
      this.insideAutoCompleteOrGetPrompt = false;
    }
    try {
      return await internalState.getDefaultPrompt();
    } catch {
      // ignore - we will use the default prompt
    }
    return '> ';
  }
}

function isErrorLike(value: any): boolean {
  try {
    return value && (
      (value.message !== undefined && typeof value.stack === 'string') ||
      (value.code !== undefined && value.errmsg !== undefined)
    );
  } catch (err) {
    throw new MongoshInternalError(err?.message || String(err));
  }
}

export default MongoshNodeRepl;
