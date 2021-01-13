import { ChildProcess } from 'child_process';
import { EvaluationListener } from '@mongosh/shell-evaluator';
import { exposeAll, WithClose } from './rpc';
import type { WorkerRuntime } from './index';

export class ChildProcessEvaluationListener {
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
