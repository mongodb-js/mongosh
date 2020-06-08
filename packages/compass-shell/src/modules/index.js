import { combineReducers } from 'redux';

import infoModal from './info-modal';
import runtime from './runtime';

/**
 * The reducer.
 */
const reducer = combineReducers({
  infoModal,
  runtime
});

export default reducer;
