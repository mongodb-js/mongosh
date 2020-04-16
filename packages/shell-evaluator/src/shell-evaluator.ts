import AsyncWriter from '@mongosh/async-rewriter';
import Mapper from '@mongosh/mapper';
import { signatures, Help } from '@mongosh/shell-api';
import { ServiceProvider } from '@mongosh/service-provider-core';

interface Bus {
  emit(...args: any[]): void;
}

interface Container {
  toggleTelemetry(boolean): void;
}

interface Result {
  type: string;
  value: any;
}

class ShellEvaluator {
  private mapper: Mapper;
  private asyncWriter: AsyncWriter;
  private bus: Bus;
  private container: Container;
  constructor(
    serviceProvider: ServiceProvider,
    bus: Bus,
    container?: Container
  ) {
    this.mapper = new Mapper(serviceProvider, bus);
    this.asyncWriter = new AsyncWriter(signatures);
    this.bus = bus;
    this.container = container;
  }

  public toReplString(): string {
    return JSON.parse(JSON.stringify(this));
  }

  public shellApiType(): string {
    return 'ShellEvaluator';
  }

  public help(): Help {
    this.bus.emit('mongosh:help');
    return new Help({ 'help': 'shell-api.help.description', 'docs': 'https://docs.mongodb.com/manual/reference/method', 'attr': [{ 'name': 'use', 'description': 'shell-api.help.help.use' }, { 'name': 'it', 'description': 'shell-api.help.help.it' }, { 'name': '.exit', 'description': 'shell-api.help.help.exit' }, { 'name': 'show', 'description': 'shell-api.help.help.show-dbs' }] });
  }
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
  private async innerEval(originalEval: any, input: string, context: any, filename: string): Promise<any> {
    const argv = input.trim().split(' ');
    const cmd = argv[0];
    argv.shift();
    switch (cmd) {
      case 'use':
        return this.mapper.use(argv[0]);
      case 'show':
        return this.mapper.show(argv[0]);
      case 'it':
        return this.mapper.it();
      case 'help':
        return this.help();
      case 'enableTelemetry':
        if (this.container) {
          this.container.toggleTelemetry(true);
        }
        return;
      case 'disableTelemetry':
        if (this.container) {
          this.container.toggleTelemetry(false);
        }
        return;
      default:
        const rewrittenInput = this.asyncWriter.compile(input);
        this.bus.emit(
          'mongosh:rewrittenAsyncInput',
          { original: input.trim(), rewritten: rewrittenInput.trim() }
        );
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
  public async customEval(originalEval, input, context, filename): Promise<Result> {
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

  /**
   * Prepare a `contextObject` as global context and set it as context
   * for the mapper. Add each attribute to the AsyncRewriter also.
   *
   * The `contextObject` is prepared so that it can be used as global object
   * for the repl evaluationi.
   *
   * @note The `contextObject` is mutated, it will retain all of its existing
   * properties but also have the global shell api objects and functions.
   *
   * @param {Object} - contextObject an object used as global context.
   */
  setCtx(contextObject: any): void {
    // Add API methods for VSCode and scripts
    contextObject.use = this.mapper.use.bind(this.mapper);
    contextObject.show = this.mapper.show.bind(this.mapper);
    contextObject.it = this.mapper.it.bind(this.mapper);
    contextObject.help = this.help.bind(this);

    // Add global shell objects
    contextObject.db = this.mapper.databases.test;
    this.asyncWriter.symbols.initializeApiObjects({ db: signatures.Database });

    // Update mapper and log
    this.mapper.context = contextObject;
    this.bus.emit(
      'mongosh:setCtx',
      { method: 'setCtx', arguments: { db: this.mapper.context.db } }
    );
  }
}

export default ShellEvaluator;
