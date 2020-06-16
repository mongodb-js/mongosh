import Readable from './readable';
import Writable from './writable';
import Closable from './closable';
import Admin from './admin';

/**
 * Interface for all service providers.
 */
export default interface ServiceProvider extends Readable, Writable, Closable, Admin {}
