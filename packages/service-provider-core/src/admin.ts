import Result from './result';
import { ReplPlatform } from './platform';
import AuthOptions from './auth-options';
import CollectionOptions from './collection-options';
import DatabaseOptions from './database-options';
import ReadPreference from './read-preference';
import ReadConcern from './read-concern';
import WriteConcern from './write-concern';
import Document from './document';

export default interface Admin {
  /**
   * What platform (Compass/CLI/Browser)
   */
  platform: ReplPlatform;

  /**
   * The initial database
   */
  initialDb: string;

  /**
   * The BSON package
   */
  bsonLibrary: any;

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

  /**
   * Authenticate
   */
  authenticate(authDoc: AuthOptions): Promise<any>;

  /**
   * createCollection
   */
  createCollection(dbName: string, collName: string, opts: CollectionOptions, dbOptions?: DatabaseOptions): Promise<any>;

  /**
   * Return read preference for connection.
   */
  getReadPreference(): ReadPreference;

  /**
   * Return read concern for connection.
   */
  getReadConcern(): ReadConcern | undefined;

  /**
   * Return write concern for connection.
   */
  getWriteConcern(): WriteConcern | undefined;

  /**
   * Reset the connection to have the option specified.
   *
   * @param options
   */
  resetConnectionOptions(options: Document): Promise<void>;
}
