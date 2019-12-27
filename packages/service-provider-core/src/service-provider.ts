import Readable from './readable';
import Writable from './writable';

/**
 * Interface for all service providers.
 */
interface ServiceProvider extends Readable, Writable {};
export default ServiceProvider;
