import { ElectronRuntime } from 'mongosh-browser-repl';
import { CompassServiceProvider } from 'mongosh-service-provider-server';


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
    return {error: action.error, dataService: null, runtime: null};
  }

  if (state.dataService === action.dataService) {
    return state;
  }

  const runtime = new ElectronRuntime(
    CompassServiceProvider.fromDataService(action.dataService)
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
 *
 * @returns {Object} The data service connected action.
 */
export const setupRuntime = (error, dataService) => ({
  type: SETUP_RUNTIME,
  error: error,
  dataService: dataService
});
