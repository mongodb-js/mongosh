/**
 * Build Variant enum.
 *
 * Different from 'platform': platform is extracted from os.platform() and
 * build variant defines the desired distribution type to build for.
 */
export enum BuildVariant {
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
