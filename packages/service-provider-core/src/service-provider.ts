import { MongoshInternalError } from '@mongosh/errors';
import type Admin from './admin';
import type Closable from './closable';
import type Readable from './readable';
import type Writable from './writable';
import { makePrintableBson } from '@mongosh/shell-bson';
import type { BSON } from '@mongosh/shell-bson';

/**
 * Interface for all service providers.
 */
export default interface ServiceProvider
  extends Readable,
    Writable,
    Closable,
    Admin {}

export class ServiceProviderCore {
  public bsonLibrary: BSON;
  constructor(bsonLibrary?: BSON) {
    if (bsonLibrary === undefined) {
      throw new MongoshInternalError('BSON Library is undefined.');
    }
    makePrintableBson(bsonLibrary);
    this.bsonLibrary = bsonLibrary;
  }
}
