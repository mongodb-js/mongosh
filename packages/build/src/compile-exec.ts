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
 * Determine the name of the executable based on the
 * provided platform.
 *
 * @param {string} platform - The platform.
 *
 * @returns {string} The name.
 */
function determineExecName(platform: string): String {
  if (platform === Platform.Windows) {
    return ExecName.Windows;
  }
  return ExecName.Posix;
}

export {
  ExecName,
  Platform,
  determineExecName
};
