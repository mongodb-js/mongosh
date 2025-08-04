export default interface Closable {
  /**
   * Close the connection.
   */
  close(): Promise<void>;

  /**
   * Suspends the connection, i.e. temporarily force-closes it
   * and returns a function that will re-open the connection.
   */
  suspend(): Promise<() => Promise<void>>;
}
