export const SET_SHOW_INFO_MODAL = 'SHELL/INFO_MODAL/SET_SHOW_INFO_MODAL';

/**
 * The initial state.
 */
export const INITIAL_STATE = {
  isInfoModalVisible: false
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
  if (action.type === SET_SHOW_INFO_MODAL) {
    return {
      ...state,
      isInfoModalVisible: action.isInfoModalVisible
    };
  }

  return state;
}
