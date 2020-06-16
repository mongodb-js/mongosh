import {
  ShellInternalState,
  isShellApi
} from '@mongosh/shell-api';

interface Container {
  toggleTelemetry(boolean): void;
}

interface Result {
  type: string;
  value: any;
}

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
        return this.internalState.shellApi.show(argv[0]);
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

        this.internalState.messageBus.emit(
          'mongosh:rewritten-async-input',
          { original: input.trim(), rewritten: rewrittenInput.trim() }
        );
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
  public async customEval(originalEval, input, context, filename): Promise<Result> {
    const evaluationResult = await this.innerEval(
      originalEval,
      input,
      context,
      filename
    );

    if (evaluationResult[isShellApi]) {
      return await evaluationResult.asShellResult();
    }

    return { value: evaluationResult, type: null };
  }
}

export default ShellEvaluator;
