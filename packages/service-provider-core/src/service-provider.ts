import Readable from './readable';
import Writable from './writable';
import Closable from './closable';
import Admin from './admin';
import makePrintableBson from './printable-bson';
import { MongoshInternalError } from '@mongosh/errors';
import { ServiceProviderCoreErrors } from './error-codes';

/**
 * Interface for all service providers.
 */
export default interface ServiceProvider extends Readable, Writable, Closable, Admin {}

export class ServiceProviderCore {
  public bsonLibrary: any;
  constructor(bsonLibrary?: any) {
    if (bsonLibrary === undefined) {
      throw new MongoshInternalError('BSON Library is undefined. This is an internal error, please file a ticket!', ServiceProviderCoreErrors.BsonLibraryMissing);
    }
    makePrintableBson(bsonLibrary);
    this.bsonLibrary = bsonLibrary;
  }
}
