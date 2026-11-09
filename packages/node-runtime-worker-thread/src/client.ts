/* istanbul ignore file */
/* ^^^ we test the dist directly, so istanbul can't calculate the coverage correctly */

// Helpers for driving the worker from another process or thread. This entry
// must not load `interruptor` or `WorkerRuntime`, so it can run in a renderer.
// Use all of them from this entry: each bundle has its own `cancel` symbol.
export type { Caller, RPCMessageBus } from './rpc';
export { createCaller, cancel } from './rpc';
export {
  serializeConnectOptions,
  deserializeEvaluationResult,
} from './serializer';
export { WorkerThreadEvaluationListener } from './worker-thread-evaluation-listener';
export { WorkerProcessMongoshBus } from './worker-process-mongosh-bus';
export type {
  WorkerRuntime as WorkerThreadRuntime,
  WorkerRuntimeEvaluationListener,
} from './worker-runtime';
