"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var mongodb_stitch_server_sdk_1 = require("mongodb-stitch-server-sdk");
/**
 * Constant for not implemented rejections.
 */
var NOT_IMPLEMENTED = 'is not implemented in the Stitch server SDK';
/**
 * Init error.
 */
var INIT_ERROR = 'Error authenticating with Stitch.';
/**
 * Rejecting for running an agg pipeline on a database.
 */
var AGG_ON_DB = 'Aggregations run on the database is not allowed via Stitch';
/**
 * Atlas id.
 */
var ATLAS = 'mongodb-atlas';
/**
 * Encapsulates logic for communicating with a MongoDB instance via
 * Stitch in the server.
 */
var StitchServerTransport = /** @class */ (function () {
    /**
     * Instantiate a new Stitch server transport with a connected stitch
     * client instance.
     *
     * @param {Client} stitchClient - The Stitch client instance.
     * @param {String} serviceName - The Mongo service name.
     */
    function StitchServerTransport(stitchClient, serviceName) {
        if (serviceName === void 0) { serviceName = ATLAS; }
        this.stitchClient = stitchClient;
        this.mongoClient = stitchClient.
            getServiceClient(mongodb_stitch_server_sdk_1.RemoteMongoClient.factory, serviceName);
    }
    /**
     * Create a StitchServerTransport from a Stitch app id.
     *
     * @param {String} stitchAppId - The Stitch app id.
     * @param {String} serviceName - The Stitch service name.
     *
     * @returns {StitchServerTransport} The Stitch server transport.
     */
    StitchServerTransport.fromAppId = function (stitchAppId, serviceName) {
        return __awaiter(this, void 0, void 0, function () {
            var client, err_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        client = mongodb_stitch_server_sdk_1.Stitch.initializeDefaultAppClient(stitchAppId);
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, client.auth.loginWithCredential(new mongodb_stitch_server_sdk_1.AnonymousCredential())];
                    case 2:
                        _a.sent();
                        return [3 /*break*/, 4];
                    case 3:
                        err_1 = _a.sent();
                        /* eslint no-console:0 */
                        console.log(INIT_ERROR, err_1);
                        client.close();
                        return [3 /*break*/, 4];
                    case 4: return [2 /*return*/, new StitchServerTransport(client, serviceName)];
                }
            });
        });
    };
    /**
     * Run an aggregation pipeline.
     *
     * @note: Passing a null collection will cause the
     *   aggregation to run on the DB.
     *
     * @param {String} database - The database name.
     * @param {String} collection - The collection name.
     * @param {Array} pipeline - The aggregation pipeline.
     * @param {Object} options - The pipeline options.
     *
     * @returns {Promise} The promise of the aggregation cursor.
     */
    StitchServerTransport.prototype.aggregate = function (database, collection, pipeline, options) {
        if (pipeline === void 0) { pipeline = []; }
        if (options === void 0) { options = {}; }
        if (collection === null) {
            return Promise.reject(AGG_ON_DB);
        }
        return this._db(database).collection(collection).
            aggregate(pipeline);
    };
    /**
     * Not implemented in Stitch.
     *
     * @returns {Promise} The rejected promise.
     */
    StitchServerTransport.prototype.bulkWrite = function () {
        return Promise.reject("Bulk write " + NOT_IMPLEMENTED);
    };
    /**
     * Get an exact document count from the collection.
     *
     * @param {String} database - The database name.
     * @param {String} collection - The collection name.
     * @param {Object} filter - The filter.
     * @param {Object} options - The count options.
     *
     * @returns {Promise} The promise of the count.
     */
    StitchServerTransport.prototype.countDocuments = function (database, collection, filter, options) {
        if (filter === void 0) { filter = {}; }
        if (options === void 0) { options = {}; }
        return this._db(database).collection(collection).count(filter, options);
    };
    /**
     * Delete multiple documents from the collection.
     *
     * @param {String} database - The database name.
     * @param {String} collection - The collection name.
     * @param {Object} filter - The filter.
     * @param {Object} options - The delete many options.
     *
     * @returns {Promise} The promise of the result.
     */
    StitchServerTransport.prototype.deleteMany = function (database, collection, filter, options) {
        if (filter === void 0) { filter = {}; }
        if (options === void 0) { options = {}; }
        return this._db(database).collection(collection).
            deleteMany(filter);
    };
    /**
     * Delete one document from the collection.
     *
     * @param {String} database - The database name.
     * @param {String} collection - The collection name.
     * @param {Object} filter - The filter.
     * @param {Object} options - The delete one options.
     *
     * @returns {Promise} The promise of the result.
     */
    StitchServerTransport.prototype.deleteOne = function (database, collection, filter, options) {
        if (filter === void 0) { filter = {}; }
        if (options === void 0) { options = {}; }
        return this._db(database).collection(collection).
            deleteOne(filter);
    };
    /**
     * Not implemented in Stitch.
     *
     * @returns {Promise} The rejected promise.
     */
    StitchServerTransport.prototype.distinct = function () {
        return Promise.reject("Distinct " + NOT_IMPLEMENTED);
    };
    /**
     * Not implemented in Stitch.
     *
     * @returns {Promise} The rejected promise.
     */
    StitchServerTransport.prototype.estimatedDocumentCount = function () {
        return Promise.reject("Estimated document count " + NOT_IMPLEMENTED);
    };
    /**
     * Find documents in the collection.
     *
     * @param {String} database - The database name.
     * @param {String} collection - The collection name.
     * @param {Object} filter - The filter.
     * @param {Object} options - The find options.
     *
     * @returns {Promise} The promise of the cursor.
     */
    StitchServerTransport.prototype.find = function (database, collection, filter, options) {
        if (filter === void 0) { filter = {}; }
        if (options === void 0) { options = {}; }
        return this._db(database).collection(collection).
            find(filter, options);
    };
    /**
     * Find one document and delete it.
     *
     * @param {String} database - The database name.
     * @param {String} collection - The collection name.
     * @param {Object} filter - The filter.
     * @param {Object} options - The find options.
     *
     * @returns {Promise} The promise of the result.
     */
    StitchServerTransport.prototype.findOneAndDelete = function (database, collection, filter, options) {
        if (filter === void 0) { filter = {}; }
        if (options === void 0) { options = {}; }
        return this._db(database).collection(collection).
            findOneAndDelete(filter, options);
    };
    /**
     * Find one document and replace it.
     *
     * @param {String} database - The database name.
     * @param {String} collection - The collection name.
     * @param {Object} filter - The filter.
     * @param {Object} replacement - The replacement.
     * @param {Object} options - The find options.
     *
     * @returns {Promise} The promise of the result.
     */
    StitchServerTransport.prototype.findOneAndReplace = function (database, collection, filter, replacement, options) {
        if (filter === void 0) { filter = {}; }
        if (replacement === void 0) { replacement = {}; }
        if (options === void 0) { options = {}; }
        return this._db(database).collection(collection).
            findOneAndReplace(filter, replacement, options);
    };
    /**
     * Find one document and update it.
     *
     * @param {String} database - The database name.
     * @param {String} collection - The collection name.
     * @param {Object} filter - The filter.
     * @param {(Object|Array)} update - The update.
     * @param {Object} options - The find options.
     *
     * @returns {Promise} The promise of the result.
     */
    StitchServerTransport.prototype.findOneAndUpdate = function (database, collection, filter, update, options) {
        if (filter === void 0) { filter = {}; }
        if (update === void 0) { update = {}; }
        if (options === void 0) { options = {}; }
        return this._db(database).collection(collection).
            findOneAndUpdate(filter, update, options);
    };
    /**
     * Insert many documents into the colleciton.
     *
     * @param {String} database - The database name.
     * @param {String} collection - The collection name.
     * @param {Array} docs - The documents.
     * @param {Object} options - The insert many options.
     *
     * @returns {Promise} The promise of the result.
     */
    StitchServerTransport.prototype.insertMany = function (database, collection, docs, options) {
        if (docs === void 0) { docs = []; }
        if (options === void 0) { options = {}; }
        return this._db(database).collection(collection).
            insertMany(docs);
    };
    /**
     * Insert one document into the collection.
     *
     * @param {String} database - The database name.
     * @param {String} collection - The collection name.
     * @param {Object} doc - The document.
     * @param {Object} options - The insert one options.
     *
     * @returns {Promise} The promise of the result.
     */
    StitchServerTransport.prototype.insertOne = function (database, collection, doc, options) {
        if (doc === void 0) { doc = {}; }
        if (options === void 0) { options = {}; }
        return this._db(database).collection(collection).
            insertOne(doc);
    };
    /**
     * Not implemented in Stitch.
     *
     * @returns {Promise} The rejected promise.
     */
    StitchServerTransport.prototype.replaceOne = function () {
        return Promise.reject("Replace one " + NOT_IMPLEMENTED);
    };
    /**
     * Not implemented in Stitch.
     *
     * @returns {Promise} The rejected promise.
     */
    StitchServerTransport.prototype.runCommand = function () {
        return Promise.reject("Running a direct command " + NOT_IMPLEMENTED);
    };
    /**
     * Update many document.
     *
     * @param {String} database - The database name.
     * @param {String} collection - The collection name.
     * @param {Object} filter - The filter.
     * @param {(Object|Array)} update - The updates.
     * @param {Object} options - The update options.
     *
     * @returns {Promise} The promise of the result.
     */
    StitchServerTransport.prototype.updateMany = function (database, collection, filter, update, options) {
        if (filter === void 0) { filter = {}; }
        if (update === void 0) { update = {}; }
        if (options === void 0) { options = {}; }
        return this._db(database).collection(collection).
            updateMany(filter, update, options);
    };
    /**
     * Update a document.
     *
     * @param {String} database - The database name.
     * @param {String} collection - The collection name.
     * @param {Object} filter - The filter.
     * @param {(Object|Array)} update - The updates.
     * @param {Object} options - The update options.
     *
     * @returns {Promise} The promise of the result.
     */
    StitchServerTransport.prototype.updateOne = function (database, collection, filter, update, options) {
        if (filter === void 0) { filter = {}; }
        if (update === void 0) { update = {}; }
        if (options === void 0) { options = {}; }
        return this._db(database).collection(collection).
            updateOne(filter, update, options);
    };
    Object.defineProperty(StitchServerTransport.prototype, "userId", {
        /**
         * Get the current user id.
         *
         * @returns {String} The user id.
         */
        get: function () {
            return this.stitchClient.auth.user.id;
        },
        enumerable: true,
        configurable: true
    });
    /**
     * Get the DB object from the client.
     *
     * @param {String} name - The database name.
     *
     * @returns {Db} The database.
     */
    StitchServerTransport.prototype._db = function (name) {
        return this.mongoClient.db(name);
    };
    return StitchServerTransport;
}());
exports.default = StitchServerTransport;
