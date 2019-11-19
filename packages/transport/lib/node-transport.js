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
var mongodb_1 = require("mongodb");
/**
 * Default driver options we always use.
 */
var DEFAULT_OPTIONS = Object.freeze({
    useNewUrlParser: true,
    useUnifiedTopology: true
});
/**
 * Encapsulates logic for communicating with a MongoDB instance via
 * the Node Driver.
 */
var NodeTransport = /** @class */ (function () {
    /**
     * Instantiate a new Node transport with the Node driver's connected
     * MongoClient instance.
     *
     * @param {MongoClient} mongoClient - The Node drivers' MongoClient instance.
     */
    function NodeTransport(mongoClient) {
        this.mongoClient = mongoClient;
    }
    /**
     * Create a NodeTransport from a URI.
     *
     * @param {String} uri - The URI.
     *
     * @returns {NodeTransport} The Node transport.
     */
    NodeTransport.fromURI = function (uri) {
        return __awaiter(this, void 0, void 0, function () {
            var mongoClient;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        mongoClient = new mongodb_1.MongoClient(uri, DEFAULT_OPTIONS);
                        return [4 /*yield*/, mongoClient.connect()];
                    case 1:
                        _a.sent();
                        return [2 /*return*/, new NodeTransport(mongoClient)];
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
     * @note: Shell API sets writeConcern via options in object,
     * node driver flat.
     * @note: Shell API sets readConcern via options in object,
     * node driver flat.
     *
     * @param {String} database - The database name.
     * @param {String} collection - The collection name.
     * @param {Array} pipeline - The aggregation pipeline.
     * @param {Object} options - The pipeline options.
     *
     * @returns {Promise} The promise of the aggregation cursor.
     */
    NodeTransport.prototype.aggregate = function (database, collection, pipeline, options) {
        var dbOptions = {};
        if ('readConcern' in options) {
            dbOptions.readConcern = options.readConcern;
        }
        if ('writeConcern' in options) {
            dbOptions.writeConcern = options.writeConcern;
        }
        if (collection === null) {
            return this._db(database, dbOptions).aggregate(pipeline, options);
        }
        return this._db(database, dbOptions).collection(collection).
            aggregate(pipeline, options);
    };
    /**
     * Execute a mix of write operations.
     *
     * @note: Shell API sets writeConcern via options in object,
     * node driver flat.
     *
     * @param {String} database - The database name.
     * @param {String} collection - The collection name.
     * @param {Object} requests - The bulk write requests.
     * @param {Object} options - The bulk write options.
     *
     * @returns {Promise} The promise of the result.
     */
    NodeTransport.prototype.bulkWrite = function (database, collection, requests, options) {
        if (requests === void 0) { requests = {}; }
        if (options === void 0) { options = {}; }
        var bulkOptions = {};
        if ('writeConcern' in options) {
            Object.assign(bulkOptions, options.writeConcern);
        }
        if ('ordered' in options) {
            bulkOptions.ordered = options.ordered;
        }
        return this._db(database).collection(collection).
            bulkWrite(requests, options);
    };
    /**
     * Deprecated count command.
     *
     * @note: Shell API passes readConcern via options, node via collection
     * @note: Shell API passes collation as option, node driver via cursor.
     *
     * @param {String} database - The database name.
     * @param {String} collection - The collection name.
     * @param {Object} query - The filter.
     * @param {Object} options - The count options.
     *
     * @returns {Promise} The promise of the count.
     */
    NodeTransport.prototype.count = function (database, collection, query, options) {
        if (query === void 0) { query = {}; }
        if (options === void 0) { options = {}; }
        var collOpts = {};
        if ('readConcern' in options) {
            collOpts.readConcern = options.readConcern;
        }
        var cursor = this._db(database).collection(collection, collOpts).count(query);
        if ('collation' in options) {
            return cursor.collation(options.collation);
        }
        return cursor;
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
    NodeTransport.prototype.countDocuments = function (database, collection, filter, options) {
        if (filter === void 0) { filter = {}; }
        if (options === void 0) { options = {}; }
        return this._db(database).collection(collection).
            countDocuments(filter, options);
    };
    /**
     * Delete multiple documents from the collection.
     *
     * @note: Shell API sets writeConcern via options in object,
     * node driver flat.
     * @note: Shell API passes collation as option, node driver via cursor.
     *
     * @param {String} database - The database name.
     * @param {String} collection - The collection name.
     * @param {Object} filter - The filter.
     * @param {Object} options - The delete many options.
     *
     * @returns {Promise} The promise of the result.
     */
    NodeTransport.prototype.deleteMany = function (database, collection, filter, options) {
        if (filter === void 0) { filter = {}; }
        if (options === void 0) { options = {}; }
        var cmdOpts = {};
        if ('writeConcern' in options) {
            Object.assign(cmdOpts, options.writeConcern);
        }
        var cursor = this._db(database).collection(collection).
            deleteMany(filter, cmdOpts);
        if ('collation' in options) {
            return cursor.collation(options.collation);
        }
        return cursor;
    };
    /**
     * Delete one document from the collection.
     *
     * @note: Shell API sets writeConcern via options in object,
     * node driver flat.
     * @note: Shell API passes collation as option, node driver via cursor.
     *
     * @param {String} database - The database name.
     * @param {String} collection - The collection name.
     * @param {Object} filter - The filter.
     * @param {Object} options - The delete one options.
     *
     * @returns {Promise} The promise of the result.
     */
    NodeTransport.prototype.deleteOne = function (database, collection, filter, options) {
        if (filter === void 0) { filter = {}; }
        if (options === void 0) { options = {}; }
        var cmdOpts = {};
        if ('writeConcern' in options) {
            Object.assign(cmdOpts, options.writeConcern);
        }
        var cursor = this._db(database).collection(collection).
            deleteOne(filter, cmdOpts);
        if ('collation' in options) {
            return cursor.collation(options.collation);
        }
        return cursor;
    };
    /**
     * Get distinct values for the field.
     *
     * @note: Shell API passes collation as option, node driver via cursor.
     *
     * @param {String} database - The database name.
     * @param {String} collection - The collection name.
     * @param {String} fieldName - The field name.
     * @param {Object} filter - The filter.
     * @param {Object} options - The distinct options.
     *
     * @returns {Promise} The promise of the cursor.
     */
    NodeTransport.prototype.distinct = function (database, collection, fieldName, filter, options) {
        if (filter === void 0) { filter = {}; }
        if (options === void 0) { options = {}; }
        var cursor = this._db(database).collection(collection).
            distinct(fieldName, filter, options);
        if ('collation' in cursor) {
            return cursor.collation(options.collation);
        }
        return cursor;
    };
    /**
     * Get an estimated document count from the collection.
     *
     * @param {String} database - The database name.
     * @param {String} collection - The collection name.
     * @param {Object} options - The count options.
     *
     * @returns {Promise} The promise of the count.
     */
    NodeTransport.prototype.estimatedDocumentCount = function (database, collection, options) {
        if (options === void 0) { options = {}; }
        return this._db(database).collection(collection).
            estimatedDocumentCount(options);
    };
    /**
     * Find documents in the collection.
     *
     * @note: Shell API passes filter and projection to find,
     * node driver uses filter and options.
     *
     * @param {String} database - The database name.
     * @param {String} collection - The collection name.
     * @param {Object} filter - The filter.
     * @param {Object} projection - The projection.
     *
     * @returns {Promise} The promise of the cursor.
     */
    NodeTransport.prototype.find = function (database, collection, filter, projection) {
        if (filter === void 0) { filter = {}; }
        if (projection === void 0) { projection = {}; }
        var options = {};
        if (projection) {
            options.projection = projection;
        }
        return this._db(database).collection(collection).
            find(filter, options);
    };
    // TODO
    NodeTransport.prototype.findAndModify = function (database, collection, document) { };
    /**
     * Find one document and delete it.
     *
     * @note: Shell API passes collation as option, node driver via cursor.
     *
     * @param {String} database - The database name.
     * @param {String} collection - The collection name.
     * @param {Object} filter - The filter.
     * @param {Object} options - The find options.
     *
     * @returns {Promise} The promise of the result.
     */
    NodeTransport.prototype.findOneAndDelete = function (database, collection, filter, options) {
        if (filter === void 0) { filter = {}; }
        if (options === void 0) { options = {}; }
        var cursor = this._db(database).collection(collection).
            findOneAndDelete(filter, options);
        if ('collation' in options) {
            return cursor.collation(options.collation);
        }
        return cursor;
    };
    /**
     * Find one document and replace it.
     *
     * @note: Shell API passes collation as option, node driver via cursor.
     *
     * @param {String} database - The database name.
     * @param {String} collection - The collection name.
     * @param {Object} filter - The filter.
     * @param {Object} replacement - The replacement.
     * @param {Object} options - The find options.
     *
     * @returns {Promise} The promise of the result.
     */
    NodeTransport.prototype.findOneAndReplace = function (database, collection, filter, replacement, options) {
        if (filter === void 0) { filter = {}; }
        if (replacement === void 0) { replacement = {}; }
        if (options === void 0) { options = {}; }
        var cursor = this._db(database).collection(collection).
            findOneAndReplace(filter, replacement, options);
        if ('collation' in options) {
            return cursor.collation(options.collation);
        }
        return cursor;
    };
    /**
     * Find one document and update it.
     *
     * @note: Shell API passes collation as option, node driver via cursor.
     *
     * @param {String} database - The database name.
     * @param {String} collection - The collection name.
     * @param {Object} filter - The filter.
     * @param {(Object|Array)} update - The update.
     * @param {Object} options - The find options.
     *
     * @returns {Promise} The promise of the result.
     */
    NodeTransport.prototype.findOneAndUpdate = function (database, collection, filter, update, options) {
        if (filter === void 0) { filter = {}; }
        if (update === void 0) { update = {}; }
        if (options === void 0) { options = {}; }
        var cursor = this._db(database).collection(collection).
            findOneAndUpdate(filter, update, options);
        if ('collation' in options) {
            return cursor.collation(options.collation);
        }
        return cursor;
    };
    /**
     * Insert many documents into the collection.
     *
     * @note: Shell API sets writeConcern via options in object,
     * node driver flat.
     *
     * @param {String} database - The database name.
     * @param {String} collection - The collection name.
     * @param {Array} docs - The documents.
     * @param {Object} options - The insert many options.
     *
     * @returns {Promise} The promise of the result.
     */
    NodeTransport.prototype.insertMany = function (database, collection, docs, options) {
        if (docs === void 0) { docs = []; }
        if (options === void 0) { options = {}; }
        var cmdOpts = {};
        if ('writeConcern' in options) {
            Object.assign(cmdOpts, options.writeConcern);
        }
        if ('ordered' in options) {
            cmdOpts.ordered = options.ordered;
        }
        return this._db(database).collection(collection).
            insertMany(docs, cmdOpts);
    };
    /**
     * Insert one document into the collection.
     *
     * @note: Shell API sets writeConcern via options in object,
     * node driver flat.
     *
     * @param {String} database - The database name.
     * @param {String} collection - The collection name.
     * @param {Object} doc - The document.
     * @param {Object} options - The insert one options.
     *
     * @returns {Promise} The promise of the result.
     */
    NodeTransport.prototype.insertOne = function (database, collection, doc, options) {
        if (doc === void 0) { doc = {}; }
        if (options === void 0) { options = {}; }
        var cmdOpts = {};
        if ('writeConcern' in options) {
            Object.assign(cmdOpts, options.writeConcern);
        }
        return this._db(database).collection(collection).
            insertOne(doc, options);
    };
    /**
     * Is the collection capped?
     *
     * @param database
     * @param collection
     * @return {Promise}
     */
    NodeTransport.prototype.isCapped = function (database, collection) {
        return this._db(database).collection(collection).isCapped();
    };
    /**
     * Deprecated remove command.
     *
     * @note: Shell API sets writeConcern via options in object,
     * node driver flat.
     * @note: Shell API passes collation as option, node driver via cursor.
     *
     * @param database
     * @param collection
     * @param query
     * @param options
     * @return {Promise}
     */
    NodeTransport.prototype.remove = function (database, collection, query, options) {
        var removeOptions = {};
        if (typeof options === 'boolean') {
            removeOptions = { single: options };
        }
        if ('writeConcern' in options) {
            Object.assign(removeOptions, options.writeConcern);
        }
        var cursor = this._db(database).collection(collection)
            .remove(query, options);
        if ('collation' in options) {
            return cursor.collation(options.collation);
        }
        return cursor;
    };
    /**
     * Deprecated save command.
     *
     * @note: Shell API sets writeConcern via options in object,
     * node driver flat.
     *
     * @param database
     * @param collection
     * @param doc
     * @param options
     * @return {Promise}
     */
    NodeTransport.prototype.save = function (database, collection, doc, options) {
        var saveOptions = {};
        if ('writeConcern' in options) {
            Object.assign(saveOptions, options.writeConcern);
        }
        return this._db(database).collection(collection)
            .save(doc, saveOptions);
    };
    /**
     * Replace a document with another.
     *
     * @note: Shell API sets writeConcern via options in object,
     * node driver flat.
     * @note: Shell API sets collation via options, node driver via cursor.
     *
     * @param {String} database - The database name.
     * @param {String} collection - The collection name.
     * @param {Object} filter - The filter.
     * @param {Object} replacement - The replacement document for matches.
     * @param {Object} options - The replace options.
     *
     * @returns {Promise} The promise of the result.
     */
    NodeTransport.prototype.replaceOne = function (database, collection, filter, replacement, options) {
        if (filter === void 0) { filter = {}; }
        if (replacement === void 0) { replacement = {}; }
        if (options === void 0) { options = {}; }
        var cmdOpts = {};
        if ('writeConcern' in options) {
            Object.assign(cmdOpts, options.writeConcern);
        }
        var cursor = this._db(database).collection(collection).
            replaceOne(filter, replacement, cmdOpts);
        if ('collation' in options) {
            return cursor.collation(options.collation);
        }
        return cursor;
    };
    /**
     * Run a command against the database.
     *
     * @param {String} database - The database name.
     * @param {Object} spec - The command specification.
     * @param {Object} options - The database options.
     *
     * @returns {Promise} The promise of command results.
     */
    NodeTransport.prototype.runCommand = function (database, spec, options) {
        if (options === void 0) { options = {}; }
        return this._db(database).command(spec, options);
    };
    /**
     * Update many documents.
     *
     * @note: Shell API sets writeConcern via options in object,
     * node driver flat.
     * @note: Shell API sets collation via options, node driver via cursor.
     *
     * @param {String} database - The database name.
     * @param {String} collection - The collection name.
     * @param {Object} filter - The filter.
     * @param {(Object|Array)} update - The updates.
     * @param {Object} options - The update options.
     *
     * @returns {Promise} The promise of the result.
     */
    NodeTransport.prototype.updateMany = function (database, collection, filter, update, options) {
        if (filter === void 0) { filter = {}; }
        if (update === void 0) { update = {}; }
        if (options === void 0) { options = {}; }
        var cmdOpts = {};
        if ('writeConcern' in options) {
            Object.assign(cmdOpts, options.writeConcern);
        }
        var cursor = this._db(database).collection(collection).
            updateMany(filter, update, cmdOpts);
        if ('collation' in options) {
            return cursor.collation(options.collation);
        }
        return cursor;
    };
    /**
     * Update a document.
     *
     * @note: Shell API sets writeConcern via options in object,
     * node driver flat.
     * @note: Shell API sets collation via options, node driver via cursor.
     * TODO: Shell API provides 'hint' but node driver does not
     *
     * @param {String} database - The database name.
     * @param {String} collection - The collection name.
     * @param {Object} filter - The filter.
     * @param {(Object|Array)} update - The updates.
     * @param {Object} options - The update options.
     *
     * @returns {Promise} The promise of the result.
     */
    NodeTransport.prototype.updateOne = function (database, collection, filter, update, options) {
        if (filter === void 0) { filter = {}; }
        if (update === void 0) { update = {}; }
        if (options === void 0) { options = {}; }
        var cmdOpts = {};
        if ('writeConcern' in options) {
            Object.assign(cmdOpts, options.writeConcern);
        }
        var cursor = this._db(database).collection(collection).
            updateOne(filter, update, cmdOpts);
        if ('collation' in options) {
            return cursor.collation(options.collation);
        }
        return cursor;
    };
    /**
     * Get the DB object from the client.
     *
     * @param {String} name - The database name.
     *
     * @returns {Db} The database.
     */
    NodeTransport.prototype._db = function (name) {
        return this.mongoClient.db(name);
    };
    return NodeTransport;
}());
exports.default = NodeTransport;
