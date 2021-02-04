/* istanbul ignore file */
/* ^^^ we test the dist directly, so isntanbul can't calculate the coverage correctly */

import { parentPort, isMainThread } from 'worker_threads';
import {
  Runtime,
  RuntimeEvaluationListener
} from '@mongosh/browser-runtime-core';
import { ElectronRuntime } from '@mongosh/browser-runtime-electron';
import {
  MongoClientOptions,
  ServiceProvider
} from '@mongosh/service-provider-core';
import { CompassServiceProvider } from '@mongosh/service-provider-server';
import { exposeAll, createCaller } from './rpc';
import { serializeEvaluationResult } from './serializer';
import { MongoshBus } from '@mongosh/types';

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

const evaluationListener = createCaller<RuntimeEvaluationListener>(
  ['onPrint', 'onPrompt', 'toggleTelemetry', 'onClearCommand', 'onExit'],
  parentPort
);

const messageBus: MongoshBus = Object.assign(
  createCaller(['emit'], parentPort),
  {
    on() {
      throw new Error("Can't call `on` method on worker runtime MongoshBus");
    }
  }
);

export type WorkerRuntime = Runtime & {
  init(
    uri: string,
    driverOptions?: MongoClientOptions,
    cliOptions?: { nodb?: boolean }
  ): Promise<void>;
};

const workerRuntime: WorkerRuntime = {
  async init(
    uri: string,
    driverOptions: MongoClientOptions = {},
    cliOptions: { nodb?: boolean } = {}
  ) {
    provider = await CompassServiceProvider.connect(
      uri,
      driverOptions,
      cliOptions
    );
    runtime = new ElectronRuntime(provider, messageBus);
    runtime.setEvaluationListener(evaluationListener);
  },

  async evaluate(code) {
    return serializeEvaluationResult(
      await ensureRuntime('evaluate').evaluate(code)
    );
  },

  async getCompletions(code) {
    return ensureRuntime('getCompletions').getCompletions(code);
  },

  async getShellPrompt() {
    return ensureRuntime('getShellPrompt').getShellPrompt();
  },

  setEvaluationListener() {
    throw new Error(
      'Evaluation listener can not be directly set on the worker runtime'
    );
  }
};

// We expect the amount of listeners to be more than the default value of 10 but
// probably not more than ~15 (all exposed methods on
// ChildProcessEvaluationListener and ChildProcessMongoshBus + any concurrent
// in-flight calls on ChildProcessRuntime) at once
parentPort.setMaxListeners(15);

exposeAll(workerRuntime, parentPort);

process.nextTick(() => {
  if (parentPort) {
    parentPort.postMessage('ready');
  }
});
