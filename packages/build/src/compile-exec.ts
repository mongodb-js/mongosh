import path from 'path';
import { compile } from 'nexe';
import Platform from './platform';
import generateInput from './generate-input';

/**
 * The executable name enum.
 */
enum ExecName {
  Windows = 'mongosh.exe',
  Posix = 'mongosh'
};

/**
 * Target enum.
 */
enum Target {
  Windows = 'win32-x86-12.4.0',
  MacOs = 'darwin-12.4.0',
  Linux = 'linux-x86-12.4.0'
}

/**
 * Determine the name of the executable based on the
 * provided platform.
 *
 * @param {string} platform - The platform.
 *
 * @returns {string} The name.
 */
function determineExecName(platform: string): string {
  if (platform === Platform.Windows) {
    return ExecName.Windows;
  }
  return ExecName.Posix;
}

/**
 * Determine the target name.
 *
 * @param {string} platform - The platform.
 *
 * @returns {string} The target name.
 */
const determineTarget = (platform: string): string => {
  switch(platform) {
    case Platform.Windows: return Target.Windows;
    case Platform.MacOs: return Target.MacOs;
    default: return Target.Linux;
  }
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
  platform: string,
  resources: string[],
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
  // Nexe requires 2 compile tasks to run - the first is to clean out the
  // cache but requires an input file for some reason.
  await compile({
    input: execInput,
    clean: true,
    targets: [ determineTarget(platform) ]
  });
  // The second Nexe compile actually does the work.
  await compile({
    input: execInput,
    output: executable,
    loglevel: 'verbose',
    targets: [ determineTarget(platform) ],
    resources: resources
  });
  return executable;
};

export default compileExec;
export {
  ExecName,
  Target,
  determineExecName,
  determineTarget,
  executablePath
};
