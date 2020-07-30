import Compiler from './compiler';
import Platform from './platform';

/**
 * Target enum.
 */
enum Target {
  Windows = 'win',
  MacOs = 'macos',
  Linux = 'linux',
  Debian = 'linux'
}

/**
 * A compiler that can produce an executable that is not
 * code signable, but faster for dev environments.
 */
class UnsignableCompiler extends Compiler {

  /**
   * Compile the executable with the library.
   *
   * @param {Function} exec - The pkg compile function.
   */
  compile(exec: Function) {
    const target = this.determineTarget();
    return exec([
      this.input,
      '-o',
      this.output,
      '-t',
      `node12-${target}-x64`
    ]);
  }

  /**
   * Determine the target name.
   *
   * @returns {string} The target name.
   */
  determineTarget(): string {
    switch(this.platform) {
      case Platform.Windows: return Target.Windows;
      case Platform.MacOs: return Target.MacOs;
      case Platform.Debian: return Target.Debian;
      default: return Target.Linux;
    }
  };
}

export default UnsignableCompiler;
export { Target };
