/* eslint-disable complexity */
import {
  ShellInternalState,
  toShellResult,
  ShellResult,
  EvaluationListener
} from '@mongosh/shell-api';

type EvaluationFunction = (input: string, context: object, filename: string) => Promise<any>;

import { HIDDEN_COMMANDS, removeCommand } from '@mongosh/history';

type ResultHandler<EvaluationResultType> = (value: any) => EvaluationResultType | Promise<EvaluationResultType>;
class ShellEvaluator<EvaluationResultType = ShellResult> {
  private internalState: ShellInternalState;
  private resultHandler: ResultHandler<EvaluationResultType>;

  constructor(internalState: ShellInternalState, resultHandler: ResultHandler<EvaluationResultType> = toShellResult as any) {
    this.internalState = internalState;
    this.resultHandler = resultHandler;
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
  private async innerEval(originalEval: EvaluationFunction, input: string, context: object, filename: string): Promise<any> {
    const { shellApi } = this.internalState;
    const argv = input.trim().replace(/;$/, '').split(/\s+/g);
    const cmd = argv.shift() as keyof typeof shellApi;
    if (shellApi[cmd]?.isDirectShellCommand) {
      return shellApi[cmd](...argv);
    }

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

  /**
   * Evaluates the input code and wraps the result with the type
   *
   * @param {function} originalEval - the javascript evaluator.
   * @param {String} input - user input.
   * @param {Context} context - the execution context.
   * @param {String} filename
   */
  public async customEval(originalEval: EvaluationFunction, input: string, context: object, filename: string): Promise<EvaluationResultType> {
    const evaluationResult = await this.innerEval(
      originalEval,
      input,
      context,
      filename
    );

    return await this.resultHandler(evaluationResult);
  }
}

export {
  ShellResult,
  ShellEvaluator,
  EvaluationListener
};
