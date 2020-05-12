import React, { Component } from 'react';
import styles from './shell-header.less';
import PropTypes from 'prop-types';
import IconButton from '@leafygreen-ui/icon-button';
import Icon from '@leafygreen-ui/icon';

export default class CompassShell extends Component {
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
      isExpanded,
      onShellToggleClicked
    } = this.props;

    return (
      <div className={styles['compass-shell-header']}>
        <button
          className={styles['compass-shell-header-toggle']}
          onClick={onShellToggleClicked}
        >
          &gt;_MongoSH Beta
        </button>
        {isExpanded && (
          <div className={styles['compass-shell-header-right-actions']}>
            <IconButton
              className={styles['compass-shell-header-info-btn']}
              variant="dark"
              aria-label="Open Shell Information"
              onClick={() => alert('Coming soon')}
            >
              <Icon glyph="InfoWithCircle" />
            </IconButton>
            <IconButton
              className={styles['compass-shell-header-close-btn']}
              variant="dark"
              aria-label="Close Shell"
              onClick={onShellToggleClicked}
            >
              <Icon glyph="X" />
            </IconButton>
          </div>
        )}
      </div>
    );
  }
}
