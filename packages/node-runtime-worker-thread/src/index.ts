/* istanbul ignore file */
/* ^^^ we test the dist directly, so isntanbul can't calculate the coverage correctly */

import { ChildProcess, SpawnOptionsWithoutStdio } from 'child_process';
import { MongoClientOptions } from '@mongosh/service-provider-core';
import { Runtime } from '@mongosh/browser-runtime-core';
import { EvaluationListener } from '@mongosh/shell-evaluator';
import spawnChildFromSource, { kill } from './spawn-child-from-source';
import { Caller, createCaller } from './rpc';
import { ChildProcessEvaluationListener } from './child-process-evaluation-listener';
import type { WorkerRuntime as WorkerThreadWorkerRuntime } from './worker-runtime';
import childProcessProxySrc from 'inline-entry-loader!./child-process-proxy';
import { deserializeEvaluationResult } from './serializer';

type ChildProcessRuntime = Caller<WorkerThreadWorkerRuntime>;
class WorkerRuntime implements Runtime {
  private initOptions: {
    uri: string;
    driverOptions: MongoClientOptions;
    cliOptions: { nodb?: boolean };
    spawnOptions: SpawnOptionsWithoutStdio;
  };

  evaluationListener: EvaluationListener | null = null;

  private childProcessEvaluationListener!: ChildProcessEvaluationListener;

  private childProcess!: ChildProcess;

  private childProcessRuntime!: ChildProcessRuntime;

  private initWorkerPromise: Promise<void>;

  constructor(
    uri: string,
    driverOptions: MongoClientOptions = {},
    cliOptions: { nodb?: boolean } = {},
    spawnOptions: SpawnOptionsWithoutStdio = {}
  ) {
    this.initOptions = { uri, driverOptions, cliOptions, spawnOptions };
    this.initWorkerPromise = this.initWorker();
  }

  private async initWorker() {
    const { uri, driverOptions, cliOptions, spawnOptions } = this.initOptions;

    this.childProcess = await spawnChildFromSource(
      childProcessProxySrc,
      spawnOptions
    );

    this.childProcessRuntime = createCaller(
      ['init', 'evaluate', 'getCompletions', 'setEvaluationListener'],
      this.childProcess
    );

    this.childProcessEvaluationListener = new ChildProcessEvaluationListener(
      this,
      this.childProcess
    );

    await this.childProcessRuntime.init(uri, driverOptions, cliOptions);
  }

  async evaluate(code: string) {
    await this.initWorkerPromise;
    return deserializeEvaluationResult(
      await this.childProcessRuntime.evaluate(code)
    );
  }

  async getCompletions(code: string) {
    await this.initWorkerPromise;
    return await this.childProcessRuntime.getCompletions(code);
  }

  async getShellPrompt() {
    await this.initWorkerPromise;
    return await this.childProcessRuntime.getShellPrompt();
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
