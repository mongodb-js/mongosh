import { once } from 'events';
import { spawn } from 'child_process';
import { createCaller, exposeAll } from './rpc';

import childSrc from 'inline-entry-loader!./child';

async function createChildFromSource(src) {
  const childProcess = spawn(process.execPath, [], {
    stdio: ['pipe', 'inherit', 'inherit', 'ipc'],
    env: { ...process.env, ELECTRON_RUN_AS_NODE: 1 },
    /**
     * This would be awesome, but only supported since node 12.16.0, compass
     * is currently at 12.4
     * @see https://nodejs.org/api/child_process.html#child_process_advanced_serialization
     */
    serialization: 'advanced',
  });

  childProcess.stdin.write(src);
  childProcess.stdin.end();

  // First message is a "ready" message
  await once(childProcess, 'message');

  return childProcess;
}

class WorkerRuntime {
  constructor(uri, options, cliOptions) {
    this.initOptions = { uri, options, cliOptions };
    // Creating worker is an async process, we want to "lock"
    // evaluate/getCompletions methods until worker is initiated from the get-go
    this.initPromiseResolve = null;
    this.initPromise = new Promise((resolve) => {
      this.initPromiseResolve = resolve;
    });
    this.evaluationListener = null;
    this.cancelEvaluate = () => {};
    this.initWorker();
  }

  async initWorker() {
    const { uri, options, cliOptions } = this.initOptions;
    this.childProcess = await createChildFromSource(childSrc);
    this.worker = createCaller(
      ['init', 'evaluate', 'getCompletions', 'ping'],
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
    this.initPromiseResolve(await this.worker.init(uri, options, cliOptions));
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

  interruptWorker() {
    this.childProcess.kill('SIGINT');
  }

  terminateWorker() {
    this.cancelEvaluate();
    this.childProcess.kill();
    this.childProcess = null;
  }

  restartWorker() {
    this.terminateWorker();
    this.initWorker();
  }

  waitForCancelEvaluate() {
    return new Promise((_resolve, reject) => {
      this.cancelEvaluate = () => {
        reject(new Error('Script execution was interrupted'));
      };
    });
  }
}

export default WorkerRuntime;
