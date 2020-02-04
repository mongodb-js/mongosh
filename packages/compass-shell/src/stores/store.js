import { createStore } from 'redux';
import reducer from 'modules';
import { setupRuntime } from 'modules/runtime';

const debug = require('debug')('mongodb-compass-shell:store');

export default class CompassShellStore {
  constructor() {
    this.reduxStore = createStore(reducer);
  }

  onActivated(appRegistry) {
    debug('activated');

    appRegistry.on(
      'data-service-connected',
      this.onDataServiceConnected
    );

    appRegistry.on(
      'data-service-disconnected',
      this.onDataServiceDisconnected
    );
  }

  onDataServiceConnected = (error, dataService) => {
    this.reduxStore.dispatch(setupRuntime(
      error,
      dataService
    ));
  }

  onDataServiceDisconnected = () => {
    this.reduxStore.dispatch(setupRuntime(
      null,
      null
    ));
  }
}
