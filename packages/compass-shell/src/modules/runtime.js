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

  const shouldUseNewRuntime = !!process.env
    .COMPASS_SHELL_EXPERIMENTAL_WORKER_RUNTIME;

  let connectionOptions;

  if (shouldUseNewRuntime) {
    connectionOptions = action.dataService.getConnectionOptions();
    // Shallow clone connection options to avoid side-effects
    connectionOptions = {
      url: connectionOptions.url,
      options: { ...connectionOptions.options },
    };

    // WorkerRuntime uses driver 4 that deprecates following options. They can
    // be safely removed from the connection. This is necessary so that driver
    // doesn't throw during the connection
    //
    // TODO: This can probably be removed as soon as compass uses the same
    // driver version as rest of the mongosh packages
    delete connectionOptions.options.useUnifiedTopology;
    delete connectionOptions.options.connectWithNoPrimary;
    delete connectionOptions.options.useNewUrlParser;
    // `true` is not a valid tls checkServerIdentity option that seems to break
    // driver 4
    //
    // TODO(NODE-3061): Remove when fixed on driver side
    if (connectionOptions.options.checkServerIdentity === true) {
      delete connectionOptions.options.checkServerIdentity;
    }
    // driver 4 doesn't support certificates as buffers, so let's copy paths
    // back from model `driverOptions`
    //
    // TODO: Driver is not sure if buffer behavior was a bug or a feature,
    // hopefully this can be removed eventually (see https://mongodb.slack.com/archives/C0V8RU15L/p1612347025017200)
    ['sslCA', 'sslCRL', 'sslCert', 'sslKey'].forEach((key) => {
      if (
        connectionOptions.options[key] &&
        action.dataService?.client?.model?.driverOptions?.[key]
      ) {
        // Option value can be array or a string in connection-model, we'll
        // unwrap it if it's an array (it's always an array with one value)
        const option = action.dataService.client.model.driverOptions[key];
        connectionOptions.options[key] = Array.isArray(option)
          ? option[0]
          : option;
      }
    });
  }

  const runtime = shouldUseNewRuntime
    ? new WorkerRuntime(
      connectionOptions.url,
      connectionOptions.options,
      {},
      {
        env: { ...process.env, ELECTRON_RUN_AS_NODE: 1 },
        serialization: 'advanced',
      },
      action.appRegistry
    )
    : new ElectronRuntime(
      CompassServiceProvider.fromDataService(action.dataService),
      action.appRegistry
    );

  return {
    error: action.error,
    dataService: action.dataService,
    runtime
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
