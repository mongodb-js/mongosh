import { ElectronRuntime } from 'mongosh-browser-repl';
import { CompassServiceProvider } from 'mongosh-service-provider-server';


/**
 * The prefix.
 */
const PREFIX = 'collection/data-service';

/**
 * Data service connected.
 */
export const SET_DATA_SERVICE = `${PREFIX}/SET_DATA_SERVICE`;

/**
 * The initial state.
 */
export const INITIAL_STATE = {
  error: null,
  dataService: null
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
  if (action.type === SET_DATA_SERVICE) {
    return reduceSetRuntimeFromDataService(state, action);
  }

  return state;
}

function reduceSetRuntimeFromDataService(state, action) {
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
 * Action creator for data service connected events.
 *
 * @param {Error} error - The connection error.
 * @param {DataService} dataService - The data service.
 *
 * @returns {Object} The data service connected action.
 */
export const setDataService = (error, dataService) => ({
  type: SET_DATA_SERVICE,
  error: error,
  dataService: dataService
});
