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
Object.defineProperty(exports, "__esModule", { value: true });
const mongosh_transport_core_1 = require("mongosh-transport-core");
const mongodb_stitch_browser_sdk_1 = require("mongodb-stitch-browser-sdk");
/**
 * Init error.
 */
const INIT_ERROR = 'Error authenticating with Stitch.';
/**
 * Atlas id.
 */
const ATLAS = 'mongodb-atlas';
/**
 * Encapsulates logic for communicating with a MongoDB instance via
 * Stitch in the browser.
 */
class StitchBrowserTransport {
    /**
     * Instantiate a new Stitch server transport with a connected stitch
     * client instance.
     *
     * @param {Client} stitchClient - The Stitch client instance.
     * @param {String} serviceName - The Mongo service name.
     */
    constructor(stitchClient, serviceName = ATLAS) {
        const mongoClient = stitchClient.
            getServiceClient(mongodb_stitch_browser_sdk_1.RemoteMongoClient.factory, serviceName);
        this.stitchTransport =
            new mongosh_transport_core_1.StitchTransport(stitchClient, mongoClient);
    }
    /**
     * Create a StitchBrowserTransport from a Stitch app id.
     *
     * @param {String} stitchAppId - The Stitch app id.
     * @param {String} serviceName - The Stitch service name.
     *
     * @returns {Promise} The promise of the Stitch server transport.
     */
    static fromAppId(stitchAppId, serviceName) {
        return __awaiter(this, void 0, void 0, function* () {
            const client = mongodb_stitch_browser_sdk_1.Stitch.initializeDefaultAppClient(stitchAppId);
            try {
                yield client.auth.loginWithCredential(new mongodb_stitch_browser_sdk_1.AnonymousCredential());
            }
            catch (err) {
                /* eslint no-console:0 */
                console.log(INIT_ERROR, err);
            }
            return new StitchBrowserTransport(client, serviceName);
        });
    }
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
    aggregate(database, collection, pipeline = []) {
        return this.stitchTransport.aggregate(database, collection, pipeline);
    }
    /**
     * Not implemented in Stitch.
     *
     * @returns {Promise} The rejected promise.
     */
    bulkWrite() {
        return this.stitchTransport.bulkWrite();
    }
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
    countDocuments(database, collection, filter = {}, options = {}) {
        return this.stitchTransport.countDocuments(database, collection, filter, options);
    }
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
    deleteMany(database, collection, filter = {}) {
        return this.stitchTransport.deleteMany(database, collection, filter);
    }
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
    deleteOne(database, collection, filter = {}) {
        return this.stitchTransport.deleteOne(database, collection, filter);
    }
    /**
     * Not implemented in Stitch.
     *
     * @returns {Promise} The rejected promise.
     */
    distinct() {
        return this.stitchTransport.distinct();
    }
    /**
     * Not implemented in Stitch.
     *
     * @returns {Promise} The rejected promise.
     */
    estimatedDocumentCount() {
        return this.stitchTransport.estimatedDocumentCount();
    }
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
    find(database, collection, filter = {}, options = {}) {
        return this.stitchTransport.find(database, collection, filter, options);
    }
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
    findOneAndDelete(database, collection, filter = {}, options = {}) {
        return this.stitchTransport.findOneAndDelete(database, collection, filter, options);
    }
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
    findOneAndReplace(database, collection, filter = {}, replacement = {}, options = {}) {
        return this.stitchTransport.findOneAndReplace(database, collection, filter, replacement, options);
    }
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
    findOneAndUpdate(database, collection, filter = {}, update = {}, options = {}) {
        return this.stitchTransport.findOneAndUpdate(database, collection, filter, update, options);
    }
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
    insertMany(database, collection, docs = [], options = {}) {
        return this.stitchTransport.insertMany(database, collection, docs);
    }
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
    insertOne(database, collection, doc = {}, options = {}) {
        return this.stitchTransport.insertOne(database, collection, doc);
    }
    /**
     * Not implemented in Stitch.
     *
     * @returns {Promise} The rejected promise.
     */
    replaceOne() {
        return this.stitchTransport.replaceOne();
    }
    /**
     * Not implemented in Stitch.
     *
     * @returns {Promise} The rejected promise.
     */
    runCommand() {
        return this.stitchTransport.runCommand();
    }
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
    updateMany(database, collection, filter = {}, update = {}, options = {}) {
        return this.stitchTransport.updateMany(database, collection, filter, update, options);
    }
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
    updateOne(database, collection, filter = {}, update = {}, options = {}) {
        return this.stitchTransport.updateOne(database, collection, filter, update, options);
    }
    /**
     * Get the current user id.
     *
     * @returns {String} The user id.
     */
    get userId() {
        return this.stitchTransport.userId;
    }
}
exports.default = StitchBrowserTransport;
