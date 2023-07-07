import type ShellAuthOptions from './shell-auth-options';
import type {
  MongoClientOptions,
  ReadConcern,
  ReadPreference,
  WriteConcern,
  Document,
  CreateCollectionOptions,
  ClientSession,
  DbOptions,
  ClientSessionOptions,
  ListDatabasesOptions,
  AutoEncryptionOptions,
  Collection,
} from './all-transport-types';
import type { bson as BSON } from './index';
import type { ReplPlatform } from './platform';
import type {
  AWSEncryptionKeyOptions,
  AzureEncryptionKeyOptions,
  ClientEncryption as MongoCryptClientEncryption,
  ClientEncryptionDataKeyProvider,
  FLE,
  GCPEncryptionKeyOptions,
} from './all-fle-types';

export interface CreateEncryptedCollectionOptions {
  provider: ClientEncryptionDataKeyProvider;
  createCollectionOptions: Omit<CreateCollectionOptions, 'encryptedFields'> & {
    encryptedFields: Document;
  };
  masterKey?:
    | AWSEncryptionKeyOptions
    | AzureEncryptionKeyOptions
    | GCPEncryptionKeyOptions;
}

export interface CheckMetadataConsistencyOptions {
  cursor?: {
    batchSize: number;
  };
  checkIndexes?: 1;
}

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
  bsonLibrary: typeof BSON;

  /**
   * list databases.
   *
   * @param {String} database - The database name.
   *
   * @returns {Promise} The promise of command Documents.
   */
  listDatabases(
    database: string,
    options?: ListDatabasesOptions
  ): Promise<Document>;

  /**
   * create a new service provider with a new connection.
   *
   * @param uri
   * @param options
   */
  getNewConnection(uri: string, options: MongoClientOptions): Promise<any>; // returns the ServiceProvider instance

  /**
   * Return the URI for the current connection, if this ServiceProvider is connected.
   */
  getURI(): string | undefined;

  /**
   * Return connection info
   */
  getConnectionInfo(): Promise<Document>;

  /**
   * Authenticate
   */
  authenticate(authDoc: ShellAuthOptions): Promise<{ ok: number }>;

  /**
   * createCollection
   */
  createCollection(
    dbName: string,
    collName: string,
    options: CreateCollectionOptions,
    dbOptions?: DbOptions
  ): Promise<{ ok: number }>;

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
  resetConnectionOptions(options: MongoClientOptions): Promise<void>;

  /**
   * Start a session.
   * @param options
   */
  startSession(options: ClientSessionOptions): ClientSession;

  /**
   * Return the raw client for use in keyVaultClient.
   */
  getRawClient(): any;

  /**
   * The FLE implementation for access to the client-side encryption API.
   */
  fle?: FLE | undefined;

  /**
   * The FLE options passed to the client, if any.
   */
  getFleOptions?: () => AutoEncryptionOptions | undefined;

  /**
   * The helper method to correctly access FLE implementation's createEncryptedCollection
   */
  createEncryptedCollection?(
    dbName: string,
    collName: string,
    options: CreateEncryptedCollectionOptions,
    libmongocrypt: MongoCryptClientEncryption
  ): Promise<{ collection: Collection; encryptedFields: Document }>;
}
