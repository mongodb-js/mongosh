"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var mongosh_i18n_1 = __importDefault(require("mongosh-i18n"));
var unsupported_cursor_1 = __importDefault(require("./unsupported-cursor"));
var NOT_IMPLEMENTED = 'transport-core.stitch-transport.not-implemented';
var AGG_ON_DB = 'transport-core.stitch-transport.agg-on-db';
var StitchTransport = (function () {
    function StitchTransport(stitchClient, mongoClient) {
        this.stitchClient = stitchClient;
        this.mongoClient = mongoClient;
    }
    StitchTransport.prototype.aggregate = function (database, collection, pipeline) {
        if (pipeline === void 0) { pipeline = []; }
        if (collection === null) {
            return new unsupported_cursor_1.default(mongosh_i18n_1.default.__(AGG_ON_DB));
        }
        return this.db(database).collection(collection).
            aggregate(pipeline);
    };
    StitchTransport.prototype.bulkWrite = function () {
        return Promise.reject("Bulk write " + mongosh_i18n_1.default.__(NOT_IMPLEMENTED));
    };
    StitchTransport.prototype.countDocuments = function (database, collection, filter, options) {
        if (filter === void 0) { filter = {}; }
        if (options === void 0) { options = {}; }
        return this.db(database).collection(collection).count(filter, options);
    };
    StitchTransport.prototype.deleteMany = function (database, collection, filter) {
        if (filter === void 0) { filter = {}; }
        return this.db(database).collection(collection).
            deleteMany(filter);
    };
    StitchTransport.prototype.deleteOne = function (database, collection, filter) {
        if (filter === void 0) { filter = {}; }
        return this.db(database).collection(collection).
            deleteOne(filter);
    };
    StitchTransport.prototype.distinct = function () {
        return new unsupported_cursor_1.default("Distinct " + mongosh_i18n_1.default.__(NOT_IMPLEMENTED));
    };
    StitchTransport.prototype.estimatedDocumentCount = function () {
        return Promise.reject("Estimated document count " + mongosh_i18n_1.default.__(NOT_IMPLEMENTED));
    };
    StitchTransport.prototype.find = function (database, collection, filter, options) {
        if (filter === void 0) { filter = {}; }
        if (options === void 0) { options = {}; }
        return this.db(database).collection(collection).
            find(filter, options);
    };
    StitchTransport.prototype.findOneAndDelete = function (database, collection, filter, options) {
        if (filter === void 0) { filter = {}; }
        if (options === void 0) { options = {}; }
        return this.db(database).collection(collection).
            findOneAndDelete(filter, options);
    };
    StitchTransport.prototype.findOneAndReplace = function (database, collection, filter, replacement, options) {
        if (filter === void 0) { filter = {}; }
        if (replacement === void 0) { replacement = {}; }
        if (options === void 0) { options = {}; }
        return this.db(database).collection(collection).
            findOneAndReplace(filter, replacement, options);
    };
    StitchTransport.prototype.findOneAndUpdate = function (database, collection, filter, update, options) {
        if (filter === void 0) { filter = {}; }
        if (update === void 0) { update = {}; }
        if (options === void 0) { options = {}; }
        return this.db(database).collection(collection).
            findOneAndUpdate(filter, update, options);
    };
    StitchTransport.prototype.insertMany = function (database, collection, docs, options) {
        if (docs === void 0) { docs = []; }
        if (options === void 0) { options = {}; }
        return this.db(database).collection(collection).
            insertMany(docs);
    };
    StitchTransport.prototype.insertOne = function (database, collection, doc, options) {
        if (doc === void 0) { doc = {}; }
        if (options === void 0) { options = {}; }
        return this.db(database).collection(collection).
            insertOne(doc);
    };
    StitchTransport.prototype.replaceOne = function () {
        return Promise.reject("Replace one " + mongosh_i18n_1.default.__(NOT_IMPLEMENTED));
    };
    StitchTransport.prototype.runCommand = function () {
        return Promise.reject("Running a direct command " + mongosh_i18n_1.default.__(NOT_IMPLEMENTED));
    };
    StitchTransport.prototype.updateMany = function (database, collection, filter, update, options) {
        if (filter === void 0) { filter = {}; }
        if (update === void 0) { update = {}; }
        if (options === void 0) { options = {}; }
        return this.db(database).collection(collection).
            updateMany(filter, update, options);
    };
    StitchTransport.prototype.updateOne = function (database, collection, filter, update, options) {
        if (filter === void 0) { filter = {}; }
        if (update === void 0) { update = {}; }
        if (options === void 0) { options = {}; }
        return this.db(database).collection(collection).
            updateOne(filter, update, options);
    };
    Object.defineProperty(StitchTransport.prototype, "userId", {
        get: function () {
            return this.stitchClient.auth.user.id;
        },
        enumerable: true,
        configurable: true
    });
    StitchTransport.prototype.db = function (name) {
        return this.mongoClient.db(name);
    };
    return StitchTransport;
}());
exports.default = StitchTransport;
//# sourceMappingURL=stitch-transport.js.map