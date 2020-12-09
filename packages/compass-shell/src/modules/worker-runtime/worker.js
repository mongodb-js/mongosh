import { ElectronRuntime } from '@mongosh/browser-runtime-electron';
import { CliServiceProvider } from '@mongosh/service-provider-server';
import { exposeAll, createCaller } from './rpc';
import { serializeResult, serializeError } from './worker-shell-result';

let provider = null;
let runtime = null;

const evaluationListener = createCaller(
  ['onPrint', 'onPrompt', 'toggleTelemetry'],
  process
);

async function init(uri, options, cliOptions) {
  provider = await CliServiceProvider.connect(uri, options, cliOptions);
  runtime = new ElectronRuntime(provider /** , TODO: messageBus? */);

  runtime.setEvaluationListener(evaluationListener);

  return true;
}

async function evaluate(code) {
  try {
    if (!runtime) {
      throw new Error('Runtime is not initiated yet');
    }

    const result = await runtime.evaluate(code);

    return serializeResult(result);
  } catch (e) {
    console.error(e);
    // postmsg-rpc library does a weird serialization for errors, this is a
    // workaround to avoid it, we will manually re-throw on the other side
    return { __error: serializeError(e) };
  }
}

async function getCompletions(code) {
  try {
    if (!runtime) {
      throw new Error('Runtime is not initiated yet');
    }

    const result = await runtime.getCompletions(code);

    return result;
  } catch (e) {
    console.error(e);
    // postmsg-rpc library does a weird serialization for errors, this is a
    // workaround to avoid it, we will manually re-throw on the other side
    return { __error: serializeError(e) };
  }
}

const worker = { init, evaluate, getCompletions };

exposeAll(worker, process);
