/* istanbul ignore file */
/* ^^^ we test the dist directly, so isntanbul can't calculate the coverage correctly */

import { parentPort, isMainThread } from 'worker_threads';
import {
  Runtime,
  RuntimeEvaluationListener,
  RuntimeEvaluationResult
} from '@mongosh/browser-runtime-core';
import { ElectronRuntime } from '@mongosh/browser-runtime-electron';
import type {
  ServiceProvider
} from '@mongosh/service-provider-core';
import {
  CompassServiceProvider,
  DevtoolsConnectOptions
} from '@mongosh/service-provider-server';
import { exposeAll, createCaller } from './rpc';
import { serializeEvaluationResult } from './serializer';
import type { MongoshBus } from '@mongosh/types';
import { Lock, UNLOCKED } from './lock';
import { runInterruptible, InterruptHandle } from 'interruptor';

if (!parentPort || isMainThread) {
  throw new Error('Worker runtime can be used only in a worker thread');
}

let runtime: Runtime | null = null;
let provider: ServiceProvider | null = null;

const evaluationLock = new Lock();

function ensureRuntime(methodName: string): Runtime {
  if (!runtime) {
    throw new Error(
      `Can\'t call ${methodName} before shell runtime is initiated`
    );
  }

  return runtime;
}

export type WorkerRuntimeEvaluationListener = RuntimeEvaluationListener & {
  onRunInterruptible(handle: InterruptHandle | null): void;
};

const evaluationListener = createCaller<WorkerRuntimeEvaluationListener>(
  [
    'onPrint',
    'onPrompt',
    'getConfig',
    'setConfig',
    'resetConfig',
    'validateConfig',
    'listConfigOptions',
    'onClearCommand',
    'onExit',
    'onRunInterruptible'
  ],
  parentPort
);

const messageBus: MongoshBus = Object.assign(
  createCaller(['emit'], parentPort),
  {
    on() {
      throw new Error("Can't call `on` method on worker runtime MongoshBus");
    },
    once() {
      throw new Error("Can't call `once` method on worker runtime MongoshBus");
    }
  }
);

export type WorkerRuntime = Runtime & {
  init(
    uri: string,
    driverOptions?: DevtoolsConnectOptions,
    cliOptions?: { nodb?: boolean }
  ): Promise<void>;

  interrupt(): boolean;
};

const workerRuntime: WorkerRuntime = {
  async init(
    uri: string,
    driverOptions: DevtoolsConnectOptions = {},
    cliOptions: { nodb?: boolean } = {}
  ) {
    // XXX The types here work out fine, and tsc accepts this code
    // without 'as any'. However, since a change to the driver's
    // .find() method signature (https://github.com/mongodb/node-mongodb-native/commit/307d623ea597c5d89c548b6731bd692fec7a8047)
    // the webpack integration build fails with:
    // [tsl] ERROR in /home/addaleax/src/mongosh/packages/node-runtime-worker-thread/src/worker-runtime.ts(88,5)
    //       TS2589: Type instantiation is excessively deep and possibly infinite.
    // I could not figure out why exactly that was the case, so 'as any'
    // will have to do for now.
    provider = await (CompassServiceProvider as any).connect(
      uri,
      driverOptions,
      cliOptions,
      messageBus
    );
    runtime = new ElectronRuntime(provider as ServiceProvider, messageBus);
    runtime.setEvaluationListener(evaluationListener);
  },

  async evaluate(code) {
    if (evaluationLock.isLocked()) {
      throw new Error(
        "Can't run another evaluation while the previous is not finished"
      );
    }

    let interrupted = true;
    let evaluationPromise: void | Promise<RuntimeEvaluationResult>;
    const previousRequireCache = Object.keys(require.cache);

    try {
      evaluationPromise = runInterruptible((handle) => {
        try {
          // eslint-disable-next-line @typescript-eslint/no-floating-promises
          evaluationListener.onRunInterruptible(handle);
          return ensureRuntime('evaluate').evaluate(code);
        } finally {
          interrupted = false;
        }
      });
    } finally {
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      evaluationListener.onRunInterruptible(null);

      if (interrupted) {
        // If we were interrupted, we can't know which newly require()ed modules
        // have successfully been loaded, so we restore everything to its
        // previous state.
        for (const key of Object.keys(require.cache)) {
          if (!previousRequireCache.includes(key)) {
            delete require.cache[key];
          }
        }
      }
    }

    let result: void | RuntimeEvaluationResult | UNLOCKED;

    try {
      result = await Promise.race([
        evaluationPromise,
        evaluationLock.lock()
      ]);
    } finally {
      evaluationLock.unlock();
    }

    if (evaluationLock.isUnlockToken(result)) {
      throw new Error('Async script execution was interrupted');
    }

    if (typeof result === 'undefined' || interrupted === true) {
      throw new Error('Script execution was interrupted');
    }

    return serializeEvaluationResult(result);
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
  },

  interrupt() {
    return evaluationLock.unlock();
  }
};

// We expect the amount of listeners to be more than the default value of 10 but
// probably not more than ~25 (all exposed methods on
// ChildProcessEvaluationListener and ChildProcessMongoshBus + any concurrent
// in-flight calls on ChildProcessRuntime) at once
parentPort.setMaxListeners(25);

exposeAll(workerRuntime, parentPort);

process.nextTick(() => {
  if (parentPort) {
    parentPort.postMessage('ready');
  }
});
