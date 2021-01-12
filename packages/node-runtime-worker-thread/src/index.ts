/* istanbul ignore file */
/* ^^^ we test the dist directly, so isntanbul can't calculate the coverage correctly */

import { ChildProcess } from 'child_process';
import { MongoClientOptions } from '@mongosh/service-provider-core';
import { Runtime } from '@mongosh/browser-runtime-core';
import { EvaluationListener } from '@mongosh/shell-evaluator';
import spawnChildFromSource, { kill } from './spawn-child-from-source';
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
          return (
            workerRuntime.evaluationListener?.onPrompt?.(question, type) ?? ''
          );
        },
        onPrint(values) {
          return workerRuntime.evaluationListener?.onPrint?.(values);
        },
        toggleTelemetry(enabled) {
          return workerRuntime.evaluationListener?.toggleTelemetry?.(enabled);
        },
        onClearCommand() {
          return workerRuntime.evaluationListener?.onClearCommand?.();
        },
        onExit() {
          return (
            workerRuntime.evaluationListener?.onExit?.() ??
            (Promise.resolve() as Promise<never>)
          );
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
    await kill(this.childProcess);
  }
}

export { WorkerRuntime };
