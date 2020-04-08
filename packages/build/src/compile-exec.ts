import path from 'path';
import { exec as compile } from 'pkg';

/**
 * The executable name enum.
 */
enum ExecName {
  Windows = 'mongosh.exe',
  Posix = 'mongosh'
};

/**
 * Platform enum.
 */
enum Platform {
  Windows = 'win32',
  MacOs = 'darwin',
  Linux = 'linux'
}

/**
 * Target enum.
 */
enum Target {
  Windows = 'win',
  MacOs = 'macos',
  Linux = 'linux'
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
 * Compile the executable.
 *
 * @param {string} input - The root js of the app.
 * @param {string} outputDir - The output directory for the executable.
 * @param {string} platform - The platform.
 */
const compileExec = async(input: string, outputDir: string, platform: string) => {
  const executable = executablePath(outputDir, platform);
  console.log('mongosh: creating binary:', executable);
  await compile([
    input,
    '-o',
    executable,
    '-t',
    determineTarget(platform)
  ]);
};

export default compileExec;
export {
  ExecName,
  Platform,
  Target,
  determineExecName,
  determineTarget,
  executablePath
};
