import type { CompletionResults } from '@mongosh/autocomplete';
import { completer, initNewAutocompleter } from '@mongosh/autocomplete';
import { MongoshInternalError, MongoshWarning } from '@mongosh/errors';
import { changeHistory } from '@mongosh/history';
import type {
  AutoEncryptionOptions,
  ServiceProvider,
} from '@mongosh/service-provider-core';
import type {
  EvaluationListener,
  OnLoadResult,
  ShellCliOptions,
} from '@mongosh/shell-api';
import {
  ShellInstanceState,
  getShellApiType,
  toShellResult,
} from '@mongosh/shell-api';
import type { ShellResult } from '@mongosh/shell-evaluator';
import { ShellEvaluator } from '@mongosh/shell-evaluator';
import type { ConfigProvider, MongoshBus } from '@mongosh/types';
import {
  CliUserConfig,
  CliUserConfigValidator,
  TimingCategories,
} from '@mongosh/types';
import askcharacter from 'askcharacter';
import askpassword from 'askpassword';
import { Console } from 'console';
import { once } from 'events';
import type { ReplOptions, REPLServer } from 'repl';
import type { Readable, Writable } from 'stream';
import type { ReadStream, WriteStream } from 'tty';
import { callbackify, promisify } from 'util';
import * as asyncRepl from './async-repl';
import type { StyleDefinition } from './clr';
import clr from './clr';
import { MONGOSH_WIKI, TELEMETRY_GREETING_MESSAGE } from './constants';
import {
  formatOutput,
  formatError,
  CONTROL_CHAR_REGEXP,
} from './format-output';
import { makeMultilineJSIntoSingleLine } from '@mongosh/js-multiline-to-singleline';
import { LineByLineInput } from './line-by-line-input';
import type { FormatOptions } from './format-output';
import { markTime } from './startup-timing';
import type { Context } from 'vm';
import { Script, createContext, runInContext } from 'vm';
import { installPasteSupport } from './repl-paste-support';
import util from 'util';

declare const __non_webpack_require__: any;

/**
 * All CLI flags that are useful for {@link MongoshNodeRepl}.
 */
export type MongoshCliOptions = ShellCliOptions & {
  quiet?: boolean;
  /**
   * Whether to instantiate a Node.js REPL instance, including support
   * for async error tracking, or not.
   */
  jsContext?: JSContext;
  exposeAsyncRewriter?: boolean;
};

/**
 * An interface that contains everything necessary for {@link MongoshNodeRepl}
 * instances to actually perform I/O operations.
 */
export type MongoshIOProvider = Omit<
  ConfigProvider<CliUserConfig>,
  'validateConfig' | 'resetConfig'
> & {
  getHistoryFilePath(): string;
  exit(code?: number): Promise<never>;
  readFileUTF8(
    filename: string
  ): Promise<{ contents: string; absolutePath: string }>;
  getCryptLibraryOptions(): Promise<AutoEncryptionOptions['extraOptions']>;
  bugReportErrorMessageInfo?(): string | undefined;
  getLogPath(): string | undefined;
};

export type JSContext = 'repl' | 'plain-vm';

/**
 * Options required for MongoshNodeRepl instance to communicate with
 * other parts of the application.
 */
export type MongoshNodeReplOptions = {
  /** Input stream from which to read input (e.g. process.stdin). */
  input: Readable;
  /** Output stream to which to write output (e.g. process.stdout). */
  output: Writable;
  /** A bus instance on which to emit events about REPL execution. */
  bus: MongoshBus;
  /** Interface for communicating with the outside world, e.g. file I/O. */
  ioProvider: MongoshIOProvider;
  /** All relevant CLI options (i.e. parsed command line flags). */
  shellCliOptions?: Partial<MongoshCliOptions>;
  /** All relevant Node.js REPL options. */
  nodeReplOptions?: Partial<ReplOptions>;
};

/**
 * Opaque token used to make sure that start() can only be called after
 * having called initialize().
 */
export type InitializationToken = { __initialized: 'yes' };

/**
 * Grouped properties of MongoshNodeRepl that are only available
 * after initialization.
 */
type MongoshRuntimeState = {
  shellEvaluator: ShellEvaluator<any>;
  instanceState: ShellInstanceState;
  repl: REPLServer | null;
  context: Context;
  console: Console;
};

type GreetingDetails = {
  moreRecentMongoshVersion?: string | null;
  currentVersionCTA?: { text: string; style?: StyleDefinition }[];
};

/* Utility, inverse of Readonly<T> */
type Mutable<T> = {
  -readonly [P in keyof T]: T[P];
};

/**
 * An instance of a `mongosh` REPL, without any of the actual I/O.
 * Specifically, code called by this class should not do any
 * filesystem I/O, network I/O or write to/read from stdio streams.
 */
class MongoshNodeRepl implements EvaluationListener {
  _runtimeState: MongoshRuntimeState | null;
  closeTrace?: string;
  exitPromise?: Promise<never>;
  input: Readable;
  lineByLineInput: LineByLineInput;
  output: Writable;
  outputFinishString = ''; // Can add ANSI escape codes to reset state from previously written ones
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
  rawValueToShellResult: WeakMap<any, ShellResult> = new WeakMap();

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

  /**
   * Controls whether the shell considers itself to be in interactive mode,
   * i.e. whether .start() will be called or not.
   *
   * @param value The new isInteractive value.
   */
  setIsInteractive(value: boolean): void {
    this.runtimeState().instanceState.isInteractive = value;
  }

  get isInteractive(): boolean {
    return this.runtimeState().instanceState.isInteractive;
  }

  /**
   * Create a Node.js REPL instance that can run mongosh commands,
   * print greeting messages, and set up autocompletion and
   * history handling. This does not yet start evaluating any code
   * or print any user prompt.
   */
  async initialize(
    serviceProvider: ServiceProvider,
    greeting?: GreetingDetails
  ): Promise<InitializationToken> {
    const usePlainVMContext = this.shellCliOptions.jsContext === 'plain-vm';

    const instanceState = new ShellInstanceState(
      serviceProvider,
      this.bus,
      this.shellCliOptions
    );

    const shellEvaluator = new ShellEvaluator(
      instanceState,
      (value: any) => value,
      markTime,
      !!this.shellCliOptions.exposeAsyncRewriter
    );
    instanceState.setEvaluationListener(this);

    // Fetch connection metadata if not in quiet mode or in REPL mode:
    // not-quiet mode -> We'll need it for the greeting message (and need it now)
    // REPL mode -> We'll want it for fast autocomplete (and need it soon-ish, but not now)
    instanceState.setPreFetchCollectionAndDatabaseNames(!usePlainVMContext);
    // `if` commented out because we currently still want the connection info for
    // logging/telemetry but we may want to revisit that in the future:
    // if (!this.shellCliOptions.quiet || !usePlainVMContext)
    {
      const connectionInfoPromise = instanceState.fetchConnectionInfo();
      connectionInfoPromise.catch(() => {
        // Ignore potential unhandled rejection warning
      });
      if (!this.shellCliOptions.quiet) {
        const connectionInfo = await connectionInfoPromise;
        markTime(TimingCategories.REPLInstantiation, 'fetched connection info');

        const { buildInfo, extraInfo } = connectionInfo ?? {};
        let mongodVersion = extraInfo?.is_stream
          ? 'Atlas Stream Processing'
          : buildInfo?.version;
        const apiVersion = serviceProvider.getRawClient()?.serverApi?.version;
        if (apiVersion) {
          mongodVersion =
            (mongodVersion ? mongodVersion + ' ' : '') +
            `(API Version ${apiVersion})`;
        }
        await this.greet(mongodVersion, greeting);
      }
    }

    await this.printBasicConnectivityWarning(instanceState);
    markTime(TimingCategories.REPLInstantiation, 'greeted');

    this.inspectCompact =
      (await this.getConfig('inspectCompact')) ?? this.inspectCompact;
    this.inspectDepth =
      (await this.getConfig('inspectDepth')) ?? this.inspectDepth;
    this.showStackTraces =
      (await this.getConfig('showStackTraces')) ?? this.showStackTraces;
    this.redactHistory =
      (await this.getConfig('redactHistory')) ?? this.redactHistory;
    markTime(TimingCategories.UserConfigLoading, 'fetched config vars');

    let repl: REPLServer | null = null;
    let context: Context;
    if (!usePlainVMContext) {
      repl = asyncRepl.start({
        // 'repl' is not supported in startup snapshots yet.
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        start: require('pretty-repl').start,
        input: this.lineByLineInput,
        output: this.output,
        prompt: '',
        writer: this.writer.bind(this),
        breakEvalOnSigint: true,
        preview: false,
        asyncEval: this.eval.bind(this),
        historySize: await this.getConfig('historyLength'),
        wrapCallbackError: (err: Error) =>
          Object.assign(new MongoshInternalError(err.message), {
            stack: err.stack,
          }),
        onAsyncSigint: this.onAsyncSigint.bind(this),
        ...this.nodeReplOptions,
      });
      context = repl.context;
    } else {
      // https://nodejs.org/api/repl.html#replbuiltinmodules not represented in TS types
      // repl is not supported in startup snapshots yet
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { builtinModules: nodeReplBuiltinModules } = require('repl');
      context = createContext();
      // Allow tests to easily verify that they are in the right environment,
      // and fetch a list of built-in global property names
      const jsBuiltinGlobalNames = runInContext(
        'globalThis[Symbol.for("@@mongosh.usingPlainVMContext")] = true;' +
          'Object.getOwnPropertyNames(globalThis)',
        context
      );
      // copy over things like setTimeout, Crypto, URL, etc.
      for (const nodeJsGlobal of Object.getOwnPropertyNames(globalThis)) {
        if (!jsBuiltinGlobalNames.includes(nodeJsGlobal))
          Object.defineProperty(context, nodeJsGlobal, {
            ...Object.getOwnPropertyDescriptor(globalThis, nodeJsGlobal),
          });
      }
      // make built-in modules like `fs` available as global variables
      for (const builtin of nodeReplBuiltinModules as string[]) {
        let value;
        Object.defineProperty(context, builtin, {
          enumerable: false,
          configurable: true,
          get() {
            return (value ??=
              typeof __non_webpack_require__ === 'function'
                ? __non_webpack_require__(builtin)
                : require(builtin));
          },
          set(v) {
            value = v;
          },
        });
      }
      context.global = context;
      context.require = require('node:module').createRequire(
        process.cwd() + '/index.js'
      );
    }

    const console = new Console({
      stdout: this.output,
      stderr: this.output,
      colorMode: this.getFormatOptions().colors,
    });
    delete context.parcelRequire; // MONGOSH-965
    delete context.__webpack_require__;
    delete context.__non_webpack_require__;
    this.onClearCommand = console.clear.bind(console);
    context.console = console;

    // Copy our context's Date object into the inner one because we have a custom
    // util.inspect override for Date objects.
    context.Date = Date;

    {
      // Node.js 18+ defines `crypto` in the REPL to be the global WebCrypto object,
      // not the Node.js `crypto` module. We would need to decide if/when to break this
      // separately from the Node.js upgrade cycle, so we always use the Node.js builtin
      // module for now.
      const globalCryptoDescriptor =
        Object.getOwnPropertyDescriptor(context, 'crypto') ?? {};
      if (
        globalCryptoDescriptor.value?.subtle ||
        globalCryptoDescriptor.get?.call(null)?.subtle
      ) {
        delete context.crypto;
        context.crypto = await import('node:crypto');
      }
    }

    this._runtimeState = {
      shellEvaluator,
      instanceState,
      repl,
      context,
      console,
    };

    markTime(
      TimingCategories.REPLInstantiation,
      'basic repl/vm initialization complete'
    );

    await this.finishInitializingNodeRepl();
    instanceState.setCtx(context);

    this.setupHistoryCommand();

    if (!this.shellCliOptions.nodb && !this.shellCliOptions.quiet) {
      // cf. legacy shell:
      // https://github.com/mongodb/mongo/blob/a6df396047a77b90bf1ce9463eecffbee16fb864/src/mongo/shell/mongo_main.cpp#L1003-L1026
      const { shellApi } = instanceState;
      // Assuming `instanceState.fetchConnectionInfo()` was already called above
      const connectionInfo = instanceState.cachedConnectionInfo();
      // Skipping startup warnings (see https://jira.mongodb.org/browse/MONGOSH-1776)
      const bannerCommands = connectionInfo?.extraInfo?.is_local_atlas
        ? ['automationNotices', 'nonGenuineMongoDBCheck']
        : ['startupWarnings', 'automationNotices', 'nonGenuineMongoDBCheck'];
      const banners = await Promise.all(
        bannerCommands.map(
          async (command) => await shellApi._untrackedShow(command)
        )
      );
      for (const banner of banners) {
        if (banner.value) {
          await shellApi.print(banner);
        }
      }
    }

    markTime(TimingCategories.REPLInstantiation, 'finished initialization');
    return { __initialized: 'yes' };
  }

  setupHistoryCommand(): void {
    const history = () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const replHistory: string[] = (this.runtimeState().repl as any).history;
      const formattedHistory =
        // Remove the history call from the formatted history
        replHistory.slice(1).reverse();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      formattedHistory[util.inspect.custom as any] = ((
        depth: number | null,
        options: util.InspectOptions,
        inspect: typeof util.inspect
      ) => {
        // We pass a copy of the array without the util.inspect.custom set
        // to prevent infinite recursion.
        return inspect(formattedHistory.concat(), {
          ...options,
          depth,
          maxArrayLength: Infinity,
        });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      }) as any;
      return formattedHistory;
    };

    this.runtimeState().context.history = history;
  }

  private async finishInitializingNodeRepl(): Promise<void> {
    const { repl, instanceState } = this.runtimeState();
    if (!repl) return;

    this.outputFinishString += installPasteSupport(repl);

    const origReplCompleter = promisify(repl.completer.bind(repl)); // repl.completer is callback-style

    let newMongoshCompleter: (line: string) => Promise<CompletionResults>;
    let oldMongoshCompleter: (line: string) => Promise<CompletionResults>;

    if (process.env.USE_NEW_AUTOCOMPLETE) {
      // we will lazily instantiate the new autocompleter on first use
    } else {
      const autocompleteParams = instanceState.getAutocompleteParameters();
      oldMongoshCompleter = completer.bind(null, autocompleteParams);
    }

    const innerCompleter = async (
      text: string
    ): Promise<[string[], string]> => {
      // Merge the results from the repl completer and the mongosh completer.
      const [
        [replResults, replOrig],
        [mongoshResults, , mongoshResultsExclusive],
      ] = await Promise.all([
        (async () => {
          const nodeResults = (await origReplCompleter(text)) || [[]];
          return nodeResults;
        })(),
        (async () => {
          if (process.env.USE_NEW_AUTOCOMPLETE) {
            if (!newMongoshCompleter) {
              newMongoshCompleter = await initNewAutocompleter(instanceState, {
                disableSchemaSampling: await this.getConfig(
                  'disableSchemaSampling'
                ),
              });
            }

            return newMongoshCompleter(text);
          } else {
            return oldMongoshCompleter(text);
          }
        })(),
      ]);
      this.bus.emit(
        'mongosh:autocompletion-complete',
        replResults,
        mongoshResults
      ); // For testing.

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
      const replResultPrefix = replOrig
        ? text.substr(0, text.lastIndexOf(replOrig))
        : '';
      const longReplResults = replResults.map(
        (result: string) => replResultPrefix + result
      );

      // Remove duplicates, because shell API methods might otherwise show
      // up in both completions.
      const deduped = [...new Set([...longReplResults, ...mongoshResults])];

      return [deduped, text];
    };

    const nodeReplCompleter = callbackify(
      async (text: string): Promise<[string[], string]> => {
        this.insideAutoCompleteOrGetPrompt = true;
        try {
          // eslint-disable-next-line prefer-const
          let [results, completeOn] = await innerCompleter(text);
          results = results.filter(
            (result) => !CONTROL_CHAR_REGEXP.test(result)
          );
          return [results, completeOn];
        } finally {
          this.insideAutoCompleteOrGetPrompt = false;
        }
      }
    );
    (repl as Mutable<typeof repl>).completer = nodeReplCompleter;

    // This is used below for multiline history manipulation.
    let originalHistory: string[] | null = null;

    asyncRepl.addReplEventForEvalReady(
      repl,
      () => !!this.started,
      () => this.lineByLineInput.nextLine()
    );

    if (repl.commands.editor) {
      const originalEditorAction = repl.commands.editor.action.bind(repl);

      repl.commands.editor.action = (
        ...args: Parameters<typeof originalEditorAction>
      ): any => {
        originalHistory = [...(repl as any).history];
        this.lineByLineInput.disableBlockOnNewline();
        return originalEditorAction(...args);
      };
    }

    repl.defineCommand('clear', {
      help: '',
      action: () => {
        repl.displayPrompt();
      },
    });

    // Work around a weird Node.js REPL bug where .line is expected to be
    // defined but not necessarily present during the .setupHistory() call.
    // https://github.com/nodejs/node/issues/36773
    (repl as Mutable<typeof repl>).line = '';

    markTime(TimingCategories.REPLInstantiation, 'created repl object');
    const historyFile = this.ioProvider.getHistoryFilePath();
    try {
      await promisify(repl.setupHistory).call(repl, historyFile);
      // repl.history is an array of previous commands. We need to hijack the
      // value we just typed, and shift it off the history array if the info is
      // sensitive.
      repl.on('line', () => {
        if (this.redactHistory !== 'keep') {
          const history: string[] = (repl as any).history;
          changeHistory(
            history,
            this.redactHistory === 'remove-redact'
              ? 'redact-sensitive-data'
              : 'keep-sensitive-data'
          );
        }
      });
      // We also want to group multiline history entries and .editor input into
      // a single entry per evaluation, so that arrow-up functionality
      // is more useful.
      (repl as any).on(
        asyncRepl.evalFinish,
        (ev: asyncRepl.EvalFinishEvent) => {
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
            history.splice(0, history.length, ...originalHistory);
            originalHistory = null;
          }
        }
      );
    } catch (err: any) {
      // repl.setupHistory() only reports failure when something went wrong
      // *after* the file was already opened for the first time. If the initial
      // open fails, it will print a warning to the REPL and report success to us.
      const warn = new MongoshWarning(
        'Error processing history file: ' + err?.message
      );
      this.output.write(this.writer(warn) + '\n');
    }

    markTime(TimingCategories.UserConfigLoading, 'set up history file');

    // Similar calls are added for plain-vm evaluation below
    (repl as any).on(asyncRepl.evalStart, () => {
      this.bus.emit('mongosh:evaluate-started');
    });
    (repl as any).on(asyncRepl.evalFinish, () => {
      this.bus.emit('mongosh:evaluate-finished');
    });

    repl.on('exit', () => {
      // repl is already closed, no need to close it again via this.close()
      if (this._runtimeState) this._runtimeState.repl = null;
      this.onExit().catch(() => {
        /* ... */
      });
    });
  }

  /**
   * Print a REPL prompt and start processing data from the input stream.
   *
   * @param _initializationToken A value obtained by calling {@link MongoshNodeRepl.initialize}.
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async startRepl(_initializationToken: InitializationToken): Promise<void> {
    this.started = true;
    const { repl } = this.runtimeState();
    if (!repl) {
      throw new MongoshInternalError(
        'Cannot start REPL when not in REPL evaluation mode'
      );
    }
    // Set up the prompt before consuming input so that we do not end up
    // running the prompt function in parallel with actual input code.
    repl.setPrompt(await this.getShellPrompt());
    // Only start reading from the input *after* we set up everything, including
    // instanceState.setCtx() and configuring the REPL prompt.
    this.lineByLineInput.start();
    this.input.resume();
    repl.displayPrompt();
  }

  /**
   * The greeting for the shell, showing server and shell version.
   */
  async greet(
    mongodVersion: string,
    greeting?: GreetingDetails
  ): Promise<void> {
    if (this.shellCliOptions.quiet) {
      return;
    }
    const { version } = require('../package.json');
    let text = '';
    if (!this.shellCliOptions.nodb) {
      text += `Using MongoDB:\t\t${mongodVersion}\n`;
    }
    text += `${this.clr(
      'Using Mongosh',
      'mongosh:section-header'
    )}:\t\t${version}\n`;
    if (greeting?.moreRecentMongoshVersion) {
      text += `mongosh ${this.clr(
        greeting.moreRecentMongoshVersion,
        'bold'
      )} is available for download: ${this.clr(
        'https://www.mongodb.com/try/download/shell',
        'mongosh:uri'
      )}\n`;
    }

    if (greeting?.currentVersionCTA) {
      for (const run of greeting.currentVersionCTA) {
        text += this.clr(run.text, run.style);
      }
      text += '\n';
    }

    text += `${MONGOSH_WIKI}\n`;
    if (!(await this.getConfig('disableGreetingMessage'))) {
      text += `${TELEMETRY_GREETING_MESSAGE}\n`;
      await this.setConfig('disableGreetingMessage', true);
    }
    this.output.write(text);
  }

  /**
   * Print a warning if the server is not able to respond to commands.
   * This can happen in load balanced mode, for example.
   */
  async printBasicConnectivityWarning(
    instanceState: ShellInstanceState
  ): Promise<void> {
    if (this.shellCliOptions.nodb || this.shellCliOptions.quiet) {
      return;
    }

    let err: Error;
    try {
      await instanceState.currentDb.adminCommand({ ping: 1 });
      return;
    } catch (error: any) {
      err = error;
    }

    const text = this.clr(
      'The server failed to respond to a ping and may be unavailable:',
      'mongosh:warning'
    );
    this.output.write(text + '\n' + this.formatError(err) + '\n');
  }

  /**
   * Evaluate a piece of input code. This is called by the AsyncRepl eval function
   * and calls the {@link ShellEvaluator} eval function, passing along all of its
   * arguments.
   *
   * It mostly handles interaction with input processing (stop accepting input until
   * evaluation is complete) and full mongosh-specific Ctrl+C interruption support.
   *
   * @param originalEval The original Node.js REPL evaluation function
   * @param input The input string to be evaluated
   * @param context The REPL context object (the globalThis object seen by its scope)
   * @param filename The filename used for this evaluation, for stack traces
   * @returns The result of evaluating `input`
   */
  async eval(
    originalEval: asyncRepl.OriginalEvalFunction,
    input: string,
    context: any,
    filename: string
  ): Promise<any> {
    markTime(TimingCategories.Eval, 'start repl eval');
    if (!this.insideAutoCompleteOrGetPrompt) {
      this.lineByLineInput.enableBlockOnNewLine();
    }

    const { repl, shellEvaluator } = this.runtimeState();
    let interrupted = false;

    try {
      const rawValue = await shellEvaluator.customEval(
        originalEval,
        input,
        context,
        filename
      );
      if (
        (typeof rawValue === 'object' && rawValue !== null) ||
        typeof rawValue === 'function'
      ) {
        this.rawValueToShellResult.set(rawValue, await toShellResult(rawValue));
      }
      // The Node.js auto completion needs to access the raw values in order
      // to be able to autocomplete their properties properly. One catch is
      // that we peform some filtering of mongosh methods depending on
      // topology, server version, etc., so for those, we only autocomplete
      // own, enumerable, non-underscore-prefixed properties and instead leave
      // the rest to the @mongosh/autocomplete package.
      if (
        !this.insideAutoCompleteOrGetPrompt ||
        getShellApiType(rawValue) === null
      ) {
        return rawValue;
      }
      return Object.fromEntries(
        Object.entries(rawValue).filter(([key]) => !key.startsWith('_'))
      );
    } catch (err: any) {
      if (this.runtimeState().instanceState.interrupted.isSet()) {
        interrupted = true;
        this.bus.emit('mongosh:eval-interrupted');
        // The shell is interrupted by CTRL-C - so we ignore any errors
        // that happened during evaluation.
        return undefined;
      }

      if (!isErrorLike(err)) {
        throw new Error(
          this.formatOutput({
            value: err,
          })
        );
      }
      throw err;
    } finally {
      markTime(TimingCategories.Eval, 'done repl eval');
      if (!this.insideAutoCompleteOrGetPrompt && !interrupted && repl) {
        // In case of an interrupt, onAsyncSigint will print the prompt when completed
        repl.setPrompt(await this.getShellPrompt());
      }

      if (this.loadNestingLevel <= 1) {
        this.bus.emit('mongosh:eval-complete'); // For testing purposes.
      }
      markTime(TimingCategories.Eval, 're-set prompt');
    }
  }

  /**
   * Called when load() is called in the REPL.
   * This is part of the EvaluationListener interface.
   */
  async onLoad(filename: string): Promise<OnLoadResult> {
    const { contents, absolutePath } = await this.ioProvider.readFileUTF8(
      filename
    );

    return {
      resolvedFilename: absolutePath,
      evaluate: async () => {
        this.loadNestingLevel += 1;
        try {
          await this.loadExternalCode(contents, absolutePath);
        } finally {
          this.loadNestingLevel -= 1;
        }
      },
    };
  }

  /**
   * Load and evaluate a specified file by its filename, using the shell load() method.
   *
   * @param filename The filename to be loaded.
   */
  async loadExternalFile(filename: string): Promise<void> {
    await this.runtimeState().instanceState.shellApi.load(filename);
  }

  /**
   * Load and evaluate a specified piece of code.
   *
   * @param input The code to be evaluated.
   * @param filename The filename, for stack trace purposes.
   * @returns The result of evaluating `input`.
   */
  async loadExternalCode(
    input: string,
    filename: string
  ): Promise<ShellResult> {
    const { repl, context } = this.runtimeState();
    if (repl) {
      return await promisify(repl.eval.bind(repl))(input, context, filename);
    }

    let asyncSigintHandler!: () => void;
    const asyncSigintPromise = new Promise((resolve, reject) => {
      asyncSigintHandler = () => {
        void this.onAsyncSigint();
        setImmediate(() =>
          reject(
            new Error('Asynchronous execution was interrupted by `SIGINT`')
          )
        );
      };
    });
    this.bus.emit('mongosh:evaluate-started');
    try {
      process.addListener('SIGINT', asyncSigintHandler);
      return await Promise.race([
        asyncSigintPromise,
        this.eval(
          (input, context, filename) =>
            new Script(input, { filename }).runInContext(context, {
              breakOnSigint: true,
            }),
          input,
          context,
          filename
        ),
      ]);
    } finally {
      process.removeListener('SIGINT', asyncSigintHandler);
      this.bus.emit('mongosh:evaluate-finished');
    }
  }

  /**
   * This function is called by the async REPL helpers when an interrupt occurs.
   * It is called while .eval() is still running, and typically finishes
   * asynchronously after it, once the driver connections have been restarted.
   *
   * @returns true
   */
  async onAsyncSigint(): Promise<boolean> {
    const { instanceState } = this.runtimeState();
    if (instanceState.interrupted.isSet()) {
      return true;
    }
    this.output.write('Stopping execution...');

    const mongodVersion: string | undefined =
      instanceState.cachedConnectionInfo()?.buildInfo?.version;
    if (mongodVersion?.match(/^(4\.0\.|3\.)\d+/)) {
      this.output.write(
        this.clr(
          `\nWARNING: Operations running on the server cannot be killed automatically for MongoDB ${mongodVersion}.` +
            '\n         Please make sure to kill them manually. Killing operations is supported starting with MongoDB 4.1.',
          'mongosh:warning'
        )
      );
    }

    const fullyInterrupted = await instanceState.onInterruptExecution();
    // this is an async interrupt - the evaluation is still running in the background
    // we wait until it finally completes (which should happen immediately)
    await Promise.race([
      new Promise<void>((resolve) =>
        this.bus.once('mongosh:eval-interrupted', resolve)
      ),
      new Promise(setImmediate),
    ]);

    const fullyResumed = await instanceState.onResumeExecution();
    if (!fullyInterrupted || !fullyResumed) {
      this.output.write(
        this.formatError({
          name: 'MongoshInternalError',
          message:
            'Could not re-establish all connections, we suggest to restart the shell.',
        })
      );
    }
    this.bus.emit('mongosh:interrupt-complete'); // For testing purposes.

    const { repl } = this.runtimeState();
    if (repl) {
      repl.setPrompt(await this.getShellPrompt());
    }

    return true;
  }

  /**
   * Format the result to a string so it can be written to the output stream.
   */
  writer(result: any): string {
    // This checks for error instances.
    // The writer gets called immediately by the internal `repl.eval`
    // in case of errors.
    if (isErrorLike(result)) {
      const output = {
        ...result,
        message: result.message || result.errmsg,
        name: result.name || 'MongoshInternalError',
        stack: result.stack,
        cause: result.cause,
      };
      this.bus.emit('mongosh:error', output, 'repl');
      return this.formatError(output);
    }

    return this.formatShellResult(
      this.rawValueToShellResult.get(result) ?? {
        type: null,
        printable: result,
      }
    );
  }

  /**
   * Format a ShellResult instance so that it can be written to the output stream.
   *
   * @param result A ShellResult (or similar) object.
   * @returns The pretty-printed version of the input.
   */
  formatShellResult(
    result: { type: null | string; printable: any },
    extraFormatOptions: Partial<FormatOptions> = {}
  ): string {
    return this.formatOutput(
      { type: result.type, value: result.printable },
      extraFormatOptions
    );
  }

  /**
   * Called when print(), console.log() etc. are called from the shell.
   *
   * @param values A list of values to be printed.
   */
  onPrint(values: ShellResult[], type: 'print' | 'printjson'): void {
    let extraOptions: Partial<FormatOptions> = {
      allowControlCharacters: true,
    };
    // MONGOSH-955: when `printjson()` is called in mongosh, we will try to
    // replicate the format of the old shell: start every object on the new
    // line, and set all the collapse options threshold to infinity
    if (type === 'printjson') {
      extraOptions = {
        ...extraOptions,
        compact: false,
        depth: Infinity,
        maxArrayLength: Infinity,
        maxStringLength: Infinity,
      };
    }
    const joined = values
      .map((value) => this.formatShellResult(value, extraOptions))
      .join(' ');
    this.output.write(joined + '\n');
  }

  /**
   * Called when the shell requests a prompt, e.g. through passwordPrompt().
   *
   * @param question The prompt to be displayed.
   * @param type Which kind of answer to ask for.
   * @returns 'yes'/'no' for 'yesno' prompts, otherwise the user input.
   */
  async onPrompt(
    question: string,
    type: 'password' | 'yesno'
  ): Promise<string> {
    // Make sure we are in async evaluation mode, see comments in the
    // function for details
    await enterAsynchronousExecutionForPrompt();

    if (type === 'password') {
      const passwordPromise = askpassword({
        input: this.input,
        output: this.output,
        replacementCharacter: '*',
      });
      this.output.write(question + '\n');
      return (await passwordPromise).toString();
    } else if (type === 'yesno') {
      let result = '';
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const charPromise = askcharacter({
          input: this.input,
          output: this.output,
        });
        this.output.write(question + ': ');
        result = await charPromise;
        if (result.length > 0 && !/^[yYnN\r\n]$/.exec(result)) {
          this.output.write('\nPlease enter Y or N: ');
        } else {
          break;
        }
      }
      this.output.write('\n');
      return { Y: 'yes', N: 'no' }[result.toUpperCase() as 'Y' | 'N'] ?? '';
    }
    throw new Error(`Unrecognized prompt type ${type}`);
  }

  /**
   * Format a shell evaluation result so that it can be written to the output stream.
   *
   * @param value A value, together with optional type information.
   * @returns The pretty-printed version of the input.
   */
  formatOutput(
    value: { value: any; type?: string | null },
    extraFormatOptions: Partial<FormatOptions> = {}
  ): string {
    return formatOutput(value, {
      ...this.getFormatOptions(),
      ...extraFormatOptions,
    });
  }

  /**
   * Format an Error object can be written to the output stream.
   *
   * @param value An Error object.
   * @returns The pretty-printed version of the input.
   */
  formatError(value: Error): string {
    return formatError(value, this.getFormatOptions());
  }

  /**
   * Colorize a given piece of text according to this shell's output formatting options.
   *
   * @param text The text to be colorized.
   * @param style A style (or list of styles) to be applied.
   * @returns The colorized string.
   */
  clr(text: string, style: StyleDefinition): string {
    return clr(text, style, this.getFormatOptions());
  }

  /**
   * Provides the current set of output formatting options used for this shell.
   */
  getFormatOptions(): FormatOptions {
    const output: Writable &
      Partial<Pick<WriteStream, 'isTTY' | 'getColorDepth'>> = this.output;
    return {
      colors:
        this._runtimeState?.repl?.useColors ??
        !!(output.isTTY && (output?.getColorDepth?.() ?? 0) > 1),
      compact: this.inspectCompact,
      depth: this.inspectDepth,
      showStackTraces: this.showStackTraces,
      bugReportErrorMessageInfo: this.ioProvider.bugReportErrorMessageInfo?.(),
    };
  }

  /**
   * Returns state that is only available after initialize(), and throws
   * an exception if the shell instance has not been initialized.
   */
  runtimeState(): MongoshRuntimeState {
    if (this._runtimeState === null) {
      // This error can be really hard to debug, so we always attach stack traces
      // from both when .close() was called and when
      throw new MongoshInternalError(
        `mongosh not initialized yet\nCurrent trace: ${
          new Error().stack
        }\nClose trace: ${this.closeTrace}`
      );
    }
    return this._runtimeState;
  }

  /**
   * Close all resources held by this shell instance; in particular,
   * close the ShellInstanceState instance and the Node.js REPL
   * instance, and wait for all output that is currently pending
   * to be flushed.
   */
  async close(): Promise<void> {
    const rs = this._runtimeState;
    if (rs) {
      this._runtimeState = null;
      this.closeTrace = new Error().stack;
      if (rs.repl) {
        // Can be null if the repl already emitted 'exit'
        rs.repl.close();
        await once(rs.repl, 'exit');
      }
      await rs.instanceState.close(true);
      await new Promise((resolve) =>
        this.output.write(this.outputFinishString, resolve)
      );
    }
  }

  /**
   * Called when exit() or quit() is called from the shell.
   *
   * @param exitCode The user-specified exit code, if any.
   */
  async onExit(exitCode?: number): Promise<never> {
    return (this.exitPromise ??= (async () => {
      await this.close();
      return this.ioProvider.exit(exitCode);
    })());
  }

  /**
   * Implements getConfig from the {@link ConfigProvider} interface.
   */
  async getConfig<K extends keyof CliUserConfig>(
    key: K
  ): Promise<CliUserConfig[K] | undefined> {
    return this.ioProvider.getConfig(key);
  }

  /**
   * Implements getLogPath from the {@link ConfigProvider} interface.
   */
  getLogPath(): string | undefined {
    return this.ioProvider.getLogPath();
  }

  /**
   * Implements setConfig from the {@link ConfigProvider} interface.
   */
  async setConfig<K extends keyof CliUserConfig>(
    key: K,
    value: CliUserConfig[K]
  ): Promise<'success' | 'ignored'> {
    const result = await this.ioProvider.setConfig(key, value);
    if (result === 'success') {
      if (key === 'historyLength' && this._runtimeState) {
        (this.runtimeState().repl as any).historySize = value;
      }
      if (key === 'inspectCompact') {
        this.inspectCompact = value as number | boolean;
      }
      if (key === 'inspectDepth') {
        this.inspectDepth = value as number;
      }
      if (key === 'showStackTraces') {
        this.showStackTraces = value as boolean;
      }
      if (key === 'redactHistory') {
        this.redactHistory = value as CliUserConfig['redactHistory'];
      }
    }
    return result;
  }

  /**
   * Implements resetConfig from the {@link ConfigProvider} interface.
   */
  async resetConfig<K extends keyof CliUserConfig>(
    key: K
  ): Promise<'success' | 'ignored'> {
    return await this.setConfig(key, new CliUserConfig()[key]);
  }

  /**
   * Implements validateConfig from the {@link ConfigProvider} interface.
   */
  async validateConfig<K extends keyof CliUserConfig>(
    key: K,
    value: CliUserConfig[K]
  ): Promise<string | null> {
    return CliUserConfigValidator.validate(key, value);
  }

  /**
   * Implements listConfigOptions from the {@link ConfigProvider} interface.
   */
  listConfigOptions(): Promise<string[]> | string[] | undefined {
    return this.ioProvider.listConfigOptions();
  }

  /**
   * Get the right crypt shared library loading options.
   */
  async getCryptLibraryOptions(): Promise<
    AutoEncryptionOptions['extraOptions']
  > {
    return this.ioProvider.getCryptLibraryOptions();
  }

  /**
   * Figure out the current prompt to use.
   */
  private async getShellPrompt(): Promise<string> {
    const { context, instanceState } = this.runtimeState();

    try {
      this.insideAutoCompleteOrGetPrompt = true;
      if (typeof context.prompt !== 'undefined') {
        const promptResult = await this.loadExternalCode(
          `
        (() => {
          switch (typeof prompt) {
            case 'function':
              return prompt();
            case 'string':
              return prompt;
          }
        })()`,
          '<prompt loader>'
        );
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
      return await instanceState.getDefaultPrompt();
    } catch {
      // ignore - we will use the default prompt
    }
    return '> ';
  }

  jsContext(): JSContext {
    return this.runtimeState().repl ? 'repl' : 'plain-vm';
  }
}

/**
 * Determines whether a given object should be interpreted as an Error object.
 */
function isErrorLike(value: any): boolean {
  try {
    return (
      value &&
      getShellApiType(value) === null &&
      ((value.message !== undefined && typeof value.stack === 'string') ||
        (value.code !== undefined && value.errmsg !== undefined))
    );
  } catch (err: any) {
    throw new MongoshInternalError(err?.message || String(err));
  }
}

async function enterAsynchronousExecutionForPrompt(): Promise<void> {
  // Make sure we always start out in an asynchronous state when
  // presenting a prompt to the user.
  // This is to work around/solve https://jira.mongodb.org/browse/MONGOSH-1667,
  // where the sequence of events was as follows:
  //
  //  1. User types input (in raw mode), which contains a call to e.g.
  //     passwordPrompt().
  //  2. Our AsyncRepl implementation disables raw mode (for Ctrl+C support).
  //  3. The Node.js REPL implementation disables raw mode (also for Ctrl+C
  //      support, but targeting synchronous execution only).
  //  4. The prompt implementation enables raw mode (to prevent echoing input)
  //     while in the synchronous portion of evaluation, then waits for input.
  //  5. Synchronous evaluation ends and the Node.js REPL restores the previous
  //     raw mode, i.e. disabled it, because that is the state our AsyncRepl set
  //     just before the Node.js REPL started evaluating.
  //     (The prompt implementation observed this "auto-reset" but assumed it was
  //     an intentional override of its own set-raw-mode behavior).
  //  6. The prompt value (e.g. password) is entered and echoes back to the
  //     terminal because raw mode is disabled.
  //  7. Only after that does the AsyncRepl instance restore raw mode for
  //     getting user input.
  //
  // Solving this issue by ensuring that the prompt is unaffected by our REPL
  // raw mode setting/resetting seems like a reasonably self-contained approach
  // to this issue.

  await new Promise(setImmediate);
}

export default MongoshNodeRepl;
