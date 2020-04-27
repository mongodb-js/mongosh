import Result from "./result";

export default interface Admin {
   /**
   * Returns the server version.
   *
   * @returns {Promise} The server version.
   */
  getServerVersion(): Promise<string>;

  /**
   * list databases.
   *
   * @param {String} database - The database name.
   *
   * @returns {Promise} The promise of command results.
   */
  listDatabases(database: string): Promise<Result>;
}