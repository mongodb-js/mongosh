import Result from './result';
interface Writable {
    bulkWrite(database: string, collection: string, requests: object, options: object): Promise<Result>;
    deleteMany(database: string, collection: string, filter: object, options: object): Promise<Result>;
    deleteOne(database: string, collection: string, filter: object, options: object): Promise<Result>;
    findOneAndDelete(database: string, collection: string, filter: object, options: object): Promise<Result>;
    findOneAndReplace(database: string, collection: string, filter: object, replacement: object, options: object): Promise<Result>;
    findOneAndUpdate(database: string, collection: string, filter: object, update: object, options: object): Promise<Result>;
    insertMany(database: string, collection: string, docs: object[], options: object): Promise<Result>;
    insertOne(database: string, collection: string, doc: object, options: object): Promise<Result>;
    replaceOne(database: string, collection: string, filter: object, replacement: object, options: object): Promise<Result>;
    updateMany(database: string, collection: string, filter: object, update: object, options: object): Promise<Result>;
    updateOne(database: string, collection: string, filter: object, update: object, options: object): Promise<Result>;
}
export default Writable;
