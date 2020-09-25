import os from 'os';
import path from 'path';
import generateInput from './generate-input';
import Platform from './platform';
import SignableCompiler from './signable-compiler';

/**
 * The executable name enum.
 */
enum ExecName {
  Windows = 'mongosh.exe',
  Posix = 'mongosh'
}

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
};

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
  execNodeVersion: string,
  analyticsConfig: string,
  segmentKey: string): Promise<string> => {
  // We use Parcel to bundle up everything into a single JS under
  // cli-repl/dist/mongosh.js that the executable generator can use as input.
  // This JS also takes care of the analytics config file being written.
  await generateInput(input, execInput, analyticsConfig, segmentKey);

  const executable = executablePath(outputDir, os.platform());
  console.log('mongosh: creating binary:', executable);

  const { compileJSFileAsBinary } = require('boxednode');
  await new SignableCompiler(execInput, executable, execNodeVersion)
    .compile(compileJSFileAsBinary);

  return executable;
};

export default compileExec;
export {
  ExecName,
  determineExecName,
  executablePath
};
