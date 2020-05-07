import React, { Component } from 'react';
import classnames from 'classnames';
import styles from './compass-shell.less';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { Resizable } from 're-resizable';

import { Shell } from '@mongosh/browser-repl';

const resizeableDirections = {
  top: true,
  right: false,
  bottom: false,
  left: false,
  topRight: false,
  bottomRight: false,
  bottomLeft: false,
  topLeft: false
};

export class CompassShell extends Component {
  static propTypes = {
    runtime: PropTypes.object,
    historyStorage: PropTypes.object
  };

  static defaultProps = {
    runtime: null
  };

  constructor(props) {
    super(props);

    this.state = {
      initialHistory: this.props.historyStorage ? null : []
    };
  }

  componentDidMount() {
    this.loadHistory();
  }

  saveHistory = async(history) => {
    if (!this.props.historyStorage) {
      return;
    }

    try {
      await this.props.historyStorage.save(history);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(error);
    }
  }

  loadHistory = async() => {
    if (!this.props.historyStorage) {
      return;
    }

    try {
      const history = await this.props.historyStorage.load();
      this.setState({
        initialHistory: history
      });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(error);
      this.setState({
        initialHistory: []
      });
    }
  }

  /**
   * Render CompassShell component.
   *
   * @returns {React.Component} The rendered component.
   */
  render() {
    if (!this.props.runtime || !this.state.initialHistory) {
      return (<div />);
    }

    return (
      <Resizable
        className={classnames(styles['compass-shell'])}
        defaultSize={{
          width: '100%',
          height: 240
        }}
        id="content"
        minHeight={30}
        enable={resizeableDirections}
      >
        <Shell
          runtime={this.props.runtime}
          initialHistory={this.state.initialHistory}
          onHistoryChanged={this.saveHistory}
        />
      </Resizable>
    );
  }
}

export default connect(
  (state) => ({
    runtime: state.runtime ? state.runtime.runtime : null
  }),
  {}
)(CompassShell);
