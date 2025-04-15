import type { ClientMetadata, ReadPreferenceFromOptions, ReadPreferenceLike, OperationOptions, RunCommandCursor, RunCursorCommandOptions, ClientEncryptionOptions, MongoClient, ReadPreference, MongoMissingDependencyError } from 'mongodb';
import type { ServiceProvider, ReplPlatform, ShellAuthOptions, AggregateOptions, AggregationCursor, AnyBulkWriteOperation, BulkWriteOptions, BulkWriteResult, ClientSessionOptions, Collection, CountDocumentsOptions, CountOptions, CreateCollectionOptions, CreateIndexesOptions, FindCursor, Db, DbOptions, DeleteOptions, DeleteResult, DistinctOptions, Document, DropCollectionOptions, DropDatabaseOptions, EstimatedDocumentCountOptions, FindOneAndDeleteOptions, FindOneAndReplaceOptions, FindOneAndUpdateOptions, FindOptions, IndexDescription, InsertManyResult, InsertOneOptions, InsertOneResult, ListCollectionsOptions, ListDatabasesOptions, ListIndexesOptions, MongoClientOptions, ReadConcern, RenameOptions, ReplaceOptions, RunCommandOptions, ClientSession, UpdateOptions, UpdateResult, WriteConcern, ChangeStreamOptions, ChangeStream, AutoEncryptionOptions, ClientEncryption as MongoCryptClientEncryption } from '@mongosh/service-provider-core';
import { getConnectInfo, ServiceProviderCore } from '@mongosh/service-provider-core';
import type { DevtoolsConnectOptions } from '@mongodb-js/devtools-connect';
import type { MongoshBus } from '@mongosh/types';
import { ConnectionString } from 'mongodb-connection-string-url';
import type { CreateEncryptedCollectionOptions } from '@mongosh/service-provider-core';
import type { DevtoolsConnectionState } from '@mongodb-js/devtools-connect';
type DropDatabaseResult = {
    ok: 0 | 1;
    dropped?: string;
};
type ConnectionInfo = {
    buildInfo: any;
    topology: any;
    extraInfo: ExtraConnectionInfo;
};
type ExtraConnectionInfo = ReturnType<typeof getConnectInfo> & {
    fcv?: string;
};
interface DependencyVersionInfo {
    nodeDriverVersion?: string;
    libmongocryptVersion?: string;
    libmongocryptNodeBindingsVersion?: string;
    kerberosVersion?: string;
}
declare class CliServiceProvider extends ServiceProviderCore implements ServiceProvider {
    static connect(this: typeof CliServiceProvider, uri: string, driverOptions: DevtoolsConnectOptions, cliOptions?: {
        nodb?: boolean;
    }, bus?: MongoshBus): Promise<CliServiceProvider>;
    readonly platform: ReplPlatform;
    readonly initialDb: string;
    mongoClient: MongoClient;
    private readonly uri?;
    private currentClientOptions;
    private dbcache;
    baseCmdOptions: OperationOptions;
    private bus;
    constructor(mongoClient: MongoClient, bus: MongoshBus, clientOptions: DevtoolsConnectOptions, uri?: ConnectionString);
    static getVersionInformation(): DependencyVersionInfo;
    maybeThrowBetterMissingOptionalDependencyError(err: MongoMissingDependencyError): never;
    connectMongoClient(connectionString: ConnectionString | string, clientOptions: DevtoolsConnectOptions): Promise<{
        client: MongoClient;
        state: DevtoolsConnectionState;
    }>;
    getNewConnection(uri: string, options?: Partial<DevtoolsConnectOptions>): Promise<CliServiceProvider>;
    getConnectionInfo(): Promise<ConnectionInfo>;
    renameCollection(database: string, oldName: string, newName: string, options?: RenameOptions, dbOptions?: DbOptions): Promise<Collection>;
    private db;
    _dbTestWrapper(name: string, dbOptions?: DbOptions): Db;
    private getDBCache;
    aggregate(database: string, collection: string, pipeline?: Document[], options?: AggregateOptions, dbOptions?: DbOptions): AggregationCursor;
    aggregateDb(database: string, pipeline?: Document[], options?: AggregateOptions, dbOptions?: DbOptions): AggregationCursor;
    bulkWrite(database: string, collection: string, requests: AnyBulkWriteOperation[], options?: BulkWriteOptions, dbOptions?: DbOptions): Promise<BulkWriteResult>;
    close(force: boolean): Promise<void>;
    suspend(): Promise<() => Promise<void>>;
    count(database: string, collection: string, query?: Document, options?: CountOptions, dbOptions?: DbOptions): Promise<number>;
    countDocuments(database: string, collection: string, filter?: Document, options?: CountDocumentsOptions, dbOptions?: DbOptions): Promise<number>;
    deleteMany(database: string, collection: string, filter?: Document, options?: DeleteOptions, dbOptions?: DbOptions): Promise<DeleteResult>;
    deleteOne(database: string, collection: string, filter?: Document, options?: DeleteOptions, dbOptions?: DbOptions): Promise<DeleteResult>;
    distinct(database: string, collection: string, fieldName: string, filter?: Document, options?: DistinctOptions, dbOptions?: DbOptions): Promise<Document[]>;
    estimatedDocumentCount(database: string, collection: string, options?: EstimatedDocumentCountOptions, dbOptions?: DbOptions): Promise<number>;
    find(database: string, collection: string, filter?: Document, options?: FindOptions, dbOptions?: DbOptions): FindCursor;
    findOneAndDelete(database: string, collection: string, filter?: Document, options?: FindOneAndDeleteOptions, dbOptions?: DbOptions): Promise<Document | null>;
    findOneAndReplace(database: string, collection: string, filter?: Document, replacement?: Document, options?: FindOneAndReplaceOptions, dbOptions?: DbOptions): Promise<Document>;
    findOneAndUpdate(database: string, collection: string, filter?: Document, update?: Document | Document[], options?: FindOneAndUpdateOptions, dbOptions?: DbOptions): Promise<Document>;
    insertMany(database: string, collection: string, docs?: Document[], options?: BulkWriteOptions, dbOptions?: DbOptions): Promise<InsertManyResult>;
    insertOne(database: string, collection: string, doc?: Document, options?: InsertOneOptions, dbOptions?: DbOptions): Promise<InsertOneResult>;
    replaceOne(database: string, collection: string, filter?: Document, replacement?: Document, options?: ReplaceOptions, dbOptions?: DbOptions): Promise<UpdateResult>;
    runCommand(database: string, spec?: Document, options?: RunCommandOptions, dbOptions?: DbOptions): Promise<Document>;
    runCommandWithCheck(database: string, spec?: Document, options?: RunCommandOptions, dbOptions?: DbOptions): Promise<Document>;
    runCursorCommand(database: string, spec?: Document, options?: RunCursorCommandOptions, dbOptions?: DbOptions): RunCommandCursor;
    listDatabases(database: string, options?: ListDatabasesOptions): Promise<Document>;
    updateMany(database: string, collection: string, filter?: Document, update?: Document, options?: UpdateOptions, dbOptions?: DbOptions): Promise<UpdateResult>;
    updateOne(database: string, collection: string, filter?: Document, update?: Document, options?: UpdateOptions, dbOptions?: DbOptions): Promise<UpdateResult>;
    getTopology(): any | undefined;
    dropDatabase(db: string, options?: DropDatabaseOptions, dbOptions?: DbOptions): Promise<DropDatabaseResult>;
    createIndexes(database: string, collection: string, indexSpecs: IndexDescription[], options?: CreateIndexesOptions, dbOptions?: DbOptions): Promise<string[]>;
    getIndexes(database: string, collection: string, options?: ListIndexesOptions, dbOptions?: DbOptions): Promise<Document[]>;
    listCollections(database: string, filter?: Document, options?: ListCollectionsOptions, dbOptions?: DbOptions): Promise<Document[]>;
    dropCollection(database: string, collection: string, options?: DropCollectionOptions, dbOptions?: DbOptions): Promise<boolean>;
    authenticate(authDoc: ShellAuthOptions): Promise<{
        ok: 1;
    }>;
    createCollection(dbName: string, collName: string, options?: CreateCollectionOptions, dbOptions?: DbOptions): Promise<{
        ok: number;
    }>;
    createEncryptedCollection(dbName: string, collName: string, options: CreateEncryptedCollectionOptions, libmongocrypt: MongoCryptClientEncryption): Promise<{
        collection: Collection;
        encryptedFields: Document;
    }>;
    initializeBulkOp(dbName: string, collName: string, ordered: boolean, options?: BulkWriteOptions, dbOptions?: DbOptions): Promise<any>;
    getReadPreference(): ReadPreference;
    getReadConcern(): ReadConcern | undefined;
    getWriteConcern(): WriteConcern | undefined;
    readPreferenceFromOptions(options?: Omit<ReadPreferenceFromOptions, 'session'>): ReadPreferenceLike | undefined;
    resetConnectionOptions(options: MongoClientOptions): Promise<void>;
    startSession(options: ClientSessionOptions): ClientSession;
    watch(pipeline: Document[], options: ChangeStreamOptions, dbOptions?: DbOptions, db?: string, coll?: string): ChangeStream<Document>;
    get driverMetadata(): ClientMetadata | undefined;
    getRawClient(): MongoClient;
    getURI(): string | undefined;
    getFleOptions(): AutoEncryptionOptions | undefined;
    static processDriverOptions(currentProviderInstance: CliServiceProvider | null, uri: ConnectionString, opts: DevtoolsConnectOptions): DevtoolsConnectOptions;
    processDriverOptions(uri: ConnectionString, opts: Partial<DevtoolsConnectOptions>): DevtoolsConnectOptions;
    getSearchIndexes(database: string, collection: string, indexName?: string, options?: Document, dbOptions?: DbOptions): Promise<Document[]>;
    createSearchIndexes(database: string, collection: string, specs: {
        name: string;
        type?: 'search' | 'vectorSearch';
        definition: Document;
    }[], dbOptions?: DbOptions): Promise<string[]>;
    dropSearchIndex(database: string, collection: string, indexName: string, dbOptions?: DbOptions): Promise<void>;
    updateSearchIndex(database: string, collection: string, indexName: string, definition: Document, dbOptions?: DbOptions): Promise<void>;
    createClientEncryption(options: ClientEncryptionOptions): MongoCryptClientEncryption;
}
export default CliServiceProvider;
export { DevtoolsConnectOptions };
