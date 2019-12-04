"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
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
var Cursor = /** @class */ (function () {
    function Cursor(cursor) {
        this.cursor = cursor;
    }
    Cursor.prototype.addOption = function (option) {
        var dbOption = {
            2: "tailable",
            4: "slaveOk",
            8: "oplogReplay",
            16: "noTimeout",
            32: "awaitData",
            64: "exhaust",
            128: "partial"
        };
        var opt = dbOption[option];
        if (opt === 'slaveOk' || !!opt) { } // TODO
        this.cursor.addCursorFlag(opt, true);
        return this;
    };
    Cursor.prototype.allowPartialResults = function () {
        this.cursor.addCursorFlag('partial', true);
        return this;
    };
    Cursor.prototype.batchSize = function (size) {
        this.cursor.setCursorBatchSize(size);
        return this;
    };
    Cursor.prototype.close = function () {
        this.cursor.close();
        return this;
    };
    Cursor.prototype.isClosed = function () {
        return this.cursor.isClosed();
    };
    Cursor.prototype.collation = function (doc) {
        this.cursor.collation(doc);
        return this;
    };
    Cursor.prototype.comment = function (cmt) {
        this.cursor.comment(cmt);
        return this;
    };
    Cursor.prototype.count = function () {
        return this.cursor.count();
    };
    Cursor.prototype.explain = function () {
        this.cursor.explain();
        return this;
    };
    Cursor.prototype.forEach = function (f) {
        this.cursor.forEach(f);
        return this;
    };
    Cursor.prototype.hasNext = function () {
        return this.cursor.hasNext();
    };
    Cursor.prototype.hint = function (index) {
        this.cursor.hint(index);
        return this;
    };
    Cursor.prototype.getQueryPlan = function () {
        this.cursor.explain('executionStats');
        return this;
    };
    Cursor.prototype.isExhausted = function () {
        return this.cursor.isClosed() && !this.cursor.hasNext();
    };
    Cursor.prototype.itcount = function () {
        return this.cursor.toArray().length;
    };
    Cursor.prototype.limit = function (l) {
        this.cursor.limit(l);
        return this;
    };
    Cursor.prototype.map = function (f) {
        this.cursor.map(f);
        return this;
    };
    Cursor.prototype.max = function (indexBounds) {
        this.cursor.max(indexBounds);
        return this;
    };
    Cursor.prototype.maxTimeMS = function (ms) {
        this.cursor.maxTimeMS(ms);
        return this;
    };
    Cursor.prototype.min = function (indexBounds) {
        this.cursor.min(indexBounds);
        return this;
    };
    Cursor.prototype.next = function () {
        return this.cursor.next();
    };
    Cursor.prototype.modifiers = function () {
        return this.cursor.cmd;
    };
    Cursor.prototype.noCursorTimeout = function () {
        this.cursor.addCursorFlag('noCursorTimeout', true);
        return this;
    };
    Cursor.prototype.objsLeftInBatch = function () {
        // TODO
    };
    Cursor.prototype.oplogReplay = function () {
        this.cursor.addCursorFlag('oplogReplay', true);
        return this;
    };
    Cursor.prototype.projection = function (v) {
        this.cursor.project(v);
        return this;
    };
    Cursor.prototype.pretty = function () {
        // TODO
    };
    Cursor.prototype.readConcern = function (v) {
        // TODO
    };
    Cursor.prototype.readPref = function (v) {
        this.cursor.setReadPreference(v);
        return this;
    };
    Cursor.prototype.returnKey = function () {
        this.cursor.returnKey();
        return this;
    };
    Cursor.prototype.showDiskLoc = function () {
        this.cursor.showRecordId(true);
        return this;
    };
    Cursor.prototype.showRecordId = function () {
        this.cursor.showRecordId(true);
        return this;
    };
    Cursor.prototype.size = function () {
        return this.cursor.count(); // TODO: size same as count?
    };
    Cursor.prototype.skip = function (s) {
        this.cursor.skip(s);
        return this;
    };
    Cursor.prototype.sort = function (s) {
        this.cursor.sort(s);
        return this;
    };
    Cursor.prototype.tailable = function () {
        this.cursor.addCursorFlag('tailable', true);
        return this;
    };
    Cursor.prototype.toArray = function () {
        return this.cursor.toArray();
    };
    return Cursor;
}());
var DeleteResult = /** @class */ (function () {
    function DeleteResult(driverResult) {
        this.acknowledged = driverResult.acknowledged;
        this.deletedCount = driverResult.deletedCount;
    }
    return DeleteResult;
}());
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
     * Run an aggregation pipeline on a collection.
     *
     * @param {String} db - The db name.
     * @param {String} coll - The collection name.
     * @param {Array} pipeline - The aggregation pipeline.
     * @param {Object} options - The pipeline options.
     * @param {Object} dbOptions - The database options, i.e. read/writeConcern
     *
     * @returns {Promise} The promise of the aggregation cursor.
     */
    NodeTransport.prototype.aggregate = function (db, coll, pipeline, options, dbOptions) {
        if (pipeline === void 0) { pipeline = []; }
        if (options === void 0) { options = {}; }
        if (dbOptions === void 0) { dbOptions = {}; }
        return new Cursor(this._db(db, dbOptions).collection(coll).aggregate(pipeline, options));
    };
    /**
     * Run an aggregation pipeline on a database.
     *
     * @param {String} db - The db name.
     * @param {Array} pipeline - The aggregation pipeline.
     * @param {Object} options - The pipeline options.
     * @param {Object} dbOptions - The database options, i.e. read/writeConcern
     *
     * @returns {Promise} The promise of the aggregation cursor.
     */
    NodeTransport.prototype.aggregateDb = function (db, pipeline, options, dbOptions) {
        if (pipeline === void 0) { pipeline = []; }
        if (options === void 0) { options = {}; }
        if (dbOptions === void 0) { dbOptions = {}; }
        return new Cursor(this._db(db, dbOptions).aggregate(pipeline, options));
    };
    /**
     * Execute a mix of write operations.
     *
     * @param {String} db - The db name.
     * @param {String} coll - The collection name.
     * @param {Array} requests - The bulk write requests.
     * @param {Object} options - The bulk write options.
     * @param {Object} dbOptions - The database options, i.e. read/writeConcern
     *
     * @returns {Promise} The promise of the result.
     */
    NodeTransport.prototype.bulkWrite = function (db, coll, requests, options, dbOptions) {
        if (requests === void 0) { requests = {}; }
        if (options === void 0) { options = {}; }
        if (dbOptions === void 0) { dbOptions = {}; }
        return this._db(db, dbOptions).collection(coll).bulkWrite(requests, options);
    };
    /**
     * Deprecated count command.
     *
     * @param {String} db - The db name.
     * @param {String} coll - The collection name.
     * @param {Object} query - The filter.
     * @param {Object} options - The count options.
     * @param {Object} dbOptions - The database option i.e. read/writeConcern
     *
     * @returns {Promise} The promise of the count.
     */
    NodeTransport.prototype.count = function (db, coll, query, options, dbOptions) {
        if (query === void 0) { query = {}; }
        if (options === void 0) { options = {}; }
        if (dbOptions === void 0) { dbOptions = {}; }
        return this._db(db, dbOptions).collection(coll).count(query);
    };
    /**
     * Get an exact document count from the coll.
     *
     * @param {String} db - The db name.
     * @param {String} coll - The collection name.
     * @param {Object} filter - The filter.
     * @param {Object} options - The count options.
     *
     * @returns {Promise} The promise of the count.
     */
    NodeTransport.prototype.countDocuments = function (db, coll, filter, options) {
        if (filter === void 0) { filter = {}; }
        if (options === void 0) { options = {}; }
        return this._db(db).collection(coll).countDocuments(filter, options);
    };
    /**
     * Delete multiple documents from the coll.
     *
     * @param {String} db - The db name.
     * @param {String} coll - The collection name.
     * @param {Object} filter - The filter.
     * @param {Object} options - The delete many options.
     * @param {Object} dbOptions - The database options, i.e. read/writeConcern
     *
     * @returns {Promise} The promise of the result.
     */
    NodeTransport.prototype.deleteMany = function (db, coll, filter, options, dbOptions) {
        if (filter === void 0) { filter = {}; }
        if (options === void 0) { options = {}; }
        if (dbOptions === void 0) { dbOptions = {}; }
        return new DeleteResult(this._db(db, dbOptions).collection(coll).deleteMany(filter, options));
    };
    /**
     * Delete one document from the coll.
     *
     * @param {String} db - The db name.
     * @param {String} coll - The collection name.
     * @param {Object} filter - The filter.
     * @param {Object} options - The delete one options.
     * @param {Object} dbOptions - The database options, i.e. read/writeConcern
     *
     * @returns {Promise} The promise of the result.
     */
    NodeTransport.prototype.deleteOne = function (db, coll, filter, options, dbOptions) {
        if (filter === void 0) { filter = {}; }
        if (options === void 0) { options = {}; }
        if (dbOptions === void 0) { dbOptions = {}; }
        return this._db(db, dbOptions).collection(coll).deleteOne(filter, options);
    };
    /**
     * Get distinct values for the field.
     *
     * @param {String} db - The db name.
     * @param {String} coll - The collection name.
     * @param {String} fieldName - The field name.
     * @param {Object} filter - The filter.
     * @param {Object} options - The distinct options.
     * @param {Object} dbOptions - The database options, i.e. read/writeConcern
     *
     * @returns {Promise} The promise of the cursor.
     */
    NodeTransport.prototype.distinct = function (db, coll, fieldName, filter, options, dbOptions) {
        if (filter === void 0) { filter = {}; }
        if (options === void 0) { options = {}; }
        if (dbOptions === void 0) { dbOptions = {}; }
        return this._db(db, dbOptions).collection(coll).
            distinct(fieldName, filter, options);
    };
    /**
     * Get an estimated document count from the coll.
     *
     * @param {String} db - The db name.
     * @param {String} coll - The collection name.
     * @param {Object} options - The count options.
     *
     * @returns {Promise} The promise of the count.
     */
    NodeTransport.prototype.estimatedDocumentCount = function (db, coll, options) {
        if (options === void 0) { options = {}; }
        return this._db(db).collection(coll).
            estimatedDocumentCount(options);
    };
    /**
     * Find documents in the collection.
     *
     * @param {String} db - The db name.
     * @param {String} coll - The collection name.
     * @param {Object} filter - The filter.
     * @param {Object} options - The find options.
     *
     * @returns {Promise} The promise of the cursor.
     */
    NodeTransport.prototype.find = function (db, coll, filter, options) {
        if (filter === void 0) { filter = {}; }
        if (options === void 0) { options = {}; }
        var findOptions = __assign({}, options);
        Object.assign(findOptions, options);
        if ('allowPartialResults' in findOptions) {
            // @ts-ignore
            findOptions.partial = findOptions.allowPartialResults;
        }
        if ('noCursorTimeout' in findOptions) {
            // @ts-ignore
            findOptions.timeout = findOptions.noCursorTimeout;
        }
        if ('tailable' in findOptions) {
            // @ts-ignore
            findOptions.cursorType = findOptions.tailable ? 'TAILABLE' : 'NON_TAILABLE'; // TODO
        }
        return new Cursor(this._db(db).collection(coll).find(filter, options));
    };
    // TODO
    // findAndModify(db, collection, document) {}
    /**
     * Find one document and delete it.
     *
     * @param {String} db - The db name.
     * @param {String} coll - The collection name.
     * @param {Object} filter - The filter.
     * @param {Object} options - The find options.
     *
     * @returns {Promise} The promise of the result.
     */
    NodeTransport.prototype.findOneAndDelete = function (db, coll, filter, options) {
        if (filter === void 0) { filter = {}; }
        if (options === void 0) { options = {}; }
        return this._db(db).collection(coll).findOneAndDelete(filter, options);
    };
    /**
     * Find one document and replace it.
     *
     * @param {String} db - The db name.
     * @param {String} coll - The collection name.
     * @param {Object} filter - The filter.
     * @param {Object} replacement - The replacement.
     * @param {Object} options - The find options.
     *
     * @returns {Promise} The promise of the result.
     */
    NodeTransport.prototype.findOneAndReplace = function (db, coll, filter, replacement, options) {
        if (filter === void 0) { filter = {}; }
        if (replacement === void 0) { replacement = {}; }
        if (options === void 0) { options = {}; }
        var findOneAndReplaceOptions = __assign({}, options);
        if ('returnDocument' in options) {
            // @ts-ignore
            findOneAndReplaceOptions.returnOriginal = options.returnDocument;
            // @ts-ignore
            delete findOneAndReplaceOptions.returnDocument;
        }
        return this._db(db).collection(coll).
            findOneAndReplace(filter, replacement, findOneAndReplaceOptions);
    };
    /**
     * Find one document and update it.
     *
     * @param {String} db - The db name.
     * @param {String} coll - The collection name.
     * @param {Object} filter - The filter.
     * @param {(Object|Array)} update - The update.
     * @param {Object} options - The find options.
     *
     * @returns {Promise} The promise of the result.
     */
    NodeTransport.prototype.findOneAndUpdate = function (db, coll, filter, update, options) {
        if (filter === void 0) { filter = {}; }
        if (update === void 0) { update = {}; }
        if (options === void 0) { options = {}; }
        var findOneAndUpdateOptions = __assign({}, options);
        if ('returnDocument' in options) {
            // @ts-ignore
            findOneAndReplaceOptions.returnOriginal = options.returnDocument;
            // @ts-ignore
            delete findOneAndReplaceOptions.returnDocument;
        }
        return this._db(db).collection(coll).
            findOneAndUpdate(filter, update, findOneAndUpdateOptions);
    };
    /**
     * Insert many documents into the collection.
     *
     * @param {String} db - The db name.
     * @param {String} coll - The collection name.
     * @param {Array} docs - The documents.
     * @param {Object} options - The insert many options.
     * @param {Object} dbOptions - The database options, i.e. read/writeConcern
     *
     * @returns {Promise} The promise of the result.
     */
    NodeTransport.prototype.insertMany = function (db, coll, docs, options, dbOptions) {
        if (docs === void 0) { docs = []; }
        if (options === void 0) { options = {}; }
        if (dbOptions === void 0) { dbOptions = {}; }
        return this._db(db, dbOptions).collection(coll).insertMany(docs, options);
    };
    /**
     * Insert one document into the collection.
     *
     * @param {String} db - The db name.
     * @param {String} coll - The collection name.
     * @param {Object} doc - The document.
     * @param {Object} options - The insert one options.
     * @param {Object} dbOptions - The database options, i.e. read/writeConcern
     *
     * @returns {Promise} The promise of the result.
     */
    NodeTransport.prototype.insertOne = function (db, coll, doc, options, dbOptions) {
        if (doc === void 0) { doc = {}; }
        if (options === void 0) { options = {}; }
        if (dbOptions === void 0) { dbOptions = {}; }
        return this._db(db, dbOptions).collection(coll).insertOne(doc, options);
    };
    /**
     * Is the collection capped?
     *
     * @param db
     * @param coll
     * @return {Promise}
     */
    NodeTransport.prototype.isCapped = function (db, coll) {
        return this._db(db).collection(coll).isCapped();
    };
    /**
     * Deprecated remove command.
     *
     * @param {String} db - The db name.
     * @param {String} coll - The collection name.
     * @param {Object} query - The query.
     * @param {Object} options - The options.
     * @param {Object} dbOptions - The db options.
     * @return {Promise}
     */
    NodeTransport.prototype.remove = function (db, coll, query, options, dbOptions) {
        return this._db(db).collection(coll).remove(query, options);
    };
    /**
     * Deprecated save command.
     *
     * @note: Shell API sets writeConcern via options in object,
     * node driver flat.
     *
     * @param db
     * @param coll
     * @param doc
     * @param options
     * @return {Promise}
     */
    NodeTransport.prototype.save = function (db, coll, doc, options, dbOptions) {
        if (options === void 0) { options = {}; }
        if (dbOptions === void 0) { dbOptions = {}; }
        return this._db(db, dbOptions).collection(coll).save(doc, options);
    };
    /**
     * Replace a document with another.
     *
     * @param {String} db - The db name.
     * @param {String} coll - The collection name.
     * @param {Object} filter - The filter.
     * @param {Object} replacement - The replacement document for matches.
     * @param {Object} options - The replace options.
     * @param {Object} dbOptions - The db options.
     *
     * @returns {Promise} The promise of the result.
     */
    NodeTransport.prototype.replaceOne = function (db, coll, filter, replacement, options, dbOptions) {
        if (filter === void 0) { filter = {}; }
        if (replacement === void 0) { replacement = {}; }
        if (options === void 0) { options = {}; }
        if (dbOptions === void 0) { dbOptions = {}; }
        return this._db(db, dbOptions).collection(coll).replaceOne(filter, replacement, options);
    };
    /**
     * Run a command against the db.
     *
     * @param {String} db - The db name.
     * @param {Object} spec - The command specification.
     * @param {Object} options - The db options.
     *
     * @returns {Promise} The promise of command results.
     */
    NodeTransport.prototype.runCommand = function (db, spec, options) {
        if (options === void 0) { options = {}; }
        return this._db(db).command(spec, options);
    };
    /**
     * Update many documents.
     *
     * @param {String} db - The db name.
     * @param {String} coll - The collection name.
     * @param {Object} filter - The filter.
     * @param {(Object|Array)} update - The updates.
     * @param {Object} options - The update options.
     * @param {Object} dbOptions - The db options.
     *
     * @returns {Promise} The promise of the result.
     */
    NodeTransport.prototype.updateMany = function (db, coll, filter, update, options, dbOptions) {
        if (filter === void 0) { filter = {}; }
        if (update === void 0) { update = {}; }
        if (options === void 0) { options = {}; }
        if (dbOptions === void 0) { dbOptions = {}; }
        return this._db(db, dbOptions).collection(coll).
            updateMany(filter, update, options);
    };
    /**
     * Update a document.
     *
     * @param {String} db - The db name.
     * @param {String} coll - The collection name.
     * @param {Object} filter - The filter.
     * @param {(Object|Array)} update - The updates.
     * @param {Object} options - The update options.
     * @param {Object} dbOptions - The db options.
     *
     * @returns {Promise} The promise of the result.
     */
    NodeTransport.prototype.updateOne = function (db, coll, filter, update, options, dbOptions) {
        if (filter === void 0) { filter = {}; }
        if (update === void 0) { update = {}; }
        if (options === void 0) { options = {}; }
        if (dbOptions === void 0) { dbOptions = {}; }
        return this._db(db, dbOptions).collection(coll).
            updateOne(filter, update, options);
    };
    /**
     * Get the DB object from the client.
     *
     * @param {String} name - The db name.
     * @param {Object} options - Optional DB options.
     *
     * @returns {Db} The db.
     */
    NodeTransport.prototype._db = function (name, options) {
        if (options === void 0) { options = {}; }
        if (Object.keys(options).length !== 0) {
            return this.mongoClient.db(name, options);
        }
        return this.mongoClient.db(name);
    };
    return NodeTransport;
}());
exports.default = NodeTransport;
