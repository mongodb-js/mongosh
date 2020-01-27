import React, { Component } from 'react';
import { Provider } from 'react-redux';
import CompassShell from 'components/compass-shell';
import store from 'stores';

class Plugin extends Component {
  static displayName = 'CompassShellPlugin';

  /**
   * Connect the Plugin to the store and render.
   *
   * @returns {React.Component} The rendered component.
   */
  render() {
    return (
      <Provider store={store}>
        <CompassShell />
      </Provider>
    );
  }
}

export default Plugin;
