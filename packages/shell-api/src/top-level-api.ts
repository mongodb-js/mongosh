import ShellApi from './shell-api';

class TopLevelApi extends ShellApi {
  /**
   * Returns true if a value is a shell api type
   *
   * @param {any} evaluationResult - The result of evaluation
   */
  private isShellApiType(evaluationResult: any): boolean {
    return evaluationResult &&
      typeof evaluationResult.shellApiType === 'function' &&
      typeof evaluationResult.toReplString === 'function';
  }

  /**
   * Checks for linux-style commands then evaluates input using originalEval.
   *
   * @param {function} originalEval - the javascript evaluator.
   * @param {String} input - user input.
   * @param {Context} context - the execution context.
   * @param {String} filename
   */
  private async innerEval(originalEval: any, input: string, context: any, filename: string) {
    const argv = input.trim().split(' ');
    const cmd = argv[0];
    argv.shift();
    switch (cmd) {
      case 'use':
        return this.use(argv[0]);
      case 'show':
        return this.show(argv[0]);
      case 'it':
        return this.it();
      case 'help':
        return this.help();
      case 'var':
        this._mapper.cursorAssigned = true;
      default: /* eslint no-fallthrough: 0 */
        const rewrittenInput = this._mapper.asyncWriter.compile(input);
        console.log('\x1b[36m%s\x1b[0m', `rewrote "${input.trim()}" to "${rewrittenInput.trim()}"`);
        return originalEval(rewrittenInput, context, filename);
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
  public async customEval(originalEval, input, context, filename) {
    const evaluationResult = await this.innerEval(
      originalEval,
      input,
      context,
      filename
    );

    if (this.isShellApiType(evaluationResult)) {
      return {
        type: evaluationResult.shellApiType(),
        value: await evaluationResult.toReplString()
      };
    }

    return { value: evaluationResult, type: null };
  }
}

export default TopLevelApi;
