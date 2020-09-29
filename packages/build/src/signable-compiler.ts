import Platform from './platform';
import os from 'os';

/**
 * A compiler that can produce an executable that is actually
 * code signable.
 */
class SignableCompiler {
  sourceFile: string;
  targetFile: string;
  nodeVersionRange: string;

  constructor(sourceFile: string, targetFile: string, nodeVersionRange: string) {
    this.sourceFile = sourceFile;
    this.targetFile = targetFile;
    this.nodeVersionRange = nodeVersionRange;
  }

  /**
   * Compile the executable with the library.
   *
   * @param {Function} exec - The boxednode compile function.
   */
  async compile(exec: Function): Promise<void> {
    // This compiles the executable along with Node from source.
    // Evergreen and XCode don't have up to date libraries to compile
    // open ssl with asm so we revert back to the slower version.
    await exec({
      configureArgs:
        // eslint-disable-next-line no-nested-ternary
        os.platform() === Platform.Windows ? ['openssl-no-asm'] :
          os.platform() === Platform.MacOs ? ['--openssl-no-asm'] : [],
      sourceFile: this.sourceFile,
      targetFile: this.targetFile,
      nodeVersionRange: this.nodeVersionRange,
      namespace: 'mongosh'
    });
  }
}

export default SignableCompiler;
