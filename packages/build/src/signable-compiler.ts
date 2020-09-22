import Compiler from './compiler';
import Platform from './platform';
import { cpus } from 'os';
import { promises as fs } from 'fs';

/**
 * A compiler that can produce an executable that is actually
 * code signable.
 */
class SignableCompiler extends Compiler {

  /**
   * Compile the executable with the library.
   *
   * @param {Function} exec - The boxednode compile function.
   */
  async compile(exec: Function) {
    const target = this.determineTarget();

    // This compiles the executable along with Node from source.
    // Evergreen and XCode don't have up to date libraries to compile
    // open ssl with asm so we revert back to the slower version.
    await exec({
      configureArgs: this.platform === Platform.Windows ? ['openssl-no-asm'] : ['--openssl-no-asm'],
      sourceFile: this.input,
      targetFile: this.output,
      nodeVersionRange: target,
      namespace: 'mongosh'
    });
  }

  /**
   * Determine the target name.
   *
   * @returns {string} The target name.
   */
  determineTarget(): string {
    return '^12.0.0';
  };
}

export default SignableCompiler;
