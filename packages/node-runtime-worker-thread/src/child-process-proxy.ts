/**
 * This proxy is needed as a workaround for the old electron verison "bug" where
 * due to the electron runtime being a chromium, not real vm, SIGINT doesn't
 * break code execution. This is fixed in the later versions of electron/node
 * but we are still on the older one, we have to have this proxy in place
 *
 * @todo as soon as we update electron version in compass, we can get rid of
 * this part of the worker runtime as it becomes redundant
 *
 * @see {@link https://github.com/nodejs/node/pull/36344}
 */

import path from 'path';
import { once } from 'events';
import { SHARE_ENV, Worker } from 'worker_threads';
import { exposeAll, createCaller } from './rpc';

const workerRuntimeModulePath = path.resolve(__dirname, '..', 'lib', 'worker-runtime.js');

const workerProcess = new Worker(workerRuntimeModulePath, { env: SHARE_ENV });

const workerReadyPromise = new Promise(async resolve => {
  const [message] = await once(workerProcess, 'message');
  if (message === 'ready') {
    resolve(true);
  }
});

const worker = createCaller(
  ['init', 'evaluate', 'getCompletions', 'ping'] as const,
  workerProcess
);


function waitForWorkerReadyProxy<T extends Function>(fn: T): T {
  return new Proxy(fn, {
    async apply(target, thisArg, argumetsList) {
      await workerReadyPromise;
      return target.call(thisArg, ...Array.from(argumetsList));
    }
  });
}

// Every time parent process wants to request something from worker through
// proxy, we want to make sure worker process is ready
(Object.keys(worker) as (keyof typeof worker)[]).forEach((key) => {
  worker[key] = waitForWorkerReadyProxy(worker[key]);
});

exposeAll(worker, process);

const evaluationListener = createCaller(
  ['onPrint', 'onPrompt', 'toggleTelemetry'] as const,
  process
);

exposeAll(evaluationListener, workerProcess);
