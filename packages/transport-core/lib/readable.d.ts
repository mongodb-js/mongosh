import Document from './document';
import Cursor from './cursor';
import Result from './result';
interface Readable {
    aggregate(database: string, collection: string, pipeline: Document[], options: Document): Cursor;
    countDocuments(database: string, collection: string, filter: Document, options: Document): Promise<Result>;
    distinct(database: string, collection: string, fieldName: string, filter: Document, options: Document): Cursor;
    estimatedDocumentCount(database: string, collection: string, options: Document): Promise<Result>;
    find(database: string, collection: string, filter: Document, options: Document): Cursor;
}
export default Readable;
