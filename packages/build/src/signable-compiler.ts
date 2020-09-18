import Compiler from './compiler';
import Platform from './platform';
import { cpus } from 'os';
import { promises as fs } from 'fs';

/**
 * Target enum.
 */
enum Target {
  Windows = 'win32-x86-12.4.0',
  MacOs = 'darwin-12.4.0',
  Linux = 'linux-x86-12.4.0'
}

/**
 * A compiler that can produce an executable that is actually
 * code signable.
 */
class SignableCompiler extends Compiler {

  /**
   * Compile the executable with the library.
   *
   * @param {Function} exec - The Nexe compile function.
   */
  async compile(exec: Function) {
    const target = this.determineTarget();

    // This compiles the executable along with Node from source.
    // Evergreen and XCode don't have up to date libraries to compile
    // open ssl with asm so we revert back to the slower version.
    await exec({
      build: true,
      // XXX This is not set because otherwise no runnable executable is generated
      // mangle: false,
      configure: ['--openssl-no-asm'],
      make: [`-j${cpus().length}`],
      input: this.input,
      output: this.output,
      loglevel: 'verbose',
      targets: [ target ],
      patches: [
        async (compiler, next) => {
          const source = await fs.readFile(this.input, 'utf8');
          await compiler.setFileContentsAsync(
            'lib/_third_party_main.js',
            source);
          return await next();
        }
      ]
    });
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
      default: return Target.Linux;
    }
  };
}

export default SignableCompiler;
export { Target };
