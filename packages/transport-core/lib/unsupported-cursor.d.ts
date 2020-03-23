import Cursor from './unsupported-cursor';
declare class UnsupportedCursor implements Cursor {
    private readonly message;
    constructor(message: string);
    toArray(): Promise<Document[]>;
}
export default UnsupportedCursor;
