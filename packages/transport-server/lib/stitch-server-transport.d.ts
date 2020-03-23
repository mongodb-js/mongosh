import { Transport, Cursor, Result, StitchTransport } from 'mongosh-transport-core';
import { RemoteMongoClient, StitchAppClient } from 'mongodb-stitch-server-sdk';
declare class StitchServerTransport implements Transport {
    readonly stitchTransport: StitchTransport<StitchAppClient, RemoteMongoClient>;
    static fromAppId(stitchAppId: string, serviceName: string): Promise<StitchServerTransport>;
    aggregate(database: string, collection: string, pipeline?: object[]): any;
    bulkWrite(): Promise<Result>;
    countDocuments(database: string, collection: string, filter?: object, options?: object): Promise<Result>;
    constructor(stitchClient: StitchAppClient, serviceName?: string);
    close(): void;
    deleteMany(database: string, collection: string, filter?: object): Promise<Result>;
    deleteOne(database: string, collection: string, filter?: object): Promise<Result>;
    distinct(): Cursor;
    estimatedDocumentCount(): Promise<Result>;
    find(database: string, collection: string, filter?: object, options?: object): any;
    findOneAndDelete(database: string, collection: string, filter?: object, options?: object): Promise<Result>;
    findOneAndReplace(database: string, collection: string, filter?: object, replacement?: object, options?: object): Promise<Result>;
    findOneAndUpdate(database: string, collection: string, filter?: object, update?: object, options?: object): Promise<Result>;
    insertMany(database: string, collection: string, docs?: object[], options?: object): Promise<Result>;
    insertOne(database: string, collection: string, doc?: object, options?: object): Promise<Result>;
    replaceOne(): Promise<Result>;
    runCommand(): Promise<Result>;
    updateMany(database: string, collection: string, filter?: object, update?: object, options?: object): Promise<Result>;
    updateOne(database: string, collection: string, filter?: object, update?: object, options?: object): Promise<Result>;
    get userId(): string;
}
export default StitchServerTransport;
