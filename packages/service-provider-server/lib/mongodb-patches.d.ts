import type { MongoClient } from 'mongodb';
export declare function forceCloseMongoClient(client: MongoClient): Promise<{
    forceClosedConnections: number;
}>;
