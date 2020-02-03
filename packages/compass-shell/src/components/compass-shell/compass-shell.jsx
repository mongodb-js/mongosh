import React, { Component } from 'react';
import classnames from 'classnames';
import styles from './compass-shell.less';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';

import { Shell } from 'mongosh-browser-repl';

export class CompassShell extends Component {
  static displayName = 'CompassShellComponent';

  static propTypes = {
    dataService: PropTypes.object.isRequired
  };

  static defaultProps = {
    runtime: null
  };

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
    runtime: state.dataService ? state.dataService.runtime : null
  }),
  {}
)(CompassShell);
