/**
 * Platform enum.
 *
 * Different from 'BuildVariant': platform is extracted from os.platform() and
 * build variant is the host evergreen is building on.
 */
export type Platform = 'win32' | 'darwin' | 'linux';
