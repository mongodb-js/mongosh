import AsyncWriter from '@mongosh/async-rewriter';
import Mapper from '@mongosh/mapper';
import { signatures, Help, ShellBson, toIterator } from '@mongosh/shell-api';
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

  /**
   * Checks for linux-style commands then evaluates input using originalEval.
   *
   * @param {function} originalEval - the javascript evaluator.
   * @param {String} input - user input.
   * @param {Context} context - the execution context.
   * @param {String} filename
   */
  private innerEval(originalEval: any, input: string, context: any, filename: string, cb: Function): void {
    const argv = input.trim().replace(/;$/, '').split(' ');
    const cmd = argv[0];
    argv.shift();
    switch (cmd) {
      case 'use':
        return cb(null, this.mapper.use(argv[0]));
      case 'show':
        return cb(null, this.mapper.show(argv[0]));
      case 'it':
        return cb(null, this.mapper.it());
      case 'help':
        return cb(null, this.help());
      case 'enableTelemetry()':
        if (this.container) {
          return cb(null, this.container.toggleTelemetry(true));
        }
        return cb(null, undefined);
      case 'disableTelemetry()':
        if (this.container) {
          return cb(null, this.container.toggleTelemetry(false));
        }
        return cb(null, undefined);
      default:
        this.saveState();
        const rewrittenInput = this.asyncWriter.process(input);

        this.bus.emit(
          'mongosh:rewritten-async-input',
          { original: input.trim(), rewritten: rewrittenInput.trim() }
        );
        originalEval(rewrittenInput, context, filename, cb);
    }
  }

  /**
   * Evaluates the input code and wraps the result with the type
   *
   * @param {function} originalEval - the javascript evaluator.
   * @param {String} input - user input.
   * @param {Context} context - the execution context.
   * @param {String} filename
   * @param {Function} callback
   */
  public customEval(originalEval, input, context, filename, callback): void {
    const cb = (err, evaluationResult/*Promise*/) => {
      if (err) {
        this.revertState();
        callback(err);
      } else {
        // Promise.resolve(evaluationResultPromise).then((evaluationResult) => {
          if (this.isShellApiType(evaluationResult)) {
            Promise.resolve(evaluationResult.toReplString()).then((replString) => {
              callback(null, {
                type: evaluationResult.shellApiType(),
                value: replString
              });
            });
          } else {
            callback(null, { value: evaluationResult, type: null });
          }
        // }).catch((err2) => {
        //   callback(err2);
        // });
      }
    };

    try {
      this.innerEval(
        originalEval,
        input,
        context,
        filename,
        cb
      );
    } catch (err) {
      callback(err);
    }
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
    contextObject.toIterator = toIterator;
    contextObject.print = async(arg) => {
      if (arg.toReplString) {
        console.log(await arg.toReplString());
      } else {
        console.log(arg);
      }
    };
    contextObject.printjson = contextObject.print;
    Object.assign(contextObject, ShellBson);

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
