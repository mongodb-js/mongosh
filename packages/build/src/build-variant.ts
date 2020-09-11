/**
 * Build Variant enum.
 *
 * Different from 'platform': platform is extracted from os.platform() and
 * build variant is the host evergreen is building on.
 */
enum BuildVariant {
  Windows = 'win32',
  MacOs = 'darwin',
  Linux = 'linux',
  Debian = 'debian',
  Redhat = 'rhel'
}

export default BuildVariant;
