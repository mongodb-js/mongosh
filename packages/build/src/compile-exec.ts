import generateInput from './generate-input';
import SignableCompiler from './signable-compiler';

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
  executablePath: string,
  execNodeVersion: string,
  analyticsConfigFilePath: string,
  segmentKey: string): Promise<string> => {
  // We use Parcel to bundle up everything into a single JS under
  // cli-repl/dist/mongosh.js that the executable generator can use as input.
  // This JS also takes care of the analytics config file being written.
  await generateInput(input, execInput, analyticsConfigFilePath, segmentKey);

  console.info('mongosh: creating binary:', executablePath);

  const { compileJSFileAsBinary } = require('boxednode');
  await new SignableCompiler(execInput, executablePath, execNodeVersion)
    .compile(compileJSFileAsBinary);

  return executablePath;
};

export default compileExec;
