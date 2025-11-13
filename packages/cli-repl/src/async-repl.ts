import type { EventEmitter } from 'events';
import type { ReadStream } from 'tty';
import isRecoverableError from 'is-recoverable-error';
import type { ReadLineOptions } from 'readline';
import type { ReplOptions, REPLServer } from 'repl';
import type { start as originalStart } from 'repl';
import { promisify } from 'util';
import { prototypeChain, type KeypressKey } from './repl-paste-support';

// Utility, inverse of Readonly<T>
type Mutable<T> = {
  -readonly [P in keyof T]: T[P];
};

export type OriginalEvalFunction = (
  input: string,
  context: any,
  filename: string
) => Promise<any>;
type AsyncEvalFunction = (
  originalEval: OriginalEvalFunction,
  input: string,
  context: any,
  filename: string
) => Promise<any>;

export type AsyncREPLOptions = ReadLineOptions &
  Omit<ReplOptions, 'eval' | 'breakEvalOnSigint'> & {
    start?: typeof originalStart;
    wrapCallbackError?: (err: Error) => Error;
    asyncEval: AsyncEvalFunction;
    onAsyncSigint?: () => Promise<boolean> | boolean;
  };

type EvalStartEvent = {
  input: string;
};
export type EvalFinishEvent = EvalStartEvent &
  (
    | {
        success: true;
      }
    | {
        success: false;
        err: unknown;
        recoverable: boolean;
      }
  );

export const evalStart = Symbol('async-repl:evalStart');
export const evalFinish = Symbol('async-repl:evalFinish');

// Helper for temporarily disabling an event on an EventEmitter.
type RestoreEvents = { restore: () => void };
function disableEvent(emitter: EventEmitter, event: string): RestoreEvents {
  const rawListeners = emitter.rawListeners(event);
  emitter.removeAllListeners(event);
  return {
    restore() {
      for (const listener of rawListeners) {
        emitter.on(event, listener as any);
      }
    },
  };
}

function getPrompt(repl: any): string {
  // Use public getPrompt() API once available (Node.js 15+)
  return repl.getPrompt?.() ?? repl._prompt;
}

/**
 * Start a REPLServer that supports asynchronous evaluation, rather than just
 * synchronous, and integrates nicely with Ctrl+C handling in that respect.
 */
export function start(opts: AsyncREPLOptions): REPLServer {
  // 'repl' is not supported in startup snapshots yet.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { Recoverable, start: originalStart } =
    // eslint-disable-next-line @typescript-eslint/consistent-type-imports
    require('repl') as typeof import('repl');
  const { asyncEval, wrapCallbackError = (err) => err, onAsyncSigint } = opts;
  if (onAsyncSigint) {
    (opts as ReplOptions).breakEvalOnSigint = true;
  }

  const repl: REPLServer = (opts.start ?? originalStart)(opts);
  const originalEval = promisify(
    wrapPauseInput(repl.input, wrapNoSyncDomainError(repl.eval.bind(repl)))
    // string, Context, string is not string, any, string
  ) as (arg1: string, arg2: any, arg3: string) => Promise<any>;

  const setRawMode = (mode: boolean): boolean => {
    const input = repl.input as ReadStream;
    const wasInRawMode = input.isRaw;
    if (typeof input.setRawMode === 'function') {
      input.setRawMode(mode);
    }
    return wasInRawMode;
  };

  // TODO(MONGOSH-1911): Upstream this feature into Node.js core.
  let isPasting = false;
  repl.input.on('keypress', (s: string, key: KeypressKey) => {
    if (key.name === 'paste-start') {
      isPasting = true;
    } else if (key.name === 'paste-end') {
      isPasting = false;
    }
  });

  (repl as Mutable<typeof repl>).eval = (
    input: string,
    context: any,
    filename: string,
    callback: (err: Error | null, result?: any) => void
  ): void => {
    if (isPasting) {
      return callback(
        new Recoverable(new Error('recoverable because pasting in progress'))
      );
    }

    async function _eval() {
      let previouslyInRawMode;

      if (onAsyncSigint) {
        // Unset raw mode during evaluation so that Ctrl+C raises a signal. This
        // is something REPL already does while originalEval is running, but as
        // the actual eval result might be a promise that we will be awaiting, we
        // want the raw mode to be disabled for the whole duration of our custom
        // async eval
        previouslyInRawMode = setRawMode(false);
      }

      let result;
      repl.emit(evalStart, { input } as EvalStartEvent);

      // Use public getPrompt() API once available (Node.js 15+)
      const origPrompt = getPrompt(repl);
      // 'readline' is not supported in startup snapshots yet.
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { Interface } = require('readline');
      // Disable printing prompts while we're evaluating code. We're using the
      // readline superclass method instead of the REPL one here, because the REPL
      // one stores the prompt to later be reset in case of dropping into .editor
      // mode. In particular, the following sequence of results is what we want
      // to avoid:
      // 1. .editor entered
      // 2. Some code entered
      // 3. Tab used for autocompletion, leading to this evaluation being called
      //    while the REPL prompt is still turned off due to .editor
      // 4. Evaluation ends, we use .setPrompt() to restore the prompt that has
      //    temporarily been disable for .editor
      // 5. The REPL thinks that the empty string is supposed to be the prompt
      //    even after .editor is done.
      Interface.prototype.setPrompt.call(repl, '');

      try {
        let exitEventPending = false;
        const exitListener = () => {
          exitEventPending = true;
        };
        let previousExitListeners: any[] = [];

        let sigintListener: (() => void) | undefined = undefined;
        let replSigint: RestoreEvents | undefined = undefined;
        let processSigint: RestoreEvents | undefined = undefined;

        try {
          result = await new Promise((resolve, reject) => {
            if (onAsyncSigint) {
              // Handle SIGINT (Ctrl+C) that occurs while we are stuck in `await`
              // by racing a listener for 'SIGINT' against the evalResult Promise.
              // We remove all 'SIGINT' listeners and install our own.
              sigintListener = async (): Promise<void> => {
                let interruptHandled = false;
                try {
                  interruptHandled = await onAsyncSigint();
                } catch (e: any) {
                  // ignore
                } finally {
                  // Reject with an exception similar to one thrown by Node.js
                  // itself if the `customEval` itself is interrupted
                  // and the asyncSigint handler did not deal with it
                  reject(
                    interruptHandled
                      ? undefined
                      : new Error(
                          'Asynchronous execution was interrupted by `SIGINT`'
                        )
                  );
                }
              };

              replSigint = disableEvent(repl, 'SIGINT');
              processSigint = disableEvent(process, 'SIGINT');

              repl.once('SIGINT', sigintListener);
            }

            // The REPL may become over-eager and emit 'exit' events while our
            // evaluation is still in progress (because it doesn't expect async
            // evaluation). If that happens, defer the event until later.
            previousExitListeners = repl.rawListeners('exit');
            repl.removeAllListeners('exit');
            repl.once('exit', exitListener);

            const evalResult = asyncEval(
              originalEval,
              input,
              context,
              filename
            );

            if (sigintListener !== undefined) {
              process.once('SIGINT', sigintListener);
            }
            evalResult.then(resolve, reject);
          });
        } finally {
          // Restore raw mode
          if (typeof previouslyInRawMode !== 'undefined') {
            setRawMode(previouslyInRawMode);
          }

          // Remove our 'SIGINT' listener and re-install the REPL one(s).
          if (sigintListener !== undefined) {
            repl.removeListener('SIGINT', sigintListener);
            process.removeListener('SIGINT', sigintListener);
          }
          // See https://github.com/microsoft/TypeScript/issues/43287 for context on
          // why `as any` is needed.
          (replSigint as any)?.restore?.();
          (processSigint as any)?.restore?.();

          if (getPrompt(repl) === '') {
            Interface.prototype.setPrompt.call(repl, origPrompt);
          }

          repl.removeListener('exit', exitListener);
          for (const listener of previousExitListeners) {
            repl.on('exit', listener);
          }
          if (exitEventPending) {
            process.nextTick(() => repl.emit('exit'));
          }
        }
      } catch (err: any) {
        try {
          if (isRecoverableError(input)) {
            repl.emit(evalFinish, {
              input,
              success: false,
              err,
              recoverable: true,
            } as EvalFinishEvent);
            return callback(new Recoverable(err));
          }
          repl.emit(evalFinish, {
            input,
            success: false,
            err,
            recoverable: false,
          } as EvalFinishEvent);
          return callback(err);
        } catch (callbackErr: any) {
          return callback(wrapCallbackError(callbackErr));
        }
      }
      try {
        repl.emit(evalFinish, { input, success: true } as EvalFinishEvent);
        return callback(null, result);
      } catch (callbackErr: any) {
        return callback(wrapCallbackError(callbackErr));
      }
    }

    _eval().catch((e) => callback(e));
  };

  return repl;
}

function wrapNoSyncDomainError<Args extends any[], Ret>(
  fn: (...args: Args) => Ret
) {
  return (...args: Args): Ret => {
    // 'domain' is not supported in startup snapshots yet.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
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
    Domain.prototype.emit = function (
      ev: string,
      ...eventArgs: any[]
    ): boolean {
      if (ev === 'error') {
        this.exit();
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

function wrapPauseInput<Args extends any[], Ret>(
  input: any,
  fn: (...args: Args) => Ret
) {
  return (...args: Args): Ret => {
    // This is a hack to temporarily stop processing of input data if the
    // input stream is a libuv-backed Node.js TTY stream.
    // Part of the `breakEvalOnSigint` implementation in the Node.js REPL
    // consists of disabling raw mode before evaluation and re-enabling it after,
    // so that Ctrl+C events can actually be received by the application
    // (instead of being read as raw input characters, which cannot be processed
    // while the evaluation is still ongoing).
    // This works fine everywhere except for Windows. On Windows, setting and
    // un-setting raw mode for TTY streams in libuv actually involves first
    // canceling a potential pending read operation, then changing the mode,
    // and then re-scheduling that read operation, because libuv uses two different
    // mechanisms to read from the Windows console depending on whether it is in
    // raw mode or not.
    // This is problematic, because the "canceling" part here does not involve
    // actually waiting for that pending-but-now-canceled read to finish, possibly
    // leaving it waiting for more input (and then discarding it when it sees that
    // it was actually supposed to be canceled).
    //
    // In mongosh, this problem could be reproduced by running the following lines
    // inside a Windows console window:
    //
    // > prompt = '>'
    // > db.test.findOne()
    // > db.test.findOne()
    // > db.test.findOne() // <--- This line is discarded by libuv!
    //
    // (The timing here is subtle, and thus depends on the db operations here being
    // async calls.)
    // I did not manage to create a minimal reproduction that uses only Node.js stream
    // APIs, or only using libuv APIs, although theoretically that should be possible.
    // This workaround avoids the whole problem by stopping input reads during evaluation
    // and re-scheduling them later, essentially doing the same thing as libuv
    // already does but on a wider level. It is not *guaranteed* to be correct, but
    // I consider the chances of it breaking something to be fairly low, and the chances
    // of addressing the problem decent, even without a full understanding of the
    // underlying problem (which might require significantly more time to address).
    //
    // This workaround uses internal Node.js APIs which are not guaranteed to be stable
    // across major versions (i.e. _handle and its properties are all supposed to
    // be internal). As of Node.js 16, it is still present, and it is unlikely to be
    // removed without semver-major classification.
    // If this does turn out to be a problem again in the future, I would recommend to
    // investigate the issue more deeply on the libuv level, and creating a minimal
    // reproduction using only the Node.js streams APIs first, and then basing a new
    // workaround off of that and submitting the issue to the Node.js or libuv issue
    // trackers.
    // (The last state of debugging this inside libuv is captured in
    // https://github.com/addaleax/node/commit/aef27e698da0dcb5c28d026324a33cb9383b222e,
    // should that ever be needed again. On the mongosh side, this was tracked in
    // https://jira.mongodb.org/browse/MONGOSH-998.)
    const wasReadingAndNeedToWorkaroundWindowsBug =
      process.platform === 'win32' &&
      input.isTTY &&
      input._handle &&
      input._handle.reading &&
      typeof input._handle.readStop === 'function' &&
      typeof input._handle.readStart === 'function';
    if (wasReadingAndNeedToWorkaroundWindowsBug) {
      input._handle.reading = false;
      input._handle.readStop();
    }

    try {
      return fn(...args);
    } finally {
      if (wasReadingAndNeedToWorkaroundWindowsBug && !input._handle.reading) {
        input._handle.reading = true;
        input._handle.readStart();
      }
    }
  };
}

// Not related to paste support, but rather for integrating with the MongoshNodeRepl's
// line-by-line input handling. Calling this methods adds hooks to `repl` that are called
// when the REPL is ready to evaluate further input. Eventually, like the other code
// in this file, we should upstream this into Node.js core and/or evaluate the need for
// it entirely.
export function addReplEventForEvalReady(
  repl: REPLServer,
  before: () => boolean,
  after: () => void
): void {
  const wrapMethodWithLineByLineInputNextLine = (
    repl: REPLServer,
    key: keyof REPLServer
  ) => {
    if (!repl[key]) return;
    const originalMethod = repl[key].bind(repl);
    (repl as any)[key] = (...args: any[]) => {
      if (!before()) {
        return;
      }
      const result = originalMethod(...args);
      after();
      return result;
    };
  };
  // https://github.com/nodejs/node/blob/88f4cef8b96b2bb9d4a92f6848ce4d63a82879a8/lib/internal/readline/interface.js#L954
  // added in https://github.com/nodejs/node/commit/96be7836d794509dd455e66d91c2975419feed64
  // handles newlines inside multi-line input and replaces `.displayPrompt()` which was
  // previously used to print the prompt for multi-line input.
  const addNewLineOnTTYKey = [...prototypeChain(repl)]
    .flatMap((proto) => Object.getOwnPropertySymbols(proto))
    .find((s) => String(s).includes('(_addNewLineOnTTY)')) as keyof REPLServer;
  wrapMethodWithLineByLineInputNextLine(repl, 'displayPrompt');
  wrapMethodWithLineByLineInputNextLine(repl, addNewLineOnTTYKey);
}
