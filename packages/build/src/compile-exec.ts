import path from 'path';
import generateInput from './generate-input';
import Platform from './platform';
import SignableCompiler from './signable-compiler';
import UnsignableCompiler from './unsignable-compiler';

/**
 * The executable name enum.
 */
enum ExecName {
  Windows = 'mongosh.exe',
  Posix = 'mongosh'
};

/**
 * Determine the name of the executable based on the
 * provided platform.
 *
 * @param {string} platform - The platform.
 *
 * @returns {string} The name.
 */
const determineExecName = (platform: string): string => {
  if (platform === Platform.Windows) {
    return ExecName.Windows;
  }
  return ExecName.Posix;
}

/**
 * Get the path to the executable itself.
 *
 * @param {string} outputDir - The directory to save in.
 * @param {string} platform - The platform.
 *
 * @returns {string} The path.
 */
const executablePath = (outputDir: string, platform: string): string => {
  return path.join(outputDir, determineExecName(platform));
};

/**
 * Compile the executable. This builds the thing that ends up in dist/
 * that we will zip up and send off to userland.
 *
 * @param {string} input - The root js of the app.
 * @param {string} outputDir - The output directory for the executable.
 * @param {string} platform - The platform.
 */
const compileExec = async(
  input: string,
  execInput: string,
  outputDir: string,
  platform: string,
  analyticsConfig: string,
  segmentKey: string): Promise<string> => {

  // Nexe has a huge problem figuring out dependencies in this project,
  // especially with all the lerna symlinking, so we use Parcel to bundle
  // up everything into a single JS under cli-repl/dist/mongosh.js
  // that Nexe can make an executable of. This JS also takes care of the
  // analytics config file being written.
  await generateInput(input, execInput, analyticsConfig, segmentKey);

  const executable = executablePath(outputDir, platform);
  console.log('mongosh: creating binary:', executable);

  if (platform === Platform.MacOs) {
    const { compile } = require('nexe');
    await new SignableCompiler(execInput, executable, platform)
      .compile(compile);
  } else {
    const { exec } = require('pkg');
    await new UnsignableCompiler(execInput, executable, platform)
      .compile(exec);
  }

  return executable;
};

export default compileExec;
export {
  ExecName,
  determineExecName,
  executablePath
};
