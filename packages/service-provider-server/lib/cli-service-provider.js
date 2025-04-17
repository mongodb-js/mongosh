"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const service_provider_core_1 = require("@mongosh/service-provider-core");
const errors_1 = require("@mongosh/errors");
const mongodb_patches_1 = require("./mongodb-patches");
const mongodb_connection_string_url_1 = require("mongodb-connection-string-url");
const events_1 = require("events");
const util_1 = require("util");
function driver() {
    return require('mongodb');
}
const bsonlib = () => {
    const { Binary, Code, DBRef, Double, Int32, Long, MinKey, MaxKey, ObjectId, Timestamp, Decimal128, BSONSymbol, BSONRegExp, BSON, } = driver();
    return {
        Binary,
        Code,
        DBRef,
        Double,
        Int32,
        Long,
        MinKey,
        MaxKey,
        ObjectId,
        Timestamp,
        Decimal128,
        BSONSymbol,
        calculateObjectSize: BSON.calculateObjectSize,
        EJSON: BSON.EJSON,
        BSONRegExp,
    };
};
const DEFAULT_DRIVER_OPTIONS = Object.freeze({});
const DEFAULT_BASE_OPTIONS = Object.freeze({
    serializeFunctions: true,
    promoteLongs: false,
});
function normalizeEndpointAndAuthConfiguration(uri, opts) {
    var _a, _b, _c, _d, _e, _f;
    const search = uri.typedSearchParams();
    const authMechProps = new mongodb_connection_string_url_1.CommaAndColonSeparatedRecord(search.get('authMechanismProperties'));
    return [
        uri.protocol,
        uri.hosts,
        (_b = (_a = opts.auth) === null || _a === void 0 ? void 0 : _a.username) !== null && _b !== void 0 ? _b : uri.username,
        (_d = (_c = opts.auth) === null || _c === void 0 ? void 0 : _c.password) !== null && _d !== void 0 ? _d : uri.password,
        (_e = opts.authMechanism) !== null && _e !== void 0 ? _e : search.get('authMechanism'),
        (_f = opts.authSource) !== null && _f !== void 0 ? _f : search.get('authSource'),
        { ...Object.fromEntries(authMechProps), ...opts.authMechanismProperties },
    ];
}
class CliServiceProvider extends service_provider_core_1.ServiceProviderCore {
    static async connect(uri, driverOptions, cliOptions = {}, bus = new events_1.EventEmitter()) {
        var _a, _b;
        const connectionString = new mongodb_connection_string_url_1.ConnectionString(uri || 'mongodb://nodb/');
        const clientOptions = this.processDriverOptions(null, connectionString, driverOptions);
        if (process.env.MONGOSH_TEST_FORCE_API_STRICT) {
            clientOptions.serverApi = {
                version: typeof clientOptions.serverApi === 'string'
                    ? clientOptions.serverApi
                    : (_b = (_a = clientOptions.serverApi) === null || _a === void 0 ? void 0 : _a.version) !== null && _b !== void 0 ? _b : '1',
                strict: true,
                deprecationErrors: true,
            };
        }
        const { MongoClient: MongoClientCtor } = driver();
        const { connectMongoClient } = require('@mongodb-js/devtools-connect');
        let client;
        let state;
        if (cliOptions.nodb) {
            const clientOptionsCopy = {
                ...clientOptions,
            };
            delete clientOptionsCopy.productName;
            delete clientOptionsCopy.productDocsLink;
            delete clientOptionsCopy.oidc;
            delete clientOptionsCopy.parentHandle;
            delete clientOptionsCopy.parentState;
            delete clientOptionsCopy.useSystemCA;
            client = new MongoClientCtor(connectionString.toString(), clientOptionsCopy);
        }
        else {
            ({ client, state } = await connectMongoClient(connectionString.toString(), clientOptions, bus, MongoClientCtor));
        }
        clientOptions.parentState = state;
        return new this(client, bus, clientOptions, connectionString);
    }
    constructor(mongoClient, bus, clientOptions, uri) {
        super(bsonlib());
        this.bus = bus;
        this.mongoClient = mongoClient;
        this.uri = uri;
        this.platform = 'CLI';
        try {
            this.initialDb = mongoClient.s.options.dbName || service_provider_core_1.DEFAULT_DB;
        }
        catch (err) {
            this.initialDb = service_provider_core_1.DEFAULT_DB;
        }
        this.currentClientOptions = clientOptions;
        this.baseCmdOptions = { ...DEFAULT_BASE_OPTIONS };
        this.dbcache = new WeakMap();
    }
    static getVersionInformation() {
        function tryCall(fn) {
            try {
                return fn();
            }
            catch (_a) {
                return;
            }
        }
        return {
            nodeDriverVersion: tryCall(() => require('mongodb/package.json').version),
            libmongocryptVersion: tryCall(() => driver().ClientEncryption.libmongocryptVersion),
            libmongocryptNodeBindingsVersion: tryCall(() => require('mongodb-client-encryption/package.json').version),
            kerberosVersion: tryCall(() => require('kerberos/package.json').version),
        };
    }
    maybeThrowBetterMissingOptionalDependencyError(err) {
        if (err.message.includes('kerberos')) {
            try {
                require('kerberos');
            }
            catch (cause) {
                if (typeof cause === 'object' &&
                    cause &&
                    'message' in cause &&
                    typeof cause.message === 'string') {
                    throw new Error(`Could not load kerberos package: ${cause.message}`, {
                        cause,
                    });
                }
            }
        }
        if (err.message.includes('mongodb-client-encryption')) {
            try {
                require('mongodb-client-encryption');
            }
            catch (cause) {
                if (typeof cause === 'object' &&
                    cause &&
                    'message' in cause &&
                    typeof cause.message === 'string') {
                    const extra = 'boxednode' in process
                        ? ''
                        : '\n(If you are installing mongosh through homebrew or npm, consider downlading mongosh from https://www.mongodb.com/try/download/shell instead)';
                    throw new Error(`Could not load mongodb-client-encryption package: ${cause.message}${extra}`, { cause });
                }
            }
        }
        throw err;
    }
    async connectMongoClient(connectionString, clientOptions) {
        const { MongoClient: MongoClientCtor } = driver();
        const { connectMongoClient } = require('@mongodb-js/devtools-connect');
        try {
            return await connectMongoClient(connectionString.toString(), clientOptions, this.bus, MongoClientCtor);
        }
        catch (err) {
            if (typeof err === 'object' &&
                err &&
                'name' in err &&
                err.name === 'MongoMissingDependencyError') {
                this.maybeThrowBetterMissingOptionalDependencyError(err);
            }
            throw err;
        }
    }
    async getNewConnection(uri, options = {}) {
        const connectionString = new mongodb_connection_string_url_1.ConnectionString(uri);
        const clientOptions = this.processDriverOptions(connectionString, options);
        const { client, state } = await this.connectMongoClient(connectionString.toString(), clientOptions);
        clientOptions.parentState = state;
        return new CliServiceProvider(client, this.bus, clientOptions, connectionString);
    }
    async getConnectionInfo() {
        var _a, _b, _c;
        const topology = this.getTopology();
        const { version } = require('../package.json');
        const [buildInfo = null, atlasVersion = null, fcv = null, atlascliInfo] = await Promise.all([
            this.runCommandWithCheck('admin', { buildInfo: 1 }, this.baseCmdOptions).catch(() => { }),
            this.runCommandWithCheck('admin', { atlasVersion: 1 }, this.baseCmdOptions).catch(() => { }),
            this.runCommandWithCheck('admin', { getParameter: 1, featureCompatibilityVersion: 1 }, this.baseCmdOptions).catch(() => { }),
            this.countDocuments('admin', 'atlascli', {
                managedClusterType: 'atlasCliLocalDevCluster',
            }).catch(() => 0),
        ]);
        const isLocalAtlasCli = !!atlascliInfo;
        const extraConnectionInfo = (0, service_provider_core_1.getConnectInfo)((_b = (_a = this.uri) === null || _a === void 0 ? void 0 : _a.toString()) !== null && _b !== void 0 ? _b : '', version, buildInfo, atlasVersion, topology, isLocalAtlasCli);
        return {
            buildInfo: buildInfo,
            topology: topology,
            extraInfo: {
                ...extraConnectionInfo,
                fcv: (_c = fcv === null || fcv === void 0 ? void 0 : fcv.featureCompatibilityVersion) === null || _c === void 0 ? void 0 : _c.version,
            },
        };
    }
    async renameCollection(database, oldName, newName, options = {}, dbOptions) {
        options = { ...this.baseCmdOptions, ...options };
        return await this.db(database, dbOptions).renameCollection(oldName, newName, options);
    }
    db(name, dbOptions = {}) {
        const key = `${name}-${JSON.stringify(dbOptions)}`;
        const dbcache = this.getDBCache();
        const cached = dbcache.get(key);
        if (cached) {
            return cached;
        }
        const db = this.mongoClient.db(name, dbOptions);
        dbcache.set(key, db);
        return db;
    }
    _dbTestWrapper(name, dbOptions) {
        return this.db(name, dbOptions);
    }
    getDBCache() {
        const existing = this.dbcache.get(this.mongoClient);
        if (existing) {
            return existing;
        }
        this.dbcache.set(this.mongoClient, new Map());
        return this.getDBCache();
    }
    aggregate(database, collection, pipeline = [], options = {}, dbOptions) {
        options = { ...this.baseCmdOptions, ...options };
        return this.db(database, dbOptions)
            .collection(collection)
            .aggregate(pipeline, options);
    }
    aggregateDb(database, pipeline = [], options = {}, dbOptions) {
        options = { ...this.baseCmdOptions, ...options };
        const db = this.db(database, dbOptions);
        return db.aggregate(pipeline, options);
    }
    bulkWrite(database, collection, requests, options = {}, dbOptions) {
        options = { ...this.baseCmdOptions, ...options };
        return this.db(database, dbOptions)
            .collection(collection)
            .bulkWrite(requests, options);
    }
    async close(force) {
        this.dbcache.set(this.mongoClient, new Map());
        if (force) {
            await (0, mongodb_patches_1.forceCloseMongoClient)(this.mongoClient);
        }
        else {
            await this.mongoClient.close();
        }
    }
    async suspend() {
        await this.close(true);
        return async () => {
            await this.resetConnectionOptions({});
        };
    }
    count(database, collection, query = {}, options = {}, dbOptions) {
        options = { ...this.baseCmdOptions, ...options };
        return this.db(database, dbOptions)
            .collection(collection)
            .count(query, options);
    }
    countDocuments(database, collection, filter = {}, options = {}, dbOptions) {
        options = { ...this.baseCmdOptions, ...options };
        return this.db(database, dbOptions)
            .collection(collection)
            .countDocuments(filter, options);
    }
    deleteMany(database, collection, filter = {}, options = {}, dbOptions) {
        options = { ...this.baseCmdOptions, ...options };
        return this.db(database, dbOptions)
            .collection(collection)
            .deleteMany(filter, options);
    }
    deleteOne(database, collection, filter = {}, options = {}, dbOptions) {
        options = { ...this.baseCmdOptions, ...options };
        return this.db(database, dbOptions)
            .collection(collection)
            .deleteOne(filter, options);
    }
    distinct(database, collection, fieldName, filter = {}, options = {}, dbOptions) {
        options = { ...this.baseCmdOptions, ...options };
        return this.db(database, dbOptions)
            .collection(collection)
            .distinct(fieldName, filter, options);
    }
    estimatedDocumentCount(database, collection, options = {}, dbOptions) {
        options = { ...this.baseCmdOptions, ...options };
        return this.db(database, dbOptions)
            .collection(collection)
            .estimatedDocumentCount(options);
    }
    find(database, collection, filter = {}, options = {}, dbOptions) {
        const findOptions = { ...this.baseCmdOptions, ...options };
        if ('allowPartialResults' in findOptions) {
            findOptions.partial = findOptions.allowPartialResults;
        }
        if ('noCursorTimeout' in findOptions) {
            findOptions.timeout = findOptions.noCursorTimeout;
        }
        return this.db(database, dbOptions)
            .collection(collection)
            .find(filter, findOptions);
    }
    findOneAndDelete(database, collection, filter = {}, options = {}, dbOptions) {
        options = {
            includeResultMetadata: true,
            ...this.baseCmdOptions,
            ...options,
        };
        return this.db(database, dbOptions)
            .collection(collection)
            .findOneAndDelete(filter, options);
    }
    findOneAndReplace(database, collection, filter = {}, replacement = {}, options = {}, dbOptions) {
        const findOneAndReplaceOptions = {
            includeResultMetadata: true,
            ...this.baseCmdOptions,
            ...options,
        };
        return this.db(database, dbOptions).collection(collection).findOneAndReplace(filter, replacement, findOneAndReplaceOptions);
    }
    findOneAndUpdate(database, collection, filter = {}, update = {}, options = {}, dbOptions) {
        const findOneAndUpdateOptions = {
            includeResultMetadata: true,
            ...this.baseCmdOptions,
            ...options,
        };
        return this.db(database, dbOptions)
            .collection(collection)
            .findOneAndUpdate(filter, update, findOneAndUpdateOptions);
    }
    insertMany(database, collection, docs = [], options = {}, dbOptions) {
        options = { ...this.baseCmdOptions, ...options };
        return this.db(database, dbOptions)
            .collection(collection)
            .insertMany(docs, options);
    }
    async insertOne(database, collection, doc = {}, options = {}, dbOptions) {
        options = { ...this.baseCmdOptions, ...options };
        return this.db(database, dbOptions)
            .collection(collection)
            .insertOne(doc, options);
    }
    replaceOne(database, collection, filter = {}, replacement = {}, options = {}, dbOptions) {
        options = { ...this.baseCmdOptions, ...options };
        return this.db(database, dbOptions)
            .collection(collection)
            .replaceOne(filter, replacement, options);
    }
    runCommand(database, spec = {}, options = {}, dbOptions) {
        options = { ...this.baseCmdOptions, ...options };
        const db = this.db(database, dbOptions);
        return db.command(spec, options);
    }
    async runCommandWithCheck(database, spec = {}, options = {}, dbOptions) {
        const result = await this.runCommand(database, spec, options, dbOptions);
        if (result.ok === 0) {
            throw new errors_1.MongoshCommandFailed(JSON.stringify(spec));
        }
        return result;
    }
    runCursorCommand(database, spec = {}, options = {}, dbOptions) {
        options = { ...this.baseCmdOptions, ...options };
        const db = this.db(database, dbOptions);
        return db.runCursorCommand(spec, options);
    }
    listDatabases(database, options = {}) {
        options = { ...this.baseCmdOptions, ...options };
        return this.db(database).admin().listDatabases(options);
    }
    async updateMany(database, collection, filter = {}, update = {}, options = {}, dbOptions) {
        options = { ...this.baseCmdOptions, ...options };
        return await this.db(database, dbOptions)
            .collection(collection)
            .updateMany(filter, update, options);
    }
    updateOne(database, collection, filter = {}, update = {}, options = {}, dbOptions) {
        options = { ...this.baseCmdOptions, ...options };
        return this.db(database, dbOptions)
            .collection(collection)
            .updateOne(filter, update, options);
    }
    getTopology() {
        return this.mongoClient.topology;
    }
    async dropDatabase(db, options = {}, dbOptions = {}) {
        const opts = { ...this.baseCmdOptions, ...options };
        const nativeResult = await this.db(db, dbOptions).dropDatabase(opts);
        const ok = nativeResult ? 1 : 0;
        return {
            ok,
            ...(ok ? { dropped: db } : {}),
        };
    }
    async createIndexes(database, collection, indexSpecs, options = {}, dbOptions) {
        options = { ...this.baseCmdOptions, ...options };
        return this.db(database, dbOptions)
            .collection(collection)
            .createIndexes(indexSpecs, options);
    }
    async getIndexes(database, collection, options = {}, dbOptions) {
        return await this.db(database, dbOptions)
            .collection(collection)
            .listIndexes({ ...this.baseCmdOptions, ...options })
            .toArray();
    }
    async listCollections(database, filter = {}, options = {}, dbOptions) {
        options = { ...this.baseCmdOptions, ...options };
        return await this.db(database, dbOptions)
            .listCollections(filter, options)
            .toArray();
    }
    async dropCollection(database, collection, options = {}, dbOptions) {
        return this.db(database, dbOptions)
            .collection(collection)
            .drop({ ...this.baseCmdOptions, ...options });
    }
    async authenticate(authDoc) {
        const auth = { username: authDoc.user, password: authDoc.pwd };
        await this.resetConnectionOptions({
            auth,
            ...(authDoc.mechanism
                ? { authMechanism: authDoc.mechanism }
                : {}),
            ...(authDoc.authDb ? { authSource: authDoc.authDb } : {}),
        });
        return { ok: 1 };
    }
    async createCollection(dbName, collName, options = {}, dbOptions) {
        options = { ...this.baseCmdOptions, ...options };
        await this.db(dbName, dbOptions).createCollection(collName, options);
        return { ok: 1 };
    }
    async createEncryptedCollection(dbName, collName, options, libmongocrypt) {
        return await libmongocrypt.createEncryptedCollection(this.db(dbName), collName, options);
    }
    async initializeBulkOp(dbName, collName, ordered, options = {}, dbOptions) {
        if (ordered) {
            return this.db(dbName, dbOptions)
                .collection(collName)
                .initializeOrderedBulkOp(options);
        }
        return this.db(dbName, dbOptions)
            .collection(collName)
            .initializeUnorderedBulkOp(options);
    }
    getReadPreference() {
        return this.mongoClient.readPreference;
    }
    getReadConcern() {
        return this.mongoClient.readConcern;
    }
    getWriteConcern() {
        return this.mongoClient.writeConcern;
    }
    readPreferenceFromOptions(options) {
        const { ReadPreference } = driver();
        return ReadPreference.fromOptions(options);
    }
    async resetConnectionOptions(options) {
        this.bus.emit('mongosh-sp:reset-connection-options');
        this.currentClientOptions = {
            ...this.currentClientOptions,
            ...options,
        };
        const clientOptions = this.processDriverOptions(this.uri, this.currentClientOptions);
        const { client, state } = await this.connectMongoClient(this.uri.toString(), clientOptions);
        try {
            await this.mongoClient.close();
        }
        catch (_a) { }
        this.mongoClient = client;
        this.currentClientOptions.parentState = state;
    }
    startSession(options) {
        return this.mongoClient.startSession(options);
    }
    watch(pipeline, options, dbOptions = {}, db, coll) {
        if (db === undefined && coll === undefined) {
            return this.mongoClient.watch(pipeline, options);
        }
        else if (db !== undefined && coll === undefined) {
            return this.db(db, dbOptions).watch(pipeline, options);
        }
        else if (db !== undefined && coll !== undefined) {
            return this.db(db, dbOptions).collection(coll).watch(pipeline, options);
        }
        throw new errors_1.MongoshInternalError('Cannot call watch with defined collection but undefined db');
    }
    get driverMetadata() {
        var _a;
        return (_a = this.getTopology()) === null || _a === void 0 ? void 0 : _a.clientMetadata;
    }
    getRawClient() {
        return this.mongoClient;
    }
    getURI() {
        var _a;
        return (_a = this.uri) === null || _a === void 0 ? void 0 : _a.href;
    }
    getFleOptions() {
        return this.currentClientOptions.autoEncryption;
    }
    static processDriverOptions(currentProviderInstance, uri, opts) {
        var _a;
        const processedOptions = { ...DEFAULT_DRIVER_OPTIONS, ...opts };
        if (currentProviderInstance === null || currentProviderInstance === void 0 ? void 0 : currentProviderInstance.currentClientOptions) {
            for (const key of ['productName', 'productDocsLink']) {
                processedOptions[key] =
                    currentProviderInstance.currentClientOptions[key];
            }
            (_a = processedOptions.oidc) !== null && _a !== void 0 ? _a : (processedOptions.oidc = {});
            for (const key of [
                'redirectURI',
                'openBrowser',
                'openBrowserTimeout',
                'notifyDeviceFlow',
                'allowedFlows',
            ]) {
                ((key) => {
                    var _a;
                    const value = (_a = currentProviderInstance.currentClientOptions.oidc) === null || _a === void 0 ? void 0 : _a[key];
                    if (value) {
                        processedOptions.oidc[key] = value;
                    }
                })(key);
            }
        }
        if (processedOptions.parentState ||
            processedOptions.parentHandle ||
            !currentProviderInstance) {
            return processedOptions;
        }
        const currentOpts = currentProviderInstance.currentClientOptions;
        const currentUri = currentProviderInstance.uri;
        if (currentUri &&
            (0, util_1.isDeepStrictEqual)(normalizeEndpointAndAuthConfiguration(currentUri, currentOpts), normalizeEndpointAndAuthConfiguration(uri, processedOptions))) {
            if (currentOpts.parentState) {
                processedOptions.parentState = currentOpts.parentState;
            }
            else if (currentOpts.parentHandle) {
                processedOptions.parentHandle = currentOpts.parentHandle;
            }
        }
        return processedOptions;
    }
    processDriverOptions(uri, opts) {
        return CliServiceProvider.processDriverOptions(this, uri, {
            productName: this.currentClientOptions.productName,
            productDocsLink: this.currentClientOptions.productDocsLink,
            ...opts,
        });
    }
    getSearchIndexes(database, collection, indexName, options, dbOptions) {
        const col = this.db(database, dbOptions).collection(collection);
        if (indexName === undefined) {
            return col.listSearchIndexes(options).toArray();
        }
        else {
            return col.listSearchIndexes(indexName, options).toArray();
        }
    }
    createSearchIndexes(database, collection, specs, dbOptions) {
        return this.db(database, dbOptions)
            .collection(collection)
            .createSearchIndexes(specs);
    }
    dropSearchIndex(database, collection, indexName, dbOptions) {
        return this.db(database, dbOptions)
            .collection(collection)
            .dropSearchIndex(indexName);
    }
    updateSearchIndex(database, collection, indexName, definition, dbOptions) {
        return this.db(database, dbOptions)
            .collection(collection)
            .updateSearchIndex(indexName, definition);
    }
    createClientEncryption(options) {
        const { ClientEncryption } = driver();
        return new ClientEncryption(this.mongoClient, options);
    }
}
exports.default = CliServiceProvider;
//# sourceMappingURL=cli-service-provider.js.map