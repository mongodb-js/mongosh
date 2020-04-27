import { Completion } from './autocompleter/autocompleter';
import { ServiceProvider } from '@mongosh/service-provider-core';
import { ShellApiAutocompleter } from './autocompleter/shell-api-autocompleter';
import { Interpreter, InterpreterEnvironment, EvaluationResult } from './interpreter';
import { Runtime } from './runtime';
import { EventEmitter } from 'events';

import ShellEvaluator from '@mongosh/shell-evaluator';

/**
 * This class is the core implementation for a runtime which is not isolated
 * from the environment of the presentation layer.
 *
 * This means that the interaction between the runtime and the execution context (
 * service provider, autocompleter, ...), can happen through direct method
 * calls rather than requiring event emitter bridges or RPC.
 */
export class OpenContextRuntime implements Runtime {
  private serviceProvider: ServiceProvider;
  private interpreter: Interpreter;
  private interpreterEnvironment: InterpreterEnvironment;
  private autocompleter: ShellApiAutocompleter;
  private shellEvaluator: ShellEvaluator;

  constructor(
    serviceProvider: ServiceProvider,
    interpreterEnvironment: InterpreterEnvironment
  ) {
    this.serviceProvider = serviceProvider;
    this.interpreterEnvironment = interpreterEnvironment;
    this.shellEvaluator = new ShellEvaluator(serviceProvider, new EventEmitter());
    this.shellEvaluator.setCtx(this.interpreterEnvironment.getContextObject());
    this.interpreter = new Interpreter(this.interpreterEnvironment);
  }

  async getCompletions(code: string): Promise<Completion[]> {
    if (!this.autocompleter) {
      const serverVersion = await this.serviceProvider.buildInfo().version;
      this.autocompleter = new ShellApiAutocompleter(serverVersion);
    }

    return this.autocompleter.getCompletions(code);
  }

  async evaluate(code: string): Promise<EvaluationResult> {
    const evalFn = this.interpreter.evaluate.bind(this.interpreter);
    const result = await this.shellEvaluator.customEval(
      evalFn,
      code,
      this.interpreterEnvironment.getContextObject(),
      ''
    );
    return {
      shellApiType: result.type,
      value: result.value
    };
  }
}
