import path from 'path';
import fs from 'fs';
// eslint-disable-next-line camelcase
import child_process from 'child_process';
import crypto from 'crypto';
import electron from 'electron';
import worker from 'inline-entry-loader!./worker';
import { createCaller, exposeAll } from './rpc';

function createChildFromSource(src) {
  const tmpFile = path.resolve(
    (electron.app || electron.remote.app).getPath('temp'),
    `worker-runtime-${crypto.randomBytes(32).toString('hex')}`
  );

  // eslint-disable-next-line no-sync
  fs.writeFileSync(tmpFile, src, 'utf8');

  const childProcess = child_process.spawn(process.execPath, [tmpFile], {
    stdio: ['inherit', 'inherit', 'inherit', 'ipc'],
    env: { ...process.env, ELECTRON_RUN_AS_NODE: 1 },
    /**
     * This would be awesome, but only supported since node 12.16.0, compass
     * is currently at 12.4
     * @see https://nodejs.org/api/child_process.html#child_process_advanced_serialization
     */
    serialization: 'advanced',
  });

  return childProcess;
}

class WorkerRuntime {
  constructor(uri, options, cliOptions) {
    this.initOptions = { uri, options, cliOptions };
    this.evaluationListener = null;
    this.cancelEvaluate = () => {};
    this.initWorker();
  }

  initWorker() {
    const { uri, options, cliOptions } = this.initOptions;
    this.childProcess = createChildFromSource(worker);
    this.worker = createCaller(
      ['init', 'evaluate', 'getCompletions'],
      this.childProcess
    );
    this.workerEvaluationListener = exposeAll(
      {
        onPrint: (...args) => {
          if (this.evaluationListener && this.evaluationListener.onPrint) {
            this.evaluationListener.onPrint(...args);
          }
        },
        onPrompt: (...args) => {
          if (this.evaluationListener && this.evaluationListener.onPrompt) {
            this.evaluationListener.onPrompt(...args);
          }
        },
        toggleTelemetry: (...args) => {
          if (
            this.evaluationListener &&
            this.evaluationListener.toggleTelemetry
          ) {
            this.evaluationListener.toggleTelemetry(...args);
          }
        },
      },
      this.childProcess
    );
    this.initPromise = this.worker.init(uri, options, cliOptions);
  }

  async evaluate(code) {
    await this.initPromise;

    const result = await Promise.race([
      this.waitForCancelEvaluate(),
      this.worker.evaluate(code),
    ]);

    if (result && result.__error) {
      const error = new Error();
      Object.assign(error, result.__error);
      throw error;
    }

    return result;
  }

  async getCompletions(code) {
    await this.initPromise;

    const result = await this.worker.getCompletions(code);

    if (result && result.__error) {
      const error = new Error();
      Object.assign(error, result.__error);
      throw error;
    }

    return result;
  }

  setEvaluationListener(listener) {
    const prev = this.evaluationListener;
    this.evaluationListener = listener;
    return prev;
  }

  terminateWorker() {
    this.cancelEvaluate();
    this.childProcess.kill();
  }

  restart() {
    this.terminateWorker();
    this.initWorker();
  }

  waitForCancelEvaluate() {
    return new Promise((resolve, reject) => {
      this.cancelEvaluate = () => {
        reject(new Error('Script execution was interrupted'));
      };
    });
  }
}

export default WorkerRuntime;
