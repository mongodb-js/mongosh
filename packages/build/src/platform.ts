/**
 * Platform enum.
 *
 * Different from 'BuildVariant': platform is extracted from os.platform() and
 * build variant is the host evergreen is building on.
 */
enum Platform {
  Windows = 'win32',
  MacOs = 'darwin',
  Linux = 'linux'
}

export default Platform;
