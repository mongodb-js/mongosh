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
var mongosh_transport_core_1 = require("mongosh-transport-core");
var mongodb_stitch_server_sdk_1 = require("mongodb-stitch-server-sdk");
/**
 * Init error.
 */
var INIT_ERROR = 'Error authenticating with Stitch.';
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
        var mongoClient = stitchClient.
            getServiceClient(mongodb_stitch_server_sdk_1.RemoteMongoClient.factory, serviceName);
        this.stitchTransport =
            new mongosh_transport_core_1.StitchTransport(stitchClient, mongoClient);
    }
    /**
     * Create a StitchServerTransport from a Stitch app id.
     *
     * @param {String} stitchAppId - The Stitch app id.
     * @param {String} serviceName - The Stitch service name.
     *
     * @returns {Promise} The promise of the Stitch server transport.
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
     * @returns {Cursor} The aggregation cursor.
     */
    StitchServerTransport.prototype.aggregate = function (database, collection, pipeline) {
        if (pipeline === void 0) { pipeline = []; }
        return this.stitchTransport.aggregate(database, collection, pipeline);
    };
    /**
     * Not implemented in Stitch.
     *
     * @returns {Promise} The rejected promise.
     */
    StitchServerTransport.prototype.bulkWrite = function () {
        return this.stitchTransport.bulkWrite();
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
        return this.stitchTransport.countDocuments(database, collection, filter, options);
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
    StitchServerTransport.prototype.deleteMany = function (database, collection, filter) {
        if (filter === void 0) { filter = {}; }
        return this.stitchTransport.deleteMany(database, collection, filter);
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
    StitchServerTransport.prototype.deleteOne = function (database, collection, filter) {
        if (filter === void 0) { filter = {}; }
        return this.stitchTransport.deleteOne(database, collection, filter);
    };
    /**
     * Not implemented in Stitch.
     *
     * @returns {Promise} The rejected promise.
     */
    StitchServerTransport.prototype.distinct = function () {
        return this.stitchTransport.distinct();
    };
    /**
     * Not implemented in Stitch.
     *
     * @returns {Promise} The rejected promise.
     */
    StitchServerTransport.prototype.estimatedDocumentCount = function () {
        return this.stitchTransport.estimatedDocumentCount();
    };
    /**
     * Find documents in the collection.
     *
     * @param {String} database - The database name.
     * @param {String} collection - The collection name.
     * @param {Object} filter - The filter.
     * @param {Object} options - The find options.
     *
     * @returns {Cursor} The cursor.
     */
    StitchServerTransport.prototype.find = function (database, collection, filter, options) {
        if (filter === void 0) { filter = {}; }
        if (options === void 0) { options = {}; }
        return this.stitchTransport.find(database, collection, filter, options);
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
        return this.stitchTransport.findOneAndDelete(database, collection, filter, options);
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
        return this.stitchTransport.findOneAndReplace(database, collection, filter, replacement, options);
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
        return this.stitchTransport.findOneAndUpdate(database, collection, filter, update, options);
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
        return this.stitchTransport.insertMany(database, collection, docs);
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
        return this.stitchTransport.insertOne(database, collection, doc);
    };
    /**
     * Not implemented in Stitch.
     *
     * @returns {Promise} The rejected promise.
     */
    StitchServerTransport.prototype.replaceOne = function () {
        return this.stitchTransport.replaceOne();
    };
    /**
     * Not implemented in Stitch.
     *
     * @returns {Promise} The rejected promise.
     */
    StitchServerTransport.prototype.runCommand = function () {
        return this.stitchTransport.runCommand();
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
        return this.stitchTransport.updateMany(database, collection, filter, update, options);
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
        return this.stitchTransport.updateOne(database, collection, filter, update, options);
    };
    Object.defineProperty(StitchServerTransport.prototype, "userId", {
        /**
         * Get the current user id.
         *
         * @returns {String} The user id.
         */
        get: function () {
            return this.stitchTransport.userId;
        },
        enumerable: true,
        configurable: true
    });
    return StitchServerTransport;
}());
exports.default = StitchServerTransport;
