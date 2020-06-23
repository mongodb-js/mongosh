/* eslint-disable @typescript-eslint/camelcase */
import {
  ElectronInterpreterEnvironment
} from './electron-interpreter-environment';

import {
  Runtime,
  OpenContextRuntime,
  Completion
} from '@mongosh/browser-runtime-core';

import { ServiceProvider } from '@mongosh/service-provider-core';
import { ShellResult } from '@mongosh/shell-api';

declare const __webpack_require__: any;
declare const __non_webpack_require__: any;

export class ElectronRuntime implements Runtime {
  private openContextRuntime: OpenContextRuntime;

  constructor(serviceProvider: ServiceProvider, messageBus?: {
    emit: (eventName: string, ...args: any[]) => void;
  }) {
    // NOTE:
    //
    // This is necessary for client code bundling this library with
    // webpack.
    //
    // Webpack will replace require with its own implementation, and that would
    // not necessarily have access to the node modules available in node
    // (depends on the target configuration).
    //
    // IMPORTANT: as it cannot be easily tested be aware of this bug before
    // changing this line: https://github.com/webpack/webpack/issues/5939 (it
    // seems that checking for `typeof __non_webpack_require__` does not work).
    //
    const requireFunc = typeof __webpack_require__ === 'function' ? __non_webpack_require__ : require;

    this.openContextRuntime = new OpenContextRuntime(
      serviceProvider,
      new ElectronInterpreterEnvironment({ require: requireFunc }),
      messageBus
    );
  }

  async evaluate(code: string): Promise<ShellResult> {
    return await this.openContextRuntime.evaluate(code);
  }

  async getCompletions(code: string): Promise<Completion[]> {
    return await this.openContextRuntime.getCompletions(code);
  }
}
