/**
 * Common interface for transport functions that need to return an
 * iterable result. This class wraps the node driver cursor.
 */
class Cursor {
    private cursor: any;

    constructor(cursor) {
        this.cursor = cursor;
    }

    addOption(option) {
        const dbOption = {
            2: "tailable",
            4: "slaveOk",
            8: "oplogReplay",
            16: "noTimeout",
            32: "awaitData",
            64: "exhaust",
            128: "partial"
        };
        const opt = dbOption[option];
        if (opt === 'slaveOk' || !!opt) {} // TODO
        this.cursor.addCursorFlag(opt, true);
        return this;
    }

    allowPartialResults() {
        this.cursor.addCursorFlag('partial', true);
        return this;
    }
    batchSize(size) {
        this.cursor.setCursorBatchSize(size);
        return this;
    }
    close() {
        this.cursor.close();
        return this;
    }
    isClosed() {
        return this.cursor.isClosed();
    }
    collation(doc) {
        this.cursor.collation(doc);
        return this;
    }
    comment(cmt) {
        this.cursor.comment(cmt);
        return this;
    }
    count() {
        return this.cursor.count();
    }
    explain() {
        this.cursor.explain();
        return this;
    }
    forEach(f) {
        this.cursor.forEach(f);
        return this;
    }
    hasNext() {
        return this.cursor.hasNext();
    }
    hint(index) {
        this.cursor.hint(index);
        return this;
    }
    getQueryPlan() {
        this.cursor.explain('executionStats');
        return this;
    }
    isExhausted() {
        return this.cursor.isClosed() && !this.cursor.hasNext();
    }
    itcount() {
        return this.cursor.toArray().length;
    }
    limit(l) {
        this.cursor.limit(l);
        return this;
    }
    map(f) {
        this.cursor.map(f);
        return this;
    }
    max(indexBounds) {
        this.cursor.max(indexBounds);
        return this;
    }
    maxTimeMS(ms) {
        this.cursor.maxTimeMS(ms);
        return this;
    }
    min(indexBounds) {
        this.cursor.min(indexBounds);
        return this;
    }
    next() {
        return this.cursor.next();
    }
    modifiers() { // TODO
        return this.cursor.cmd;
    }
    noCursorTimeout() {
        this.cursor.addCursorFlag('noCursorTimeout', true);
        return this;
    }
    objsLeftInBatch() {
        // TODO
    }
    oplogReplay() {
        this.cursor.addCursorFlag('oplogReplay', true);
        return this;
    }
    projection(v) {
        this.cursor.project(v);
        return this;
    }
    pretty() {
        // TODO
    }
    readConcern(v) {
        // TODO
    }
    readPref(v) {
        this.cursor.setReadPreference(v);
        return this;
    }
    returnKey() {
        this.cursor.returnKey();
        return this;
    }
    showDiskLoc() {
        this.cursor.showRecordId(true);
        return this;
    }
    showRecordId() {
        this.cursor.showRecordId(true);
        return this;
    }
    size() {
        return this.cursor.count(); // TODO: size same as count?
    }
    skip(s) {
        this.cursor.skip(s);
        return this;
    }
    sort(s) {
        this.cursor.sort(s);
        return this;
    }
    tailable() {
        this.cursor.addCursorFlag('tailable', true);
        return this;
    }
    toArray() {
        return this.cursor.toArray();
    }
}

export default Cursor;
