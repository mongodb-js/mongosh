/**
 * Build Variant enum.
 *
 * Different from 'platform': platform is extracted from os.platform() and
 * build variant is the host evergreen is building on.
 */
enum BuildVariant {
  Windows = 'windows_ps',
  MacOs = 'macos',
  Ubuntu = 'ubuntu',
  Debian = 'debian'
}

export default BuildVariant;
