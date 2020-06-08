import IconButton from '@leafygreen-ui/icon-button';
import Icon from '@leafygreen-ui/icon';
import PropTypes from 'prop-types';
import React, { Component, Fragment } from 'react';
import { connect } from 'react-redux';

import { SET_SHOW_INFO_MODAL } from '../../modules/info-modal';

import styles from './shell-header.less';

export class ShellHeader extends Component {
  static propTypes = {
    isExpanded: PropTypes.bool.isRequired,
    onShellToggleClicked: PropTypes.func.isRequired,
    showInfoModal: PropTypes.func.isRequired
  };

  /**
   * Render ShellHeader component.
   *
   * @returns {React.Component} The rendered component.
   */
  render() {
    const {
      isExpanded,
      onShellToggleClicked,
      showInfoModal
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
                onClick={showInfoModal}
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

export default connect(
  null,
  (dispatch) => ({
    showInfoModal: () => dispatch({
      type: SET_SHOW_INFO_MODAL,
      isInfoModalVisible: true
    })
  })
)(ShellHeader);
