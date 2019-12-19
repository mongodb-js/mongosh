"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * The cursor flags.
 */
var FLAGS = {
    2: "tailable",
    4: "slaveOk",
    8: "oplogReplay",
    16: "noTimeout",
    32: "awaitData",
    64: "exhaust",
    128: "partial"
};
/**
 * Cursor implementation for the Node driver. Wraps the various
 * Node cursors.
 */
var NodeCursor = /** @class */ (function () {
    /**
     * Create the new Node cursor.
     *
     * @param {NativeCursor} cursor - The native Node cursor.
     */
    function NodeCursor(cursor) {
        this.cursor = cursor;
    }
    NodeCursor.prototype.addOption = function (option) {
        var opt = FLAGS[option];
        if (opt === 'slaveOk' || !!opt) { } // TODO
        this.cursor.addCursorFlag(opt, true);
        return this;
    };
    NodeCursor.prototype.allowPartialResults = function () {
        this.cursor.addCursorFlag('partial', true);
        return this;
    };
    NodeCursor.prototype.batchSize = function (size) {
        this.cursor.setCursorBatchSize(size);
        return this;
    };
    NodeCursor.prototype.close = function () {
        this.cursor.close();
        return this;
    };
    NodeCursor.prototype.isClosed = function () {
        return this.cursor.isClosed();
    };
    NodeCursor.prototype.collation = function (doc) {
        this.cursor.collation(doc);
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
        return this.cursor.hasNext();
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
        return this.cursor.isClosed() && !this.cursor.hasNext();
    };
    NodeCursor.prototype.itcount = function () {
        return this.cursor.toArray().length;
    };
    NodeCursor.prototype.limit = function (l) {
        this.cursor.limit(l);
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
    NodeCursor.prototype.maxTimeMS = function (ms) {
        this.cursor.maxTimeMS(ms);
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
    NodeCursor.prototype.noCursorTimeout = function () {
        this.cursor.addCursorFlag('noCursorTimeout', true);
        return this;
    };
    NodeCursor.prototype.objsLeftInBatch = function () {
        // TODO
    };
    NodeCursor.prototype.oplogReplay = function () {
        this.cursor.addCursorFlag('oplogReplay', true);
        return this;
    };
    NodeCursor.prototype.projection = function (v) {
        this.cursor.project(v);
        return this;
    };
    NodeCursor.prototype.pretty = function () {
        // TODO
    };
    NodeCursor.prototype.readConcern = function (v) {
        // TODO
    };
    NodeCursor.prototype.readPref = function (v) {
        this.cursor.setReadPreference(v);
        return this;
    };
    NodeCursor.prototype.returnKey = function () {
        this.cursor.returnKey();
        return this;
    };
    NodeCursor.prototype.showDiskLoc = function () {
        this.cursor.showRecordId(true);
        return this;
    };
    NodeCursor.prototype.showRecordId = function () {
        this.cursor.showRecordId(true);
        return this;
    };
    NodeCursor.prototype.size = function () {
        return this.cursor.count(); // TODO: size same as count?
    };
    NodeCursor.prototype.skip = function (s) {
        this.cursor.skip(s);
        return this;
    };
    NodeCursor.prototype.sort = function (s) {
        this.cursor.sort(s);
        return this;
    };
    NodeCursor.prototype.tailable = function () {
        this.cursor.addCursorFlag('tailable', true);
        return this;
    };
    NodeCursor.prototype.toArray = function () {
        return this.cursor.toArray();
    };
    return NodeCursor;
}());
exports.default = NodeCursor;
