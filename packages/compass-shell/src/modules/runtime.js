import { ElectronRuntime } from '@mongosh/browser-runtime-electron';
import { CompassServiceProvider } from '@mongosh/service-provider-server';
import { WorkerRuntime } from '@mongosh/node-runtime-worker-thread';

/**
 * The prefix.
 */
const PREFIX = 'shell/runtime';

/**
 * Data service connected.
 */
export const SETUP_RUNTIME = `${PREFIX}/SETUP_RUNTIME`;

/**
 * The initial state.
 */
export const INITIAL_STATE = {
  error: null,
  dataService: null,
  runtime: null
};

/**
 * Reducer function for handling data service connected actions.
 *
 * @param {Object} state - The data service state.
 * @param {Object} action - The action.
 *
 * @returns {String} The new state.
 */
export default function reducer(state = INITIAL_STATE, action) {
  if (action.type === SETUP_RUNTIME) {
    return reduceSetupRuntime(state, action);
  }

  return state;
}

function reduceSetupRuntime(state, action) {
  if (action.error || !action.dataService) {
    return { error: action.error, dataService: null, runtime: null };
  }

  if (state.dataService === action.dataService) {
    return state;
  }

  let connection = action.dataService.getConnectionOptions();
  // Shallow clone connection options to avoid side-effects
  connection = { url: connection.url, options: { ...connection.options } };

  const shouldUseNewRuntime = !!process.env
    .COMPASS_SHELL_EXPERIMENTAL_WORKER_RUNTIME;

  if (shouldUseNewRuntime) {
    // WorkerRuntime uses driver 4 that deprecates following options. They can
    // be safely removed from the connection. This is necessary so that driver
    // doesn't throw during the connection
    //
    // TODO: This can probably be removed as soon as compass uses the same
    // driver version as rest of the mongosh packages
    delete connection.options.useUnifiedTopology;
    delete connection.options.connectWithNoPrimary;
    delete connection.options.useNewUrlParser;
    // `true` is not a valid tls checkServerIdentity option that seems to break
    // driver 4
    //
    // TODO(NODE-3061): Remove when fixed on driver side
    if (connection.options.checkServerIdentity === true) {
      delete connection.options.checkServerIdentity;
    }
  }

  const runtime = shouldUseNewRuntime
    ? new WorkerRuntime(
      connection.url,
      connection.options,
      {},
      {
        env: { ...process.env, ELECTRON_RUN_AS_NODE: 1 },
        serialization: 'advanced',
      }
    )
    : new ElectronRuntime(
      CompassServiceProvider.fromDataService(action.dataService),
      action.appRegistry
    );

  return {
    error: action.error,
    dataService: action.dataService,
    runtime: runtime
  };
}

/**
 * Setup the shell runtime with the supplied dataService instance.
 *
 * @param {Error} error - The connection error.
 * @param {DataService} dataService - The data service.
 * @param {EventEmitter} appRegistry - A message bus for runtime events.
 *
 * @returns {Object} The data service connected action.
 */
export const setupRuntime = (error, dataService, appRegistry) => ({
  type: SETUP_RUNTIME,
  error,
  dataService,
  appRegistry
});
