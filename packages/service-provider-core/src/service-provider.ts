import Readable from './readable';
import Writable from './writable';
import Closable from './closable';
import Admin from './admin';
import modifyBson from './modify-bson';

/**
 * Interface for all service providers.
 */
export default interface ServiceProvider extends Readable, Writable, Closable, Admin {}

export class ServiceProviderCore {
  public bsonLibrary;
  constructor(bsonLibrary) {
    modifyBson(bsonLibrary);
    this.bsonLibrary = bsonLibrary;
  }
}
