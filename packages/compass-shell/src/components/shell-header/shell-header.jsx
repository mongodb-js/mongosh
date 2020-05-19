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
        <div className={styles['compass-shell-header-right-actions']}>
          {isExpanded && (
            <IconButton
              className={styles['compass-shell-header-close-btn']}
              variant="dark"
              aria-label="Close Shell"
              onClick={onShellToggleClicked}
            >
              <Icon glyph="ChevronDown" />
            </IconButton>
          )}
          {!isExpanded && (
            <IconButton
              className={styles['compass-shell-header-open-btn']}
              variant="dark"
              aria-label="Open Shell"
              onClick={onShellToggleClicked}
            >
              <Icon glyph="ChevronUp" />
            </IconButton>
          )}
        </div>
      </div>
    );
  }
}
