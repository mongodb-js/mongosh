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
var format_utils_1 = require("./format-utils");
var mongosh_shell_api_1 = require("mongosh-shell-api");
var Mapper = (function () {
    function Mapper(serviceProvider) {
        this.serviceProvider = serviceProvider;
        this.currentCursor = null;
        this.awaitLoc = [];
        this.checkAwait = false;
        this.cursorAssigned = false;
        this.databases = { test: new mongosh_shell_api_1.Database(this, 'test') };
        var parseStack = function (s) {
            var r = s.match(/repl:1:(\d*)/);
            return Number(r[1]) - 1;
        };
        var requiresAwait = [
            'deleteOne',
            'insertOne'
        ];
        var handler = {
            get: function (obj, prop) {
                if (obj.checkAwait && requiresAwait.includes(prop)) {
                    try {
                        throw new Error();
                    }
                    catch (e) {
                        var loc = parseStack(e.stack);
                        if (!isNaN(loc)) {
                            obj.awaitLoc.push(loc);
                        }
                    }
                }
                return obj[prop];
            }
        };
        return new Proxy(this, handler);
    }
    Mapper.prototype.setCtx = function (ctx) {
        this.context = ctx;
        this.context.db = this.databases.test;
    };
    Mapper.prototype.use = function (_, db) {
        if (!(db in this.databases)) {
            this.databases[db] = new mongosh_shell_api_1.Database(this, db);
        }
        this.context.db = this.databases[db];
        return "switched to db " + db;
    };
    Mapper.prototype.show = function (_, arg) {
        return __awaiter(this, void 0, void 0, function () {
            var _a, result, tableEntries, table;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _a = arg;
                        switch (_a) {
                            case 'databases': return [3, 1];
                            case 'dbs': return [3, 1];
                        }
                        return [3, 3];
                    case 1: return [4, this.serviceProvider.listDatabases('admin')];
                    case 2:
                        result = _b.sent();
                        if (!('databases' in result)) {
                            throw new Error('Error: invalid result from listDatabases');
                        }
                        tableEntries = result.databases.map(function (db) { return [db.name, format_utils_1.formatBytes(db.sizeOnDisk)]; });
                        table = format_utils_1.formatTable(tableEntries);
                        return [2, new mongosh_shell_api_1.CommandResult({ value: table })];
                    case 3: throw new Error("Error: don't know how to show " + arg);
                }
            });
        });
    };
    Mapper.prototype.it = function () {
        return __awaiter(this, void 0, void 0, function () {
            var results, i, hasNext, _a, _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        results = new mongosh_shell_api_1.CursorIterationResult();
                        if (!(this.currentCursor && !this.cursorAssigned)) return [3, 7];
                        i = 0;
                        _c.label = 1;
                    case 1:
                        if (!(i < 20)) return [3, 6];
                        return [4, this.currentCursor.hasNext()];
                    case 2:
                        hasNext = _c.sent();
                        if (!hasNext) return [3, 4];
                        _b = (_a = results).push;
                        return [4, this.currentCursor.next()];
                    case 3:
                        _b.apply(_a, [_c.sent()]);
                        return [3, 5];
                    case 4: return [3, 6];
                    case 5:
                        i++;
                        return [3, 1];
                    case 6:
                        if (results.length > 0) {
                            return [2, results];
                        }
                        _c.label = 7;
                    case 7: return [2, results];
                }
            });
        });
    };
    Mapper.prototype.aggregate = function (collection, pipeline, options) {
        if (options === void 0) { options = {}; }
        var db = collection._database;
        var coll = collection._collection;
        var dbOptions = {};
        if ('readConcern' in options) {
            dbOptions.readConcern = options.readConcern;
        }
        if ('writeConcern' in options) {
            dbOptions.writeConcern = options.writeConcern;
        }
        var cmd;
        if (coll === null) {
            cmd = this.serviceProvider.aggregateDb(db, pipeline, options, dbOptions);
        }
        else {
            cmd = this.serviceProvider.aggregate(db, coll, pipeline, options, dbOptions);
        }
        var cursor = new mongosh_shell_api_1.AggregationCursor(this, cmd);
        this.currentCursor = cursor;
        return this.currentCursor;
    };
    Mapper.prototype.bulkWrite = function (collection, operations, options) {
        if (options === void 0) { options = {}; }
        return __awaiter(this, void 0, void 0, function () {
            var dbOptions, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        dbOptions = {};
                        if ('writeConcern' in options) {
                            dbOptions.writeConcern = options.writeConcern;
                        }
                        return [4, this.serviceProvider.bulkWrite(collection._database, collection._collection, operations, options, dbOptions)];
                    case 1:
                        result = _a.sent();
                        return [2, new mongosh_shell_api_1.BulkWriteResult(result.result.ok)];
                }
            });
        });
    };
    Mapper.prototype.count = function (collection, query, options) {
        if (query === void 0) { query = {}; }
        if (options === void 0) { options = {}; }
        var dbOpts = {};
        if ('readConcern' in options) {
            dbOpts.readConcern = options.readConcern;
        }
        return this.serviceProvider.count(collection._database, collection._collection, query, options, dbOpts);
    };
    Mapper.prototype.countDocuments = function (collection, query, options) {
        if (options === void 0) { options = {}; }
        return this.serviceProvider.countDocuments(collection._database, collection._collection, query, options);
    };
    Mapper.prototype.deleteMany = function (collection, filter, options) {
        if (options === void 0) { options = {}; }
        return __awaiter(this, void 0, void 0, function () {
            var dbOptions, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        dbOptions = {};
                        if ('writeConcern' in options) {
                            dbOptions.writeConcern = options.writeConcern;
                        }
                        return [4, this.serviceProvider.deleteMany(collection._database, collection._collection, filter, options, dbOptions)];
                    case 1:
                        result = _a.sent();
                        return [2, new mongosh_shell_api_1.DeleteResult(result.result.ok, result.deletedCount)];
                }
            });
        });
    };
    Mapper.prototype.deleteOne = function (collection, filter, options) {
        if (options === void 0) { options = {}; }
        return __awaiter(this, void 0, void 0, function () {
            var dbOptions, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (this.checkAwait)
                            return [2];
                        dbOptions = {};
                        if ('writeConcern' in options) {
                            dbOptions.writeConcern = options.writeConcern;
                        }
                        return [4, this.serviceProvider.deleteOne(collection._database, collection._collection, filter, options, dbOptions)];
                    case 1:
                        result = _a.sent();
                        return [2, new mongosh_shell_api_1.DeleteResult(result.result.ok, result.deletedCount)];
                }
            });
        });
    };
    Mapper.prototype.distinct = function (collection, field, query, options) {
        if (options === void 0) { options = {}; }
        return this.serviceProvider.distinct(collection._database, collection._collection, field, query, options);
    };
    Mapper.prototype.estimatedDocumentCount = function (collection, options) {
        if (options === void 0) { options = {}; }
        return this.serviceProvider.estimatedDocumentCount(collection._database, collection._collection, options);
    };
    Mapper.prototype.find = function (collection, query, projection) {
        var options = {};
        if (projection) {
            options.projection = projection;
        }
        this.currentCursor = new mongosh_shell_api_1.Cursor(this, this.serviceProvider.find(collection._database, collection._collection, query, options));
        return this.currentCursor;
    };
    Mapper.prototype.findOne = function (collection, query, projection) {
        var options = {};
        if (projection) {
            options.projection = projection;
        }
        return new mongosh_shell_api_1.Cursor(this, this.serviceProvider.find(collection._database, collection._collection, query, options)).limit(1).next();
    };
    Mapper.prototype.findOneAndDelete = function (collection, filter, options) {
        if (options === void 0) { options = {}; }
        return __awaiter(this, void 0, void 0, function () {
            var result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4, this.serviceProvider.findOneAndDelete(collection._database, collection._collection, filter, options)];
                    case 1:
                        result = _a.sent();
                        return [2, result.value];
                }
            });
        });
    };
    Mapper.prototype.findOneAndReplace = function (collection, filter, replacement, options) {
        if (options === void 0) { options = {}; }
        return __awaiter(this, void 0, void 0, function () {
            var findOneAndReplaceOptions, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        findOneAndReplaceOptions = __assign({}, options);
                        if ('returnNewDocument' in findOneAndReplaceOptions) {
                            findOneAndReplaceOptions.returnDocument = findOneAndReplaceOptions.returnNewDocument;
                            delete findOneAndReplaceOptions.returnNewDocument;
                        }
                        return [4, this.serviceProvider.findOneAndReplace(collection._database, collection._collection, filter, replacement, findOneAndReplaceOptions)];
                    case 1:
                        result = _a.sent();
                        return [2, result.value];
                }
            });
        });
    };
    Mapper.prototype.findOneAndUpdate = function (collection, filter, update, options) {
        if (options === void 0) { options = {}; }
        return __awaiter(this, void 0, void 0, function () {
            var findOneAndUpdateOptions, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        findOneAndUpdateOptions = __assign({}, options);
                        if ('returnNewDocument' in findOneAndUpdateOptions) {
                            findOneAndUpdateOptions.returnDocument = findOneAndUpdateOptions.returnNewDocument;
                            delete findOneAndUpdateOptions.returnNewDocument;
                        }
                        return [4, this.serviceProvider.findOneAndUpdate(collection._database, collection._collection, filter, update, options)];
                    case 1:
                        result = _a.sent();
                        return [2, result.value];
                }
            });
        });
    };
    Mapper.prototype.insert = function (collection, docs, options) {
        if (options === void 0) { options = {}; }
        return __awaiter(this, void 0, void 0, function () {
            var d, dbOptions, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        d = Object.prototype.toString.call(docs) === '[object Array]' ? docs : [docs];
                        dbOptions = {};
                        if ('writeConcern' in options) {
                            dbOptions.writeConcern = options.writeConcern;
                        }
                        return [4, this.serviceProvider.insertMany(collection._database, collection._collection, d, options, dbOptions)];
                    case 1:
                        result = _a.sent();
                        return [2, new mongosh_shell_api_1.InsertManyResult(result.result.ok, result.insertedIds)];
                }
            });
        });
    };
    Mapper.prototype.insertMany = function (collection, docs, options) {
        if (options === void 0) { options = {}; }
        return __awaiter(this, void 0, void 0, function () {
            var dbOptions, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        dbOptions = {};
                        if ('writeConcern' in options) {
                            dbOptions.writeConcern = options.writeConcern;
                        }
                        return [4, this.serviceProvider.insertMany(collection._database, collection._collection, docs, options, dbOptions)];
                    case 1:
                        result = _a.sent();
                        return [2, new mongosh_shell_api_1.InsertManyResult(result.result.ok, result.insertedIds)];
                }
            });
        });
    };
    Mapper.prototype.insertOne = function (collection, doc, options) {
        if (options === void 0) { options = {}; }
        return __awaiter(this, void 0, void 0, function () {
            var dbOptions, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (this.checkAwait)
                            return [2];
                        dbOptions = {};
                        if ('writeConcern' in options) {
                            dbOptions.writeConcern = options.writeConcern;
                        }
                        return [4, this.serviceProvider.insertOne(collection._database, collection._collection, doc, options, dbOptions)];
                    case 1:
                        result = _a.sent();
                        return [2, new mongosh_shell_api_1.InsertOneResult(result.result.ok, result.insertedId)];
                }
            });
        });
    };
    Mapper.prototype.isCapped = function (collection) {
        return this.serviceProvider.isCapped(collection._database, collection._collection);
    };
    Mapper.prototype.remove = function (collection, query, options) {
        if (options === void 0) { options = {}; }
        var dbOptions = {};
        if ('writeConcern' in options) {
            dbOptions.writeConcern = options.writeConcern;
        }
        var removeOptions = {};
        if (typeof options === 'boolean') {
            removeOptions.justOne = options;
        }
        else {
            removeOptions = options;
        }
        return this.serviceProvider.remove(collection._database, collection._collection, query, removeOptions, dbOptions);
    };
    Mapper.prototype.save = function (collection, doc, options) {
        if (options === void 0) { options = {}; }
        var dbOptions = {};
        if ('writeConcern' in options) {
            dbOptions.writeConcern = options.writeConcern;
        }
        return this.serviceProvider.save(collection._database, collection._collection, doc, options, dbOptions);
    };
    Mapper.prototype.replaceOne = function (collection, filter, replacement, options) {
        if (options === void 0) { options = {}; }
        return __awaiter(this, void 0, void 0, function () {
            var dbOptions, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        dbOptions = {};
                        if ('writeConcern' in options) {
                            dbOptions.writeConcern = options.writeConcern;
                        }
                        return [4, this.serviceProvider.replaceOne(collection._collection, collection._database, filter, replacement, options, dbOptions)];
                    case 1:
                        result = _a.sent();
                        return [2, new mongosh_shell_api_1.UpdateResult(result.result.ok, result.matchedCount, result.modifiedCount, result.upsertedCount, result.upsertedId)];
                }
            });
        });
    };
    Mapper.prototype.runCommand = function (database, cmd) {
        return this.serviceProvider.runCommand(database._database, cmd);
    };
    Mapper.prototype.update = function (collection, filter, update, options) {
        if (options === void 0) { options = {}; }
        return __awaiter(this, void 0, void 0, function () {
            var result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!options.multi) return [3, 2];
                        return [4, this.serviceProvider.updateMany(collection._collection, collection._database, filter, update, options)];
                    case 1:
                        result = _a.sent();
                        return [3, 4];
                    case 2: return [4, this.serviceProvider.updateOne(collection._collection, collection._database, filter, update, options)];
                    case 3:
                        result = _a.sent();
                        _a.label = 4;
                    case 4: return [2, new mongosh_shell_api_1.UpdateResult(result.result.ok, result.matchedCount, result.modifiedCount, result.upsertedCount, result.upsertedId)];
                }
            });
        });
    };
    Mapper.prototype.updateMany = function (collection, filter, update, options) {
        if (options === void 0) { options = {}; }
        return __awaiter(this, void 0, void 0, function () {
            var dbOptions, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        dbOptions = {};
                        if ('writeConcern' in options) {
                            dbOptions.writeConcern = options.writeConcern;
                        }
                        return [4, this.serviceProvider.updateMany(collection._collection, collection._database, filter, update, options, dbOptions)];
                    case 1:
                        result = _a.sent();
                        return [2, new mongosh_shell_api_1.UpdateResult(result.result.ok, result.matchedCount, result.modifiedCount, result.upsertedCount, result.upsertedId)];
                }
            });
        });
    };
    Mapper.prototype.updateOne = function (collection, filter, update, options) {
        if (options === void 0) { options = {}; }
        return __awaiter(this, void 0, void 0, function () {
            var dbOptions, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        dbOptions = {};
                        if ('writeConcern' in options) {
                            dbOptions.writeConcern = options.writeConcern;
                        }
                        return [4, this.serviceProvider.updateMany(collection._collection, collection._database, filter, update, options, dbOptions)];
                    case 1:
                        result = _a.sent();
                        return [2, new mongosh_shell_api_1.UpdateResult(result.result.ok, result.matchedCount, result.modifiedCount, result.upsertedCount, result.upsertedId)];
                }
            });
        });
    };
    return Mapper;
}());
exports.default = Mapper;
//# sourceMappingURL=mapper.js.map