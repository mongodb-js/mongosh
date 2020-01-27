import React, { Component } from 'react';
import { Provider } from 'react-redux';
import CompassShell from 'components/compass-shell';
import CompassShellStore from 'stores';

function createPlugin() {
  const store = new CompassShellStore();
  const Plugin = class extends Component {
    static displayName = 'CompassShellPlugin';

    /**
     * Connect the Plugin to the store and render.
     *
     * @returns {React.Component} The rendered component.
     */
    render() {
      return (
        <Provider store={store.reduxStore}>
          <CompassShell />
        </Provider>
      );
    }
  };

  return {store, Plugin};
}

export default createPlugin;
