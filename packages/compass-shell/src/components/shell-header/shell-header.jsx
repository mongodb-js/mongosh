import React, { Component, Fragment } from 'react';
import styles from './shell-header.less';
import PropTypes from 'prop-types';
import IconButton from '@leafygreen-ui/icon-button';
import Icon from '@leafygreen-ui/icon';

export default class ShellHeader extends Component {
  static propTypes = {
    isExpanded: PropTypes.bool.isRequired,
    onShellToggleClicked: PropTypes.func.isRequired
  };

  onInfoClicked = () => {
    // TODO: Open modal.
  }

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
            <Fragment>
              <IconButton
                className={styles['compass-shell-header-info-btn']}
                variant="dark"
                aria-label="Shell Info"
                onClick={this.onInfoClicked}
              >
                <Icon glyph="InfoWithCircle" />
              </IconButton>
              <IconButton
                className={styles['compass-shell-header-close-btn']}
                variant="dark"
                aria-label="Close Shell"
                onClick={onShellToggleClicked}
              >
                <Icon glyph="ChevronDown" />
              </IconButton>
            </Fragment>
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
