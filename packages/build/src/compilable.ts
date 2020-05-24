import Platform from './platform';

/**
 * Compilers need to implement this interface.
 */
interface Compilable {
  readonly input: string;
  readonly output: string;
  readonly platform: Platform;

  /**
   * Compile the executaable.
   *
   * @param {Function} exec - The compilation function.
   *
   * @returns {Promise} The promise.
   */
  compile(exec: Function): Promise<void>;

  /**
   * Determine the name of the target platform.
   *
   * @returns {string} The name.
   */
  determineTarget(): string;
}

export default Compilable;
