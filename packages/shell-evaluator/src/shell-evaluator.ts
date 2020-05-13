import AsyncWriter from '@mongosh/async-rewriter';
import {
  signatures,
  Help,
  ShellBson,
  toIterator,
  Mongo,
  InternalState,
  CursorIterationResult,
} from '@mongosh/shell-api2';

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
  private asyncWriter: AsyncWriter;
  private bus: Bus;
  private container: Container;
  private internalState: InternalState;
  constructor(
    uri: string,
    options: any,
    bus: Bus,
    container?: Container
  ) {
    this.internalState = new InternalState(bus);
    this.internalState.initialMongo = new Mongo(uri, options, this.internalState);
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
    return new Help({
      help: 'shell-api.help.description',
      docs: 'https://docs.mongodb.com/manual/reference/method',
      attr: [
        {
          name: 'use',
          description: 'shell-api.help.help.use'
        },
        {
          name: 'it',
          description: 'shell-api.help.help.it'
        },
        {
          name: 'show databases',
          description: 'shell-api.help.help.show-databases'
        },
        {
          name: 'show collections',
          description: 'shell-api.help.help.show-collections'
        },
        {
          name: '.exit',
          description: 'shell-api.help.help.exit'
        }
      ]
    });
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

  public revertState(): void {
    this.asyncWriter.symbols.revertState();
  }

  public saveState(): void {
    this.asyncWriter.symbols.saveState();
  }

  async it(): Promise<any> {
    if (!this.internalState.currentCursor) {
      return new CursorIterationResult();
    }
    return await this.internalState.currentCursor.it();
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
        return this.internalState.currentMongo.use(argv[0]);
      case 'show':
        return this.internalState.currentMongo.show(argv[0]);
      case 'it':
        return this.it();
      case 'help':
        return this.help();
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
        const rewrittenInput = this.asyncWriter.compile(input);
        this.bus.emit(
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
    this.internalState.context = contextObject;
    // Add API methods for VSCode and scripts
    contextObject.use = this.internalState.currentMongo.use.bind(this.internalState.currentMongo);
    contextObject.show = this.internalState.currentMongo.show.bind(this.internalState.currentMongo);
    contextObject.it = this.it.bind(this);
    contextObject.help = this.help.bind(this);
    contextObject.toIterator = toIterator;
    Object.assign(contextObject, ShellBson);

    // Add global shell objects
    contextObject.db = this.internalState.currentMongo.databases.test;
    this.asyncWriter.symbols.initializeApiObjects({ db: signatures.Database });

    // Update mapper and log
    this.bus.emit(
      'mongosh:setCtx',
      { method: 'setCtx', arguments: { db: contextObject.db } }
    );
  }
}

export default ShellEvaluator;
