import { ChildProcess } from 'child_process';
import { MongoClientOptions } from '@mongosh/service-provider-core';
import { Runtime } from '@mongosh/browser-runtime-core';
import { EvaluationListener } from '@mongosh/shell-evaluator';
import spawnChildFromSource from './spawn-child-from-source';
import { Caller, createCaller, exposeAll, WithClose } from './rpc';
import type { WorkerRuntime as WorkerThreadWorkerRuntime } from './worker-runtime';
import childProcessProxySrc from 'inline-entry-loader!./child-process-proxy';

type ChildProcessRuntime = Caller<WorkerThreadWorkerRuntime>;

class WorkerEvaluationListener {
  exposedListener: WithClose<EvaluationListener>;

  constructor(workerRuntime: WorkerRuntime, childProcess: ChildProcess) {
    this.exposedListener = exposeAll<EvaluationListener>(
      {
        onPrompt(question, type) {
          if (workerRuntime.evaluationListener?.onPrompt) {
            return workerRuntime.evaluationListener.onPrompt(question, type);
          }

          return '';
        },
        onPrint(value) {
          if (workerRuntime.evaluationListener?.onPrint) {
            workerRuntime.evaluationListener.onPrint(value);
          }
        },
        toggleTelemetry(enabled) {
          if (workerRuntime.evaluationListener?.toggleTelemetry) {
            workerRuntime.evaluationListener.toggleTelemetry(enabled);
          }
        },
        onClearCommand() {
          if (workerRuntime.evaluationListener?.onClearCommand) {
            workerRuntime.evaluationListener.onClearCommand();
          }
        },
        onExit() {
          if (workerRuntime.evaluationListener?.onExit) {
            return workerRuntime.evaluationListener.onExit();
          }

          return Promise.resolve() as Promise<never>;
        }
      },
      childProcess
    );
  }
}

class WorkerRuntime implements Runtime {
  private initOptions: {
    uri: string;
    driverOptions: MongoClientOptions;
    cliOptions: { nodb?: boolean };
  };

  evaluationListener: EvaluationListener | null = null;

  private childProcessEvaluationListener!: WorkerEvaluationListener;

  private childProcess!: ChildProcess;

  private childProcessRuntime!: ChildProcessRuntime;

  private initWorkerPromise: Promise<void>;

  constructor(
    uri: string,
    driverOptions: MongoClientOptions = {},
    cliOptions: { nodb?: boolean } = {}
  ) {
    this.initOptions = { uri, driverOptions, cliOptions };
    this.initWorkerPromise = this.initWorker();
  }

  private async initWorker() {
    this.childProcess = await spawnChildFromSource(childProcessProxySrc);

    this.childProcessRuntime = createCaller(
      ['init', 'evaluate', 'getCompletions', 'setEvaluationListener'],
      this.childProcess
    );

    this.childProcessEvaluationListener = new WorkerEvaluationListener(
      this,
      this.childProcess
    );

    const { uri, driverOptions, cliOptions } = this.initOptions;

    await this.childProcessRuntime.init(uri, driverOptions, cliOptions);
  }

  async evaluate(code: string) {
    await this.initWorkerPromise;
    return this.childProcessRuntime.evaluate(code);
  }

  async getCompletions(code: string) {
    await this.initWorkerPromise;
    return await this.childProcessRuntime.getCompletions(code);
  }

  setEvaluationListener(listener: EvaluationListener | null) {
    const prev = this.evaluationListener;
    this.evaluationListener = listener;
    return prev;
  }

  async terminate() {
    await this.initWorkerPromise;
    this.childProcess.kill('SIGTERM');
  }
}

export { WorkerRuntime };
