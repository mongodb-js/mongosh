import { TextButton } from 'hadron-react-buttons';
import PropTypes from 'prop-types';
import React, { PureComponent } from 'react';
import { Modal } from 'react-bootstrap';
import { connect } from 'react-redux';

import { SET_SHOW_INFO_MODAL } from '../../modules/info-modal';

import styles from './info-modal.less';

/**
 * Show information on how to use the shell in compass.
 */
class InfoModal extends PureComponent {
  static propTypes = {
    hideInfoModal: PropTypes.func.isRequired,
    isInfoModalVisible: PropTypes.bool.isRequired
  };

  /**
   * Render the component.
   *
   * @returns {React.Component} The component.
   */
  render() {
    const {
      hideInfoModal,
      isInfoModalVisible
    } = this.props;

    return (
      <Modal show={isInfoModalVisible}>
        <Modal.Header closeButton onHide={hideInfoModal}>
          <h4>MongoSH Beta</h4>
        </Modal.Header>
        <Modal.Body>
          <div className={styles['info-modal-banner']}>
            More information on this release of&nbsp;
            <a
              className={styles['info-modal-banner-link']}
              id="mongosh-info-link"
              rel="noreopener"
              href="https://docs.mongodb.com/manual/reference/mongo-shell/#command-helpers"
              target="_blank"
            >MongoSH Beta</a>
          </div>
          <div className={styles['info-modal-shortcuts-title']}>
            Keyboard Shortcuts
          </div>
          <div className={styles['info-modal-shortcuts']}>
            <div className={styles['info-modal-shortcuts-hotkey']}>
              <span
                className={styles['info-modal-shortcuts-hotkey-key']}
              >Ctrl+A</span>Moves the cursor to the begining of the line.
            </div>
            <div className={styles['info-modal-shortcuts-hotkey']}>
              <span
                className={styles['info-modal-shortcuts-hotkey-key']}
              >Ctrl+B</span>Moves the cursor backwards one character.
            </div>
            <div className={styles['info-modal-shortcuts-hotkey']}>
              <span
                className={styles['info-modal-shortcuts-hotkey-key']}
              >Ctrl+C</span>Cancels the current running command.
            </div>
            <div className={styles['info-modal-shortcuts-hotkey']}>
              <span
                className={styles['info-modal-shortcuts-hotkey-key']}
              >Ctrl+D</span>Logs out of the current session.
            </div>
            <div className={styles['info-modal-shortcuts-hotkey']}>
              <span
                className={styles['info-modal-shortcuts-hotkey-key']}
              >Ctrl+E</span>Moves the cursor to the end of the line.
            </div>
            <div className={styles['info-modal-shortcuts-hotkey']}>
              <span
                className={styles['info-modal-shortcuts-hotkey-key']}
              >Ctrl+F</span>Moves the cursor forwards one character.
            </div>
            <div className={styles['info-modal-shortcuts-hotkey']}>
              <span
                className={styles['info-modal-shortcuts-hotkey-key']}
              >Ctrl+H</span>Erase one character. Similair to hitting backspace.
            </div>
            <div className={styles['info-modal-shortcuts-hotkey']}>
              <span
                className={styles['info-modal-shortcuts-hotkey-key']}
              >Ctrl+L</span>Clear the line after the cursor.
            </div>
            <div className={styles['info-modal-shortcuts-hotkey']}>
              <span
                className={styles['info-modal-shortcuts-hotkey-key']}
              >Ctrl+P</span>Paste the previous line(s).
            </div>
            <div className={styles['info-modal-shortcuts-hotkey']}>
              <span
                className={styles['info-modal-shortcuts-hotkey-key']}
              >Ctrl+Q</span>Turns all output stopped on-screen back on (XON).
            </div>
            <div className={styles['info-modal-shortcuts-hotkey']}>
              <span
                className={styles['info-modal-shortcuts-hotkey-key']}
              >Ctrl+R</span>Allows you to search for previously used commands.
            </div>
            <div className={styles['info-modal-shortcuts-hotkey']}>
              <span
                className={styles['info-modal-shortcuts-hotkey-key']}
              >Ctrl+S</span>Stops all output on-screen (XOFF).
            </div>
            <div className={styles['info-modal-shortcuts-hotkey']}>
              <span
                className={styles['info-modal-shortcuts-hotkey-key']}
              >Ctrl+T</span>Swap the last two characters before the cursor.
            </div>
            <div className={styles['info-modal-shortcuts-hotkey']}>
              <span
                className={styles['info-modal-shortcuts-hotkey-key']}
              >Ctrl+U</span>Clears the line before the cursor position. If you are at the end of the line, clears the entire line.
            </div>
            <div className={styles['info-modal-shortcuts-hotkey']}>
              <span
                className={styles['info-modal-shortcuts-hotkey-key']}
              >Ctrl+W</span>Delete the word before the cursor.
            </div>
            <div className={styles['info-modal-shortcuts-hotkey']}>
              <span
                className={styles['info-modal-shortcuts-hotkey-key']}
              >Ctrl+Z</span>Puts whatever you are running into a suspended background process. fg restores it.
            </div>

            <div className={styles['info-modal-shortcuts-hotkey']}>
              <span
                className={styles['info-modal-shortcuts-hotkey-key']}
              >&uarr;</span>Cycle backwards through command history.
            </div>
            <div className={styles['info-modal-shortcuts-hotkey']}>
              <span
                className={styles['info-modal-shortcuts-hotkey-key']}
              >&darr;</span>Cycle forwards through command history.
            </div>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <TextButton
            id="close-info-modal"
            className="btn btn-default btn-sm"
            text="Close"
            clickHandler={hideInfoModal}
          />
        </Modal.Footer>
      </Modal>
    );
  }
}

export default connect(
  (state) => ({
    isInfoModalVisible: state.infoModal.isInfoModalVisible
  }),
  (dispatch) => ({
    hideInfoModal: () => dispatch({
      type: SET_SHOW_INFO_MODAL,
      isInfoModalVisible: false
    })
  })
)(InfoModal);
