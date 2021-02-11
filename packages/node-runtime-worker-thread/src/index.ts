/* istanbul ignore file */
/* ^^^ we test the dist directly, so isntanbul can't calculate the coverage correctly */

import { ChildProcess, spawn, SpawnOptionsWithoutStdio } from 'child_process';
import { MongoClientOptions } from '@mongosh/service-provider-core';
import {
  Runtime,
  RuntimeEvaluationListener,
  RuntimeEvaluationResult
} from '@mongosh/browser-runtime-core';
import { MongoshBus } from '@mongosh/types';
import path from 'path';
import { EventEmitter } from 'events';
import { kill } from './spawn-child-from-source';
import { Caller, createCaller, cancel } from './rpc';
import { ChildProcessEvaluationListener } from './child-process-evaluation-listener';
import type { WorkerRuntime as WorkerThreadWorkerRuntime } from './worker-runtime';
import { deserializeEvaluationResult } from './serializer';
import { ChildProcessMongoshBus } from './child-process-mongosh-bus';

type ChildProcessRuntime = Caller<WorkerThreadWorkerRuntime>;

class WorkerRuntime implements Runtime {
  private initOptions: {
    uri: string;
    driverOptions: MongoClientOptions;
    cliOptions: { nodb?: boolean };
    spawnOptions: SpawnOptionsWithoutStdio;
  };

  evaluationListener: RuntimeEvaluationListener | null = null;

  private eventEmitter: MongoshBus;

  private childProcessMongoshBus!: ChildProcessMongoshBus;

  private childProcessEvaluationListener!: ChildProcessEvaluationListener;

  private childProcess!: ChildProcess;

  private childProcessRuntime!: ChildProcessRuntime;

  private initWorkerPromise: Promise<void>;

  constructor(
    uri: string,
    driverOptions: MongoClientOptions = {},
    cliOptions: { nodb?: boolean } = {},
    spawnOptions: SpawnOptionsWithoutStdio = {},
    eventEmitter: MongoshBus = new EventEmitter()
  ) {
    this.initOptions = { uri, driverOptions, cliOptions, spawnOptions };
    this.eventEmitter = eventEmitter;
    this.initWorkerPromise = this.initWorker();
  }

  private async initWorker() {
    const { uri, driverOptions, cliOptions, spawnOptions } = this.initOptions;

    const childProcessProxySrcPath = path.resolve(
      __dirname,
      'child-process-proxy.js'
    );

    this.childProcess = spawn(process.execPath, [childProcessProxySrcPath], {
      stdio: ['inherit', 'inherit', 'inherit', 'ipc'],
      ...spawnOptions
    });

    // We expect the amount of listeners to be more than the default value of 10
    // but probably not more than ~15 (all exposed methods on
    // ChildProcessEvaluationListener and ChildProcessMongoshBus + any
    // concurrent in-flight calls on ChildProcessRuntime) at once
    this.childProcess.setMaxListeners(15);

    this.childProcessRuntime = createCaller(
      [
        'init',
        'evaluate',
        'getCompletions',
        'setEvaluationListener',
        'getShellPrompt',
        'interrupt'
      ],
      this.childProcess
    );

    this.childProcessEvaluationListener = new ChildProcessEvaluationListener(
      this,
      this.childProcess
    );

    this.childProcessMongoshBus = new ChildProcessMongoshBus(
      this.eventEmitter,
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
    this.childProcessRuntime[cancel]();
    this.childProcessEvaluationListener.terminate();
    this.childProcessMongoshBus.terminate();
  }

  async interrupt() {
    await this.initWorkerPromise;
    return this.childProcessRuntime.interrupt();
  }

  async waitForRuntimeToBeReady() {
    await this.initWorkerPromise;
  }
}

export { WorkerRuntime };
