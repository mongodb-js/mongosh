import { ChildProcess } from 'child_process';
import { exposeAll, Exposed, close } from './rpc';
import type { WorkerRuntime } from './index';
import { RuntimeEvaluationListener } from '@mongosh/browser-runtime-core';

type NoUndef<T> = { [k in keyof T]-?: T[k] };

export class ChildProcessEvaluationListener {
  exposedListener: Exposed<NoUndef<RuntimeEvaluationListener>>;

  constructor(workerRuntime: WorkerRuntime, childProcess: ChildProcess) {
    this.exposedListener = exposeAll(
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

  terminate() {
    this.exposedListener[close]();
  }
}
