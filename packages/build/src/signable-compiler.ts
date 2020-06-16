import Compiler from './compiler';
import Platform from './platform';

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

    // Clean out the Nexe cache - this actuall requires an additional
    // call to compile that doesn't actuall compile anything, but is
    // required to have a clean slate to buld Node from source.
    await exec({
      build: true,
      input: this.input,
      clean: true,
      targets: [ target ]
    });

    // This compiles the executable along with Node from source.
    // Evergreen and XCode don't have up to date libraries to compile
    // open ssl with asm so we revert back to the slower version.
    await exec({
      build: true,
      mangle: false,
      configure: ['--openssl-no-asm'],
      input: this.input,
      output: this.output,
      loglevel: 'verbose',
      targets: [ target ],
      patches: [
        (x, next) => {
          x.code = () => [ x.shims.join(''), x.startup ].join(';')
          return next();
        },
        (compiler, next) => {
          return compiler.setFileContentsAsync(
            'lib/_third_party_main.js',
            compiler.code()
          ).then(next);
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
