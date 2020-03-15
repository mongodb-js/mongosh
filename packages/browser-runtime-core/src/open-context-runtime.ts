import { Completion } from './autocompleter/autocompleter';
import { ServiceProvider } from 'mongosh-service-provider-core';
import { ShellApiAutocompleter } from './autocompleter/shell-api-autocompleter';
import { Interpreter, InterpreterEnvironment, EvaluationResult } from './interpreter';
import { Runtime } from './runtime';

import Mapper from 'mongosh-mapper';

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
  private autocompleter: ShellApiAutocompleter;

  constructor(serviceProvider: ServiceProvider, interpreterEnvironment: InterpreterEnvironment) {
    this.serviceProvider = serviceProvider;

    this.setupEvaluationContext(
      interpreterEnvironment.getContextObject(),
      serviceProvider
    );

    this.interpreter = new Interpreter(interpreterEnvironment);
  }

  async getCompletions(code: string): Promise<Completion[]> {
    if (!this.autocompleter) {
      const serverVersion = await this.serviceProvider.getServerVersion();
      this.autocompleter = new ShellApiAutocompleter(serverVersion);
    }

    return this.autocompleter.getCompletions(code);
  }

  async evaluate(code: string): Promise<EvaluationResult> {
    return await this.interpreter.evaluate(code);
  }

  private setupEvaluationContext(context: object, serviceProvider: object): void {
    const mapper = new Mapper(serviceProvider);
    mapper.setCtx(context);
  }
}
