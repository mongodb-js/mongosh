import completer from '@mongosh/autocomplete';
import { MongoshCommandFailed, MongoshInternalError, MongoshWarning } from '@mongosh/errors';
import { changeHistory } from '@mongosh/history';
import i18n from '@mongosh/i18n';
import type { ServiceProvider } from '@mongosh/service-provider-core';
import { EvaluationListener, ShellCliOptions, ShellInternalState } from '@mongosh/shell-api';
import { ShellEvaluator, ShellResult } from '@mongosh/shell-evaluator';
import type { MongoshBus, UserConfig } from '@mongosh/types';
import askpassword from 'askpassword';
import { Console } from 'console';
import { once } from 'events';
import prettyRepl from 'pretty-repl';
import { ReplOptions, REPLServer } from 'repl';
import type { Readable, Writable } from 'stream';
import type { ReadStream, WriteStream } from 'tty';
import { callbackify, promisify } from 'util';
import * as asyncRepl from './async-repl';
import clr, { StyleDefinition } from './clr';
import { MONGOSH_WIKI, TELEMETRY_GREETING_MESSAGE } from './constants';
import formatOutput, { formatError } from './format-output';
import { LineByLineInput } from './line-by-line-input';

export type MongoshCliOptions = ShellCliOptions & {
  redactInfo?: boolean;
};

export type MongoshConfigProvider = {
  getHistoryFilePath(): string;
  getConfig<K extends keyof UserConfig>(key: K): Promise<UserConfig[K]>;
  setConfig<K extends keyof UserConfig>(key: K, value: UserConfig[K]): Promise<void>;
  exit(code: number): Promise<never>;
};

export type MongoshNodeReplOptions = {
  input: Readable;
  output: Writable;
  bus: MongoshBus;
  configProvider: MongoshConfigProvider;
  shellCliOptions?: Partial<MongoshCliOptions>;
  nodeReplOptions?: Partial<ReplOptions>;
};

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
  configProvider: MongoshConfigProvider;
  onClearCommand?: EvaluationListener['onClearCommand'];
  insideAutoComplete: boolean;

  constructor(options: MongoshNodeReplOptions) {
    this.input = options.input;
    this.lineByLineInput = new LineByLineInput(this.input as ReadStream);
    this.output = options.output;
    this.bus = options.bus;
    this.nodeReplOptions = options.nodeReplOptions || {};
    this.shellCliOptions = options.shellCliOptions || {};
    this.configProvider = options.configProvider;
    this.insideAutoComplete = false;
    this._runtimeState = null;
  }

  async start(serviceProvider: ServiceProvider): Promise<void> {
    const internalState = new ShellInternalState(serviceProvider, this.bus, this.shellCliOptions);
    const shellEvaluator = new ShellEvaluator(internalState);
    internalState.setEvaluationListener(this);
    await internalState.fetchConnectionInfo();

    const mongodVersion = internalState.connectionInfo.buildInfo.version;
    await this.greet(mongodVersion);
    await this.printStartupLog(internalState);

    const repl = asyncRepl.start({
      start: prettyRepl.start,
      input: this.lineByLineInput as unknown as Readable,
      output: this.output,
      prompt: await this.getShellPrompt(internalState),
      writer: this.writer.bind(this),
      breakEvalOnSigint: true,
      preview: false,
      asyncEval: this.eval.bind(this),
      historySize: 1000, // Same as the old shell.
      wrapCallbackError:
        (err: Error) => Object.assign(new MongoshInternalError(err.message), { stack: err.stack }),
      ...this.nodeReplOptions
    });

    const console = new Console({
      stdout: this.output,
      stderr: this.output,
      colorMode: this.getFormatOptions().colors
    });
    this.onClearCommand = console.clear.bind(console);
    repl.context.console = console;

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
        this.insideAutoComplete = true;
        try {
          // Merge the results from the repl completer and the mongosh completer.
          const [ [replResults], [mongoshResults] ] = await Promise.all([
            (async() => await origReplCompleter(text) || [[]])(),
            (async() => await mongoshCompleter(text))()
          ]);
          this.bus.emit('mongosh:autocompletion-complete'); // For testing.
          // Remove duplicates, because shell API methods might otherwise show
          // up in both completions.
          const deduped = [...new Set([...replResults, ...mongoshResults])];
          return [deduped, text];
        } finally {
          this.insideAutoComplete = false;
        }
      });

    const originalDisplayPrompt = repl.displayPrompt.bind(repl);

    repl.displayPrompt = (...args: any[]) => {
      originalDisplayPrompt(...args);
      this.lineByLineInput.nextLine();
    };

    if (repl.commands.editor) {
      const originalEditorAction = repl.commands.editor.action.bind(repl);

      repl.commands.editor.action = (...args: Parameters<typeof originalEditorAction>): any => {
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

    const historyFile = this.configProvider.getHistoryFilePath();
    const { redactInfo } = this.shellCliOptions;
    try {
      await promisify(repl.setupHistory).call(repl, historyFile);
      // repl.history is an array of previous commands. We need to hijack the
      // value we just typed, and shift it off the history array if the info is
      // sensitive.
      repl.on('flushHistory', function() {
        const history: string[] = (repl as any).history;
        changeHistory(history, redactInfo);
      });
      // We also want to group multiline history entries into a single entry
      // per evaluation, so that arrow-up functionality is more useful.
      let originalHistory: string[] | null = null;
      (repl as any).on(asyncRepl.evalFinish, (ev: asyncRepl.EvalFinishEvent) => {
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
          const newHistoryEntry = ev.input.split(/[\r\n]+/g)
            .map(line => line.trim())
            .join(' ')
            .trim();
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

    repl.on('exit', async() => {
      try {
        await this.onExit();
      } catch { /* ... */ }
    });

    internalState.setCtx(repl.context);
    // Only start reading from the input *after* we set up everything, including
    // internalState.setCtx().
    this.lineByLineInput.start();
  }

  /**
   * The greeting for the shell.
   */
  async greet(mongodVersion: string): Promise<void> {
    const { version } = require('../package.json');
    let text = '';
    text += `Using MongoDB:      ${mongodVersion}\n`;
    text += `${this.clr('Using Mongosh Beta', ['bold', 'yellow'])}: ${version}\n`;
    text += `${MONGOSH_WIKI}\n`;
    if (!await this.configProvider.getConfig('disableGreetingMessage')) {
      text += `${TELEMETRY_GREETING_MESSAGE}\n`;
      await this.configProvider.setConfig('disableGreetingMessage', true);
    }
    this.output.write(text);
  }

  async printStartupLog(internalState: ShellInternalState): Promise<void> {
    if (this.shellCliOptions.nodb) {
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
      type LogEntry = { t: { $date: string }, msg: string };
      try {
        const entry: LogEntry = JSON.parse(logLine);
        text += `   ${entry.t.$date}: ${entry.msg}\n`;
      } catch (e) {
        text += `   Unexpected log line format: ${logLine}\n`;
      }
    });
    text += `${this.clr('------', ['bold', 'yellow'])}\n`;
    text += '\n';
    this.output.write(text);
  }

  async eval(originalEval: asyncRepl.OriginalEvalFunction, input: string, context: any, filename: string): Promise<any> {
    if (!this.insideAutoComplete) {
      this.lineByLineInput.enableBlockOnNewLine();
    }

    const { internalState, repl, shellEvaluator } = this.runtimeState();

    try {
      const shellResult = await shellEvaluator.customEval(originalEval, input, context, filename);
      if (!this.insideAutoComplete) {
        return shellResult;
      }
      // The Node.js auto completion needs to access the raw values in order
      // to be able to autocomplete their properties properly. One catch is
      // that we peform some filtering of mongosh methods depending on
      // topology, server version, etc., so for those, we do not autocomplete
      // at all and instead leave that to the @mongosh/autocomplete package.
      return shellResult.type !== null ? null : shellResult.rawValue;
    } finally {
      if (!this.insideAutoComplete) {
        repl.setPrompt(await this.getShellPrompt(internalState));
      }
      this.bus.emit('mongosh:eval-complete'); // For testing purposes.
    }
  }

  /**
   * Format the result to a string so it can be written to the output stream.
   */
  writer(result: any): string {
    // This checks for error instances.
    // The writer gets called immediately by the internal `repl.eval`
    // in case of errors.
    if (result && (
      (result.message !== undefined && typeof result.stack === 'string') ||
      (result.code !== undefined && result.errmsg !== undefined)
    )) {
      // eslint-disable-next-line chai-friendly/no-unused-expressions
      this._runtimeState?.shellEvaluator.revertState();

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

  async toggleTelemetry(enabled: boolean): Promise<string> {
    await this.configProvider.setConfig('enableTelemetry', enabled);

    if (enabled) {
      return i18n.__('cli-repl.cli-repl.enabledTelemetry');
    }

    return i18n.__('cli-repl.cli-repl.disabledTelemetry');
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

  formatOutput(value: any): string {
    return formatOutput(value, this.getFormatOptions());
  }

  formatError(value: Error): string {
    return formatError(value, this.getFormatOptions());
  }

  clr(text: string, style: StyleDefinition): string {
    return clr(text, style, this.getFormatOptions());
  }

  getFormatOptions(): { colors: boolean } {
    const output = this.output as WriteStream;
    return {
      colors: this._runtimeState?.repl?.useColors ??
        (output.isTTY && output.getColorDepth() > 1)
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
    return this.configProvider.exit(0);
  }

  private async getShellPrompt(internalState: ShellInternalState): Promise<string> {
    let prompt = '> ';
    try {
      prompt = await internalState.getDefaultPrompt();
    } catch (e) {
      // ignore - we will use the default prompt
    }
    return prompt;
  }
}

export default MongoshNodeRepl;
