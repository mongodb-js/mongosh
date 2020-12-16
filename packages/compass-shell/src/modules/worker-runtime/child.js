import { SHARE_ENV, Worker } from 'worker_threads';
import { exposeAll, createCaller } from './rpc';

import workerSrc from 'inline-entry-loader!./worker';

const workerProcess = new Worker(workerSrc, { eval: true, env: SHARE_ENV });

const worker = createCaller(
  ['init', 'evaluate', 'getCompletions', 'ping'],
  workerProcess
);

const evaluationListener = createCaller(
  ['onPrint', 'onPrompt', 'toggleTelemetry'],
  process
);

exposeAll(worker, process);
exposeAll(evaluationListener, workerProcess);

workerProcess.once('message', () => {
  process.nextTick(() => {
    process.send('ready');
  });
});
