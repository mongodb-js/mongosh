import { Completion } from './autocompleter/autocompleter';
import { ServiceProvider } from '@mongosh/service-provider-core';
import { ShellApiAutocompleter } from './autocompleter/shell-api-autocompleter';
import { Interpreter, InterpreterEnvironment } from './interpreter';
import { Runtime } from './runtime';
import { EventEmitter } from 'events';
import { ShellInternalState, ShellResult } from '@mongosh/shell-api';

import { ShellEvaluator, EvaluationListener } from '@mongosh/shell-evaluator';
import type { MongoshBus } from '@mongosh/types';

/**
 * This class is the core implementation for a runtime which is not isolated
 * from the environment of the presentation layer.
 *
 * This means that the interaction between the runtime and the execution context (
 * service provider, autocompleter, ...), can happen through direct method
 * calls rather than requiring event emitter bridges or RPC.
 */
export class OpenContextRuntime implements Runtime {
  private interpreter: Interpreter;
  private interpreterEnvironment: InterpreterEnvironment;
  private autocompleter: ShellApiAutocompleter | null = null;
  private shellEvaluator: ShellEvaluator;
  private internalState: ShellInternalState;
  private evaluationListener: EvaluationListener | null = null;

  constructor(
    serviceProvider: ServiceProvider,
    interpreterEnvironment: InterpreterEnvironment,
    messageBus?: MongoshBus
  ) {
    this.interpreterEnvironment = interpreterEnvironment;
    this.internalState = new ShellInternalState(serviceProvider, messageBus || new EventEmitter());
    this.shellEvaluator = new ShellEvaluator(this.internalState);
    this.internalState.setCtx(this.interpreterEnvironment.getContextObject());
    this.interpreter = new Interpreter(this.interpreterEnvironment);
  }

  async getCompletions(code: string): Promise<Completion[]> {
    if (!this.autocompleter) {
      await this.internalState.fetchConnectionInfo();
      this.autocompleter = new ShellApiAutocompleter(this.internalState.getAutocompleteParameters());
    }

    return this.autocompleter.getCompletions(code);
  }

  async evaluate(code: string): Promise<ShellResult> {
    const evalFn = this.interpreter.evaluate.bind(this.interpreter);
    return await this.shellEvaluator.customEval(
      evalFn,
      code,
      this.interpreterEnvironment.getContextObject(),
      ''
    );
  }

  setEvaluationListener(listener: EvaluationListener): EvaluationListener | null {
    const prev = this.evaluationListener;
    this.evaluationListener = listener;
    this.internalState.setEvaluationListener(listener);
    return prev;
  }
}
