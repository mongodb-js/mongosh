import {
  ShellInternalState,
  toShellResult,
  ShellResult,
  EvaluationListener
} from '@mongosh/shell-api';
import AsyncWriter from '@mongosh/async-rewriter2';

type EvaluationFunction = (input: string, context: object, filename: string) => Promise<any>;

import { HIDDEN_COMMANDS, removeCommand } from '@mongosh/history';

type ResultHandler<EvaluationResultType> = (value: any) => EvaluationResultType | Promise<EvaluationResultType>;
class ShellEvaluator<EvaluationResultType = ShellResult> {
  private internalState: ShellInternalState;
  private resultHandler: ResultHandler<EvaluationResultType>;
  private hasAppliedAsyncWriterRuntimeSupport = true;
  private asyncWriter: AsyncWriter;

  constructor(internalState: ShellInternalState, resultHandler: ResultHandler<EvaluationResultType> = toShellResult as any) {
    this.internalState = internalState;
    this.resultHandler = resultHandler;
    this.asyncWriter = new AsyncWriter();
    this.hasAppliedAsyncWriterRuntimeSupport = false;
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

    let rewrittenInput = this.asyncWriter.process(input);

    const hiddenCommands = RegExp(HIDDEN_COMMANDS, 'g');
    if (!hiddenCommands.test(input) && !hiddenCommands.test(rewrittenInput)) {
      this.internalState.messageBus.emit(
        'mongosh:evaluate-input',
        { input: removeCommand(input.trim()) }
      );
    }

    if (!this.hasAppliedAsyncWriterRuntimeSupport) {
      this.hasAppliedAsyncWriterRuntimeSupport = true;
      const supportCode = this.asyncWriter.runtimeSupportCode();
      // Eval twice: We need the modified prototypes to be present in both
      // the evaluation context and the current one, because e.g. the value of
      // db.test.find().toArray() is a Promise for an Array from the context
      // in which the shell-api package lives and not from the context inside
      // the REPL (i.e. `db.test.find().toArray() instanceof Array` is `false`).
      // eslint-disable-next-line no-eval
      eval(supportCode);
      rewrittenInput = supportCode + ';\n' + rewrittenInput;
    }

    return await originalEval(rewrittenInput, context, filename);
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
