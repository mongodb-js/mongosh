import Document from './document';

/**
 * Common fluid interface for cursors in the transport module.
 */
interface Cursor {

  /**
   * Get the documents from the cursor as an array of objects.
   */
  toArray(): Promise<Document[]>;
}

export default Cursor;
