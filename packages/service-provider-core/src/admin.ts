import Result from "./result";

export default interface Admin {
   /**
   * Returns buildInfo.
   *
   * @returns {Promise} buildInfo object.
   */
  buildInfo(): Promise<Result>;

  /**
   * Returns the cmdLineOpts.
   *
   * @returns {Promise} The server version.
   */
  getCmdLineOpts(): Promise<Result>;

  /**
   * list databases.
   *
   * @param {String} database - The database name.
   *
   * @returns {Promise} The promise of command results.
   */
  listDatabases(database: string): Promise<Result>;

  /**
   * create a new service provider with a new connection.
   *
   * @param uri
   * @param options
   */
  getNewConnection(uri: string, options: any): Promise<any>;

  /**
   * Return connection info
   */
  getConnectionInfo(): Promise<any>;
}
