/* istanbul ignore file */
/* ^^^ we test the dist directly, so isntanbul can't calculate the coverage correctly */

import { parentPort, isMainThread } from 'worker_threads';
import { Runtime } from '@mongosh/browser-runtime-core';
import { ElectronRuntime } from '@mongosh/browser-runtime-electron';
import {
  MongoClientOptions,
  ServiceProvider
} from '@mongosh/service-provider-core';
import { CliServiceProvider } from '@mongosh/service-provider-server';
import { EvaluationListener } from '@mongosh/shell-evaluator';
import { exposeAll, createCaller } from './rpc';

if (!parentPort || isMainThread) {
  throw new Error('Worker runtime can be used only in a worker thread');
}

let runtime: Runtime | null = null;
let provider: ServiceProvider | null = null;

function ensureRuntime(methodName: string): Runtime {
  if (!runtime) {
    throw new Error(
      `Can\'t call ${methodName} before shell runtime is initiated`
    );
  }

  return runtime;
}

const evaluationListener = createCaller<EvaluationListener>(
  ['onPrint', 'onPrompt', 'toggleTelemetry', 'onClearCommand', 'onExit'],
  parentPort
);

export type WorkerRuntime = Runtime & {
  init(
    uri: string,
    driverOptions: MongoClientOptions,
    cliOptions: { nodb?: boolean }
  ): Promise<void>;
};

const workerRuntime: WorkerRuntime = {
  async init(uri, driverOptions = {}, cliOptions = {}) {
    provider = await CliServiceProvider.connect(uri, driverOptions, cliOptions);
    runtime = new ElectronRuntime(
      provider /** , TODO: `messageBus` support for telemetry in a separate ticket */
    );

    runtime.setEvaluationListener(evaluationListener);
  },

  async evaluate(code) {
    return ensureRuntime('evaluate').evaluate(code);
  },

  async getCompletions(code) {
    return ensureRuntime('getCompletions').getCompletions(code);
  },

  setEvaluationListener() {
    throw new Error(
      'Evaluation listener can not be directly set on the worker runtime'
    );
  }
};

exposeAll(workerRuntime, parentPort);

process.nextTick(() => {
  if (parentPort) {
    parentPort.postMessage('ready');
  }
});
