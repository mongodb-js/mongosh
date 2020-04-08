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

export { ExecName, Platform };
