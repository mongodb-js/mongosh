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
var FLAGS = {
    2: "tailable",
    4: "slaveOk",
    8: "oplogReplay",
    16: "noTimeout",
    32: "awaitData",
    64: "exhaust",
    128: "partial"
};
var NodeCursor = (function () {
    function NodeCursor(cursor) {
        this.cursor = cursor;
    }
    NodeCursor.prototype.addOption = function (option) {
        var opt = FLAGS[option];
        if (opt === "slaveOk" || !opt) {
            return this;
        }
        this.cursor.addCursorFlag(opt, true);
        return this;
    };
    NodeCursor.prototype.allowPartialResults = function () {
        return this.addFlag("partial");
    };
    NodeCursor.prototype.batchSize = function (size) {
        this.cursor.batchSize(size);
        return this;
    };
    NodeCursor.prototype.close = function (options) {
        this.cursor.close(options);
        return this;
    };
    NodeCursor.prototype.isClosed = function () {
        return this.cursor.isClosed();
    };
    NodeCursor.prototype.collation = function (spec) {
        this.cursor.collation(spec);
        return this;
    };
    NodeCursor.prototype.comment = function (cmt) {
        this.cursor.comment(cmt);
        return this;
    };
    NodeCursor.prototype.count = function () {
        return this.cursor.count();
    };
    NodeCursor.prototype.explain = function () {
        this.cursor.explain();
        return this;
    };
    NodeCursor.prototype.forEach = function (f) {
        this.cursor.forEach(f);
        return this;
    };
    NodeCursor.prototype.hasNext = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2, this.cursor.hasNext()];
            });
        });
    };
    NodeCursor.prototype.hint = function (index) {
        this.cursor.hint(index);
        return this;
    };
    NodeCursor.prototype.getQueryPlan = function () {
        this.cursor.explain('executionStats');
        return this;
    };
    NodeCursor.prototype.isExhausted = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _a = this.cursor.isClosed();
                        if (!_a) return [3, 2];
                        return [4, this.cursor.hasNext()];
                    case 1:
                        _a = !(_b.sent());
                        _b.label = 2;
                    case 2: return [2, _a];
                }
            });
        });
    };
    NodeCursor.prototype.itcount = function () {
        return this.cursor.toArray().length;
    };
    NodeCursor.prototype.limit = function (value) {
        this.cursor.limit(value);
        return this;
    };
    NodeCursor.prototype.map = function (f) {
        this.cursor.map(f);
        return this;
    };
    NodeCursor.prototype.max = function (indexBounds) {
        this.cursor.max(indexBounds);
        return this;
    };
    NodeCursor.prototype.maxTimeMS = function (value) {
        this.cursor.maxTimeMS(value);
        return this;
    };
    NodeCursor.prototype.min = function (indexBounds) {
        this.cursor.min(indexBounds);
        return this;
    };
    NodeCursor.prototype.next = function () {
        return this.cursor.next();
    };
    NodeCursor.prototype.modifiers = function () {
        return this.cursor.cmd;
    };
    NodeCursor.prototype.noTimeout = function () {
        return this.addFlag("noTimeout");
    };
    NodeCursor.prototype.objsLeftInBatch = function () {
    };
    NodeCursor.prototype.oplogReplay = function () {
        return this.addFlag("oplogReplay");
    };
    NodeCursor.prototype.projection = function (spec) {
        this.cursor.project(spec);
        return this;
    };
    NodeCursor.prototype.pretty = function () {
    };
    NodeCursor.prototype.readConcern = function (v) {
    };
    NodeCursor.prototype.readPref = function (preference) {
        this.cursor.setReadPreference(preference);
        return this;
    };
    NodeCursor.prototype.returnKey = function (enabled) {
        this.cursor.returnKey(enabled);
        return this;
    };
    NodeCursor.prototype.showDiskLoc = function () {
        this.cursor.showRecordId(true);
        return this;
    };
    NodeCursor.prototype.showRecordId = function (enabled) {
        this.cursor.showRecordId(enabled);
        return this;
    };
    NodeCursor.prototype.size = function () {
        return this.cursor.count();
    };
    NodeCursor.prototype.skip = function (value) {
        this.cursor.skip(value);
        return this;
    };
    NodeCursor.prototype.sort = function (spec) {
        this.cursor.sort(spec);
        return this;
    };
    NodeCursor.prototype.tailable = function () {
        return this.addFlag("tailable");
    };
    NodeCursor.prototype.toArray = function () {
        return this.cursor.toArray();
    };
    NodeCursor.prototype.addFlag = function (flag) {
        this.cursor.addCursorFlag(flag, true);
        return this;
    };
    return NodeCursor;
}());
exports.default = NodeCursor;
//# sourceMappingURL=node-cursor.js.map