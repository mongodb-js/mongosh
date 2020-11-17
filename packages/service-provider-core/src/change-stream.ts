import Document from './document';

export default interface ChangeStream {
  close(): Promise<void>;

  hasNext(): Promise<boolean>;

  isClosed(): boolean;

  next(): Promise<Document>;

  resumeToken: any;
}
