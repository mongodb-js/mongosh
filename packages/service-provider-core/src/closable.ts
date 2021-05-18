export default interface Closable {
  /**
   * Close the connection.
   *
   * @param {boolean} force - Whether to force close.
   */
  close(force: boolean): Promise<void>;

  /**
   * Suspends the connection, i.e. temporarily force-closes it
   * and returns a function that will re-open the connection.
   */
  suspend(): Promise<() => Promise<void>>;
}
