/* eslint-disable complexity */
import {
  ShellInternalState,
  shellApiType,
  asShellResult,
  ShellResult
} from '@mongosh/shell-api';

interface Container {
  toggleTelemetry(boolean): void;
}

import { HIDDEN_COMMANDS, removeCommand } from '@mongosh/history';

class ShellEvaluator {
  private internalState: ShellInternalState;
  private container: Container;
  constructor(
    internalState: ShellInternalState,
    container?: Container
  ) {
    this.internalState = internalState;
    this.container = container;
  }

  public revertState(): void {
    this.internalState.asyncWriter.symbols.revertState();
  }

  public saveState(): void {
    this.internalState.asyncWriter.symbols.saveState();
  }

  /**
   * Checks for linux-style commands then evaluates input using originalEval.
   *
   * @param {function} originalEval - the javascript evaluator.
   * @param {String} input - user input.
   * @param {Context} context - the execution context.
   * @param {String} filename
   */
  private async innerEval(originalEval: any, input: string, context: any, filename: string): Promise<any> {
    const argv = input.trim().replace(/;$/, '').split(' ');
    const cmd = argv[0];
    argv.shift();
    switch (cmd) {
      case 'use':
        return this.internalState.shellApi.use(argv[0]);
      case 'show':
        return this.internalState.shellApi.show(argv[0], argv[1]);
      case 'it':
        return this.internalState.shellApi.it();
      case 'exit':
      case 'quit':
        return await this.internalState.shellApi.exit();
      case 'enableTelemetry()':
        if (this.container) {
          return this.container.toggleTelemetry(true);
        }
        return;
      case 'disableTelemetry()':
        if (this.container) {
          return this.container.toggleTelemetry(false);
        }
        return;
      default:
        this.saveState();
        const rewrittenInput = this.internalState.asyncWriter.process(input);

        const hiddenCommands = RegExp(HIDDEN_COMMANDS, 'g');
        if (!hiddenCommands.test(input) && !hiddenCommands.test(rewrittenInput)) {
          this.internalState.messageBus.emit(
            'mongosh:rewritten-async-input',
            { original: removeCommand(input.trim()), rewritten: removeCommand(rewrittenInput.trim()) }
          );
        }

        let Domain;
        try {
          Domain = require('domain').Domain;
        } catch {} // eslint-disable-line no-empty
        Domain = Domain || class { emit(): void {} };
        const origEmit = Domain.prototype.emit;
        try {
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
          Domain.prototype.emit = function(ev, ...args): void {
            if (ev === 'error') {
              throw args[0];
            }
            return origEmit.call(this, ev, ...args);
          };

          let syncResult;
          try {
            syncResult = originalEval(rewrittenInput, context, filename);
          } finally {
            // Reset the `emit` function after synchronous evaluation, because
            // we need the Domain functionality for the asynchronous bits.
            Domain.prototype.emit = origEmit;
          }

          return await syncResult;
        } catch (err) {
          // This is for browser/Compass
          this.revertState();
          throw err;
        }
    }
  }

  /**
   * Evaluates the input code and wraps the result with the type
   *
   * @param {function} originalEval - the javascript evaluator.
   * @param {String} input - user input.
   * @param {Context} context - the execution context.
   * @param {String} filename
   */
  public async customEval(originalEval, input, context, filename): Promise<ShellResult> {
    const evaluationResult = await this.innerEval(
      originalEval,
      input,
      context,
      filename
    );

    if (
      evaluationResult !== undefined &&
      evaluationResult !== null &&
      evaluationResult[shellApiType] !== undefined
    ) {
      return await evaluationResult[asShellResult]();
    }

    return { value: evaluationResult, type: null };
  }
}

export default ShellEvaluator;
