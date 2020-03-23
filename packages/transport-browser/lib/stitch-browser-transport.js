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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var mongosh_transport_core_1 = require("mongosh-transport-core");
var mongosh_i18n_1 = __importDefault(require("mongosh-i18n"));
var mongodb_stitch_browser_sdk_1 = require("mongodb-stitch-browser-sdk");
var INIT_ERROR = 'transport-browser.stitch-browser-transport.auth-error';
var ATLAS = 'mongodb-atlas';
var StitchBrowserTransport = (function () {
    function StitchBrowserTransport(stitchClient, serviceName) {
        if (serviceName === void 0) { serviceName = ATLAS; }
        var mongoClient = stitchClient.
            getServiceClient(mongodb_stitch_browser_sdk_1.RemoteMongoClient.factory, serviceName);
        this.stitchTransport =
            new mongosh_transport_core_1.StitchTransport(stitchClient, mongoClient);
    }
    StitchBrowserTransport.fromAppId = function (stitchAppId, serviceName) {
        return __awaiter(this, void 0, void 0, function () {
            var client, err_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        client = mongodb_stitch_browser_sdk_1.Stitch.initializeDefaultAppClient(stitchAppId);
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4, client.auth.loginWithCredential(new mongodb_stitch_browser_sdk_1.AnonymousCredential())];
                    case 2:
                        _a.sent();
                        return [3, 4];
                    case 3:
                        err_1 = _a.sent();
                        console.log(mongosh_i18n_1.default.__(INIT_ERROR), err_1);
                        return [3, 4];
                    case 4: return [2, new StitchBrowserTransport(client, serviceName)];
                }
            });
        });
    };
    StitchBrowserTransport.prototype.aggregate = function (database, collection, pipeline) {
        if (pipeline === void 0) { pipeline = []; }
        return this.stitchTransport.aggregate(database, collection, pipeline);
    };
    StitchBrowserTransport.prototype.bulkWrite = function () {
        return this.stitchTransport.bulkWrite();
    };
    StitchBrowserTransport.prototype.countDocuments = function (database, collection, filter, options) {
        if (filter === void 0) { filter = {}; }
        if (options === void 0) { options = {}; }
        return this.stitchTransport.countDocuments(database, collection, filter, options);
    };
    StitchBrowserTransport.prototype.deleteMany = function (database, collection, filter) {
        if (filter === void 0) { filter = {}; }
        return this.stitchTransport.deleteMany(database, collection, filter);
    };
    StitchBrowserTransport.prototype.deleteOne = function (database, collection, filter) {
        if (filter === void 0) { filter = {}; }
        return this.stitchTransport.deleteOne(database, collection, filter);
    };
    StitchBrowserTransport.prototype.distinct = function () {
        return this.stitchTransport.distinct();
    };
    StitchBrowserTransport.prototype.estimatedDocumentCount = function () {
        return this.stitchTransport.estimatedDocumentCount();
    };
    StitchBrowserTransport.prototype.find = function (database, collection, filter, options) {
        if (filter === void 0) { filter = {}; }
        if (options === void 0) { options = {}; }
        return this.stitchTransport.find(database, collection, filter, options);
    };
    StitchBrowserTransport.prototype.findOneAndDelete = function (database, collection, filter, options) {
        if (filter === void 0) { filter = {}; }
        if (options === void 0) { options = {}; }
        return this.stitchTransport.findOneAndDelete(database, collection, filter, options);
    };
    StitchBrowserTransport.prototype.findOneAndReplace = function (database, collection, filter, replacement, options) {
        if (filter === void 0) { filter = {}; }
        if (replacement === void 0) { replacement = {}; }
        if (options === void 0) { options = {}; }
        return this.stitchTransport.findOneAndReplace(database, collection, filter, replacement, options);
    };
    StitchBrowserTransport.prototype.findOneAndUpdate = function (database, collection, filter, update, options) {
        if (filter === void 0) { filter = {}; }
        if (update === void 0) { update = {}; }
        if (options === void 0) { options = {}; }
        return this.stitchTransport.findOneAndUpdate(database, collection, filter, update, options);
    };
    StitchBrowserTransport.prototype.insertMany = function (database, collection, docs, options) {
        if (docs === void 0) { docs = []; }
        if (options === void 0) { options = {}; }
        return this.stitchTransport.insertMany(database, collection, docs);
    };
    StitchBrowserTransport.prototype.insertOne = function (database, collection, doc, options) {
        if (doc === void 0) { doc = {}; }
        if (options === void 0) { options = {}; }
        return this.stitchTransport.insertOne(database, collection, doc);
    };
    StitchBrowserTransport.prototype.replaceOne = function () {
        return this.stitchTransport.replaceOne();
    };
    StitchBrowserTransport.prototype.runCommand = function () {
        return this.stitchTransport.runCommand();
    };
    StitchBrowserTransport.prototype.updateMany = function (database, collection, filter, update, options) {
        if (filter === void 0) { filter = {}; }
        if (update === void 0) { update = {}; }
        if (options === void 0) { options = {}; }
        return this.stitchTransport.updateMany(database, collection, filter, update, options);
    };
    StitchBrowserTransport.prototype.updateOne = function (database, collection, filter, update, options) {
        if (filter === void 0) { filter = {}; }
        if (update === void 0) { update = {}; }
        if (options === void 0) { options = {}; }
        return this.stitchTransport.updateOne(database, collection, filter, update, options);
    };
    Object.defineProperty(StitchBrowserTransport.prototype, "userId", {
        get: function () {
            return this.stitchTransport.userId;
        },
        enumerable: true,
        configurable: true
    });
    return StitchBrowserTransport;
}());
exports.default = StitchBrowserTransport;
//# sourceMappingURL=stitch-browser-transport.js.map