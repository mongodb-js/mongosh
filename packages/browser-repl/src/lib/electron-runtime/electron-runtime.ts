import {
  setupEvaluationContext
} from '../runtime-helpers/setup-evaluation-context';

import {
  Interpreter,
  EvaluationResult,
} from '../interpreter';

import {
  ElectronInterpreterEnvironment
} from './electron-interpreter-environment';

export class ElectronRuntime {
  private interpreter: Interpreter;
  private serviceProvider: object;

  constructor(serviceProvider: object) {
    this.serviceProvider = serviceProvider;

    const context = {};

    setupEvaluationContext(
      context,
      this.serviceProvider
    );

    const environment = new ElectronInterpreterEnvironment(context);
    this.interpreter = new Interpreter(environment);
  }

  async evaluate(code: string): Promise<EvaluationResult> {
    return await this.interpreter.evaluate(code);
  }
}
