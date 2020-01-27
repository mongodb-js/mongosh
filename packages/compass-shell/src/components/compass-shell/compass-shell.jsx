import React, { Component } from 'react';
import classnames from 'classnames';
import styles from './compass-shell.less';

import { Shell, ElectronRuntime } from 'mongosh-browser-repl';
import { CompassServiceProvider } from 'mongosh-service-provider-server';

class CompassShell extends Component {
  static displayName = 'CompassShellComponent';

  constructor() {
    super();
    this.state = {
      connected: false
    };
  }

  componentDidMount() {
    CompassServiceProvider.connect('mongodb://localhost:27017')
      .then((serviceProvider) => {
        this.runtime = new ElectronRuntime(serviceProvider);
        this.setState({
          connected: true
        });
      });
  }

  /**
   * Render CompassShell component.
   *
   * @returns {React.Component} The rendered component.
   */
  render() {
    if (!this.state.connected) {
      return (<div />);
    }

    return (
      <div className={classnames(styles.container)}>
        <Shell runtime={this.runtime} />
      </div>
    );
  }
}

export default CompassShell;
export { CompassShell };
