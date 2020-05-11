import React, { Component } from 'react';
import styles from './compass-shell.less';
import PropTypes from 'prop-types';
import IconButton from '@leafygreen-ui/icon-button';
import Icon from '@leafygreen-ui/icon';

export class CompassShell extends Component {
  static propTypes = {
    isExpanded: PropTypes.bool.isRequired,
    onShellToggleClicked: PropTypes.func.isRequired
  };
  /**
   * Render ShellHeader component.
   *
   * @returns {React.Component} The rendered component.
   */
  render() {
    const {
      isExpanded
    } = this.props;

    return (
      <div className={styles['compass-shell-header']}>
        <button
          className={styles['compass-shell-header-toggle']}
          onClick={this.onShellToggleClicked}
        >
          &gt;_MongoSH v0.9 Beta
        </button>
        {isExpanded && (
          <IconButton
            className={styles['compass-shell-header-close-btn']}
            variant="dark"
            aria-label="Some Menu"
            onClick={this.onShellToggleClicked}
          >
            <Icon glyph="X" />
          </IconButton>
        )}
      </div>
    );
  }
}
