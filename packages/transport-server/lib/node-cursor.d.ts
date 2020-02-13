import { Cursor } from 'mongosh-transport-core';
declare const enum Flag {
    Tailable = "tailable",
    SlaveOk = "slaveOk",
    OplogReplay = "oplogReplay",
    NoTimeout = "noTimeout",
    AwaitData = "awaitData",
    Exhaust = "exhaust",
    Partial = "partial"
}
declare class NodeCursor implements Cursor {
    private readonly cursor;
    constructor(cursor: any);
    addOption(option: number): NodeCursor;
    allowPartialResults(): NodeCursor;
    batchSize(size: number): NodeCursor;
    close(options: Document): NodeCursor;
    isClosed(): boolean;
    collation(spec: Document): NodeCursor;
    comment(cmt: string): this;
    count(): Promise<number>;
    explain(): NodeCursor;
    forEach(f: any): this;
    hasNext(): Promise<boolean>;
    hint(index: string): NodeCursor;
    getQueryPlan(): this;
    isExhausted(): Promise<boolean>;
    itcount(): any;
    limit(value: number): NodeCursor;
    map(f: any): this;
    max(indexBounds: Document): NodeCursor;
    maxTimeMS(value: number): NodeCursor;
    min(indexBounds: Document): NodeCursor;
    next(): any;
    modifiers(): any;
    noTimeout(): NodeCursor;
    objsLeftInBatch(): void;
    oplogReplay(): NodeCursor;
    projection(spec: Document): NodeCursor;
    pretty(): void;
    readConcern(v: any): void;
    readPref(preference: string): NodeCursor;
    returnKey(enabled: boolean): NodeCursor;
    showDiskLoc(): NodeCursor;
    showRecordId(enabled: boolean): NodeCursor;
    size(): any;
    skip(value: number): NodeCursor;
    sort(spec: Document): NodeCursor;
    tailable(): NodeCursor;
    toArray(): any;
    private addFlag;
}
export default NodeCursor;
export { Flag };
