/* eslint-disable complexity */
import {
  ShellInternalState,
  toShellResult,
  ShellResult,
  EvaluationListener
} from '@mongosh/shell-api';

interface Container {
  toggleTelemetry(enable: boolean): any;
}

type EvaluationFunction = (input: string, context: object, filename: string) => Promise<any>;

import { HIDDEN_COMMANDS, removeCommand } from '@mongosh/history';

class ShellEvaluator {
  private internalState: ShellInternalState;
  private container?: Container;
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

  public setEvaluationListener(listener: EvaluationListener): void {
    this.internalState.setEvaluationListener(listener);
  }

  /**
   * Checks for linux-style commands then evaluates input using originalEval.
   *
   * @param {function} originalEval - the javascript evaluator.
   * @param {String} input - user input.
   * @param {Context} context - the execution context.
   * @param {String} filename
   */
  private async innerEval(originalEval: EvaluationFunction, input: string, context: object, filename: string): Promise<any> {
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
        return await this.container?.toggleTelemetry(true);
      case 'disableTelemetry()':
        return await this.container?.toggleTelemetry(false);
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
        try {
          return await originalEval(rewrittenInput, context, filename);
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
  public async customEval(originalEval: EvaluationFunction, input: string, context: object, filename: string): Promise<ShellResult> {
    const evaluationResult = await this.innerEval(
      originalEval,
      input,
      context,
      filename
    );

    return await toShellResult(evaluationResult);
  }
}

export {
  ShellResult,
  ShellEvaluator,
  EvaluationListener
};
