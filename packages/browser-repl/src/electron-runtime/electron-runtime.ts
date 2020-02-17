import {
  ElectronInterpreterEnvironment
} from './electron-interpreter-environment';

import {
  Runtime,
  EvaluationResult
} from '../components/runtime';
import { OpenContextRuntime } from '../runtime-helpers/open-context-runtime';
import { ServiceProvider } from 'mongosh-service-provider-core';
import { Completion } from '../autocompleter/autocompleter';

export class ElectronRuntime implements Runtime {
  private openContextRuntime: OpenContextRuntime;

  constructor(serviceProvider: ServiceProvider) {
    this.openContextRuntime = new OpenContextRuntime(
      serviceProvider,
      new ElectronInterpreterEnvironment({})
    );
  }

  async evaluate(code: string): Promise<EvaluationResult> {
    return await this.openContextRuntime.evaluate(code);
  }

  async getCompletions(code: string): Promise<Completion[]> {
    return await this.openContextRuntime.getCompletions(code);
  }
}
