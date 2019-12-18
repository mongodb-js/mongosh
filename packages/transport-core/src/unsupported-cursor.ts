import Cursor from './unsupported-cursor';

/**
 * Defines a cursor for an unsupported operation.
 */
class UnsupportedCursor implements Cursor {
  private readonly message: string;

  /**
   * Create the unsupported cursor with a rejection message.
   *
   * @param {String} message - The message.
   */
  constructor(message: string) {
    this.message = message;
  }

  /**
   * When the cursor is for an unsupported operation,
   * this method will reject.
   *
   * @returns {Promise} The rejected promise.
   */
  toArray(): Promise<Document[]> {
    return Promise.reject(this.message);
  }
}

export default UnsupportedCursor;
