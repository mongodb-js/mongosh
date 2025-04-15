import type { Completion } from './autocompleter/autocompleter';
import type { ServiceProvider } from '@mongosh/service-provider-core';
import { ShellApiAutocompleter } from './autocompleter/shell-api-autocompleter';
import type {
  Runtime,
  RuntimeEvaluationResult,
  RuntimeEvaluationListener,
} from './runtime';
import { EventEmitter } from 'events';
import { ShellInstanceState } from '@mongosh/shell-api';

import { ShellEvaluator } from '@mongosh/shell-evaluator';
import type { MongoshBus } from '@mongosh/types';

export type ContextValue = any;

export interface InterpreterEnvironment {
  sloppyEval(code: string): ContextValue;
  getContextObject(): ContextValue;
}

/**
 * This class is the core implementation for a runtime which is not isolated
 * from the environment of the presentation layer.
 *
 * This means that the interaction between the runtime and the execution context (
 * service provider, autocompleter, ...), can happen through direct method
 * calls rather than requiring event emitter bridges or RPC.
 */
export class OpenContextRuntime implements Runtime {
  private interpreterEnvironment: InterpreterEnvironment;
  private autocompleter: ShellApiAutocompleter | null = null;
  private shellEvaluator: ShellEvaluator;
  private instanceState: ShellInstanceState;
  private evaluationListener: RuntimeEvaluationListener | null = null;
  private updatedConnectionInfoPromise: Promise<unknown> | null = null;

  constructor(
    serviceProvider: ServiceProvider,
    interpreterEnvironment: InterpreterEnvironment,
    messageBus?: MongoshBus
  ) {
    this.interpreterEnvironment = interpreterEnvironment;
    this.instanceState = new ShellInstanceState(
      serviceProvider,
      messageBus || new EventEmitter()
    );
    this.instanceState.isInteractive = true;
    this.shellEvaluator = new ShellEvaluator(this.instanceState);
    this.instanceState.setCtx(this.interpreterEnvironment.getContextObject());
  }

  async getCompletions(code: string): Promise<Completion[]> {
    if (!this.autocompleter) {
      this.autocompleter = new ShellApiAutocompleter(
        this.instanceState.getAutocompleteParameters()
      );
      this.updatedConnectionInfoPromise ??=
        this.instanceState.fetchConnectionInfo();
      await this.updatedConnectionInfoPromise;
    }

    return this.autocompleter.getCompletions(code);
  }

  async evaluate(code: string): Promise<RuntimeEvaluationResult> {
    const evalFn = this.interpreterEnvironment.sloppyEval.bind(
      this.interpreterEnvironment
    );
    const { type, printable, source } = await this.shellEvaluator.customEval(
      evalFn,
      code,
      this.interpreterEnvironment.getContextObject(),
      ''
    );
    return { type, printable, source };
  }

  setEvaluationListener(
    listener: RuntimeEvaluationListener
  ): RuntimeEvaluationListener | null {
    const prev = this.evaluationListener;
    this.evaluationListener = listener;
    this.instanceState.setEvaluationListener(listener);
    return prev;
  }

  async getShellPrompt(): Promise<string> {
    this.updatedConnectionInfoPromise ??=
      this.instanceState.fetchConnectionInfo();
    await this.updatedConnectionInfoPromise;
    return await this.instanceState.getDefaultPrompt();
  }
}
