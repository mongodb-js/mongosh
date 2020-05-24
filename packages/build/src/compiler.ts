import Compilable from './compilable';
import Platform from './platform';

/**
 * Common class for compilers to extend from.
 */
abstract class Compiler implements Compilable {
  readonly input: string;
  readonly output: string;
  readonly platform: Platform;

  /**
   * Instantiate the compiler.
   *
   * @param {string} input - The input location.
   * @param {string} output - The output location.
   * @param {Platform} platform - The platform.
   */
  constructor(input: string, output: string, platform: Platform) {
    this.input = input;
    this.output = output;
    this.platform = platform;
  }

  abstract compile(exec: Function): Promise<void>;
  abstract determineTarget(): string;
}

export default Compiler;
