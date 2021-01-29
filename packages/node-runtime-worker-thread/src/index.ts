/* istanbul ignore file */
/* ^^^ we test the dist directly, so isntanbul can't calculate the coverage correctly */

import { ChildProcess, SpawnOptionsWithoutStdio } from 'child_process';
import { MongoClientOptions } from '@mongosh/service-provider-core';
import { Runtime, RuntimeEvaluationListener, RuntimeEvaluationResult } from '@mongosh/browser-runtime-core';
import { promises as fs } from 'fs';
import path from 'path';
import spawnChildFromSource, { kill } from './spawn-child-from-source';
import { Caller, createCaller } from './rpc';
import { ChildProcessEvaluationListener } from './child-process-evaluation-listener';
import type { WorkerRuntime as WorkerThreadWorkerRuntime } from './worker-runtime';
import { deserializeEvaluationResult } from './serializer';

type ChildProcessRuntime = Caller<WorkerThreadWorkerRuntime>;
class WorkerRuntime implements Runtime {
  private initOptions: {
    uri: string;
    driverOptions: MongoClientOptions;
    cliOptions: { nodb?: boolean };
    spawnOptions: SpawnOptionsWithoutStdio;
  };

  evaluationListener: RuntimeEvaluationListener | null = null;

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

    const childProcessProxySrc = await fs.readFile(
      path.resolve(__dirname, 'child-process-proxy.js'),
      'utf-8'
    );

    this.childProcess = await spawnChildFromSource(childProcessProxySrc, {
      ...spawnOptions,
      env: {
        // Proxy child process and worker_threads worker are inlined and as such
        // they are not aware of the dirname (which child process will need to
        // read worker source)
        NODE_RUNTIME_WORKER_THREAD_PARENT_DIRNAME: __dirname,
        ...spawnOptions.env
      }
    });

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

  async evaluate(code: string): Promise<RuntimeEvaluationResult> {
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

  setEvaluationListener(listener: RuntimeEvaluationListener | null) {
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
