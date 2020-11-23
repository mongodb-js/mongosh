import { TransactionOptions } from './session-options';
import Document from './document';

export default interface ServiceProviderSession {
  abortTransaction(): Promise<void>;
  advanceOperationTime(operationTime: any): void;
  commitTransaction(): Promise<void>;
  endSession(): Promise<void>;
  startTransaction(options?: TransactionOptions): void;
  hasEnded?: boolean;
  clusterTime?: any; // TODO: see MONGOSH-427
  operationTime?: any; // timestamp,
  id: Document
}
