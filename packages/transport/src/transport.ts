import Readable from './readable';
import Writable from './writable';

/**
 * Interface for all transport modules.
 */
interface Transport extends Readable, Writable {};

export default Transport;
