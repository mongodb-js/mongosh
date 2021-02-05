/**
 * Build Variant enum.
 *
 * Different from 'platform': platform is extracted from os.platform() and
 * build variant is the host evergreen is building on.
 */
enum BuildVariant {
  Windows = 'win32',
  WindowsMSI = 'win32msi',
  MacOs = 'darwin',
  Linux = 'linux',
  Debian = 'debian',
  Redhat = 'rhel'
}

export const ALL_BUILD_VARIANTS = Object.freeze([
  BuildVariant.Windows,
  BuildVariant.WindowsMSI,
  BuildVariant.MacOs,
  BuildVariant.Linux,
  BuildVariant.Debian,
  BuildVariant.Redhat,
]);

export default BuildVariant;
