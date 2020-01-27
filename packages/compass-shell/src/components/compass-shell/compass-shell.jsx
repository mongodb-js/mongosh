import React, { Component } from 'react';
import classnames from 'classnames';
import styles from './compass-shell.less';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';

import { Shell, ElectronRuntime } from 'mongosh-browser-repl';
import { CompassServiceProvider } from 'mongosh-service-provider-server';

export class CompassShell extends Component {
  static displayName = 'CompassShellComponent';

  static propTypes = {
    dataService: PropTypes.object.isRequired
  };

  static defaultProps = {
    dataService: {
      dataService: null,
      error: null
    }
  };

  constructor(props) {
    super();
    this.setRuntimeFromProps(props, {});
  }

  componentDidUpdate(oldProps) {
    this.setRuntimeFromProps(this.props, oldProps);
  }

  setRuntimeFromProps(props, oldProps) {
    if (props.dataService === oldProps.dataService) {
      return;
    }

    const dataService = props.dataService.dataService;

    if (!dataService) {
      this.runtime = null;
      return;
    }

    this.runtime = new ElectronRuntime(
      new CompassServiceProvider(dataService)
    );
  }

  /**
   * Render CompassShell component.
   *
   * @returns {React.Component} The rendered component.
   */
  render() {
    if (!this.runtime) {
      return (<div />);
    }

    return (
      <div className={classnames(styles.container)}>
        <Shell runtime={this.runtime} />
      </div>
    );
  }
}

export default connect(
  (state) => ({
    dataService: state.dataService
  }),
  {}
)(CompassShell);
