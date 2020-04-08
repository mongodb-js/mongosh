import Readable from './readable';
import Writable from './writable';

/**
 * Interface for all service providers.
 */
interface ServiceProvider extends Readable, Writable {
  /**
   * Close the connection.
   *
   * @param {boolean} force - Whether to force close.
   */
  close(boolean): Promise<void>;
};

export default ServiceProvider;
