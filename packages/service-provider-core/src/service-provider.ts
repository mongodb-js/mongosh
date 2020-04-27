import Readable from './readable';
import Writable from './writable';
import Closable from './closable';
import Admin from './admin';

/**
 * Interface for all service providers.
 */
interface ServiceProvider extends Readable, Writable, Closable, Admin {};

export default ServiceProvider;
