import Document from './document';
interface Cursor {
    toArray(): Promise<Document[]>;
}
export default Cursor;
