/* istanbul ignore file */
/* ^^^ we test the dist directly, so isntanbul can't calculate the coverage correctly */

/**
 * This proxy is needed as a workaround for the old electron verison "bug" where
 * due to the electron runtime being a chromium, not just node (even with
 * `ELECTRON_RUN_AS_NODE` enabled), SIGINT doesn't break code execution. This is
 * fixed in the later versions of electron/node but we are still on the older
 * one, we have to have this proxy in place
 *
 * @todo as soon as we update electron version in compass, we can get rid of
 * this part of the worker runtime as it becomes redundant
 *
 * @see {@link https://github.com/nodejs/node/pull/36344}
 */

import { once } from 'events';
import { SHARE_ENV, Worker } from 'worker_threads';
import { exposeAll, createCaller } from './rpc';

/**
 * The source has to be inlined to allow the runtime to be bundled in a single
 * file when used by compass shell
 */
import workerRuntimeSrc from 'inline-entry-loader!./worker-runtime';

const workerProcess = new Worker(workerRuntimeSrc, {
  eval: true,
  env: SHARE_ENV
});

const workerReadyPromise = new Promise(async(resolve) => {
  const [message] = await once(workerProcess, 'message');
  if (message === 'ready') {
    resolve(true);
  }
});

const worker = createCaller(
  ['init', 'evaluate', 'getCompletions'],
  workerProcess
);

function waitForWorkerReadyProxy<T extends Function>(fn: T): T {
  return new Proxy(fn, {
    async apply(target, thisArg, argumentsList) {
      await workerReadyPromise;
      return target.call(thisArg, ...Array.from(argumentsList));
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
  ['onPrint', 'onPrompt', 'toggleTelemetry', 'onClearCommand', 'onExit'],
  process
);

exposeAll(evaluationListener, workerProcess);
