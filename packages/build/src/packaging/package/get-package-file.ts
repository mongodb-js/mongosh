import type { PackageVariant } from '../../config';
import {
  getDistro,
  getArch,
  getDebArchName,
  getRPMArchName,
} from '../../config';
import type { PackageInformationProvider } from './package-information';
import * as joi from 'joi';

/**
 * An object representing a "packaged artifact".
 */
export interface PackageFile {
  /** The full path of the artifact. */
  path: string;
  /** The content type of the artifact. */
  contentType: string;
}

/**
 * Attempts to coerce an object to a package file.
 *
 * @param obj - an object to parse into a package file
 * @returns a PackageFile object
 */
export function PackageFile(obj: unknown): PackageFile {
  const schema = joi.object<PackageFile>({
    path: joi.string().required(),
    contentType: joi.string().required(),
  });

  const { path, contentType } = joi.attempt(obj, schema);
  return { path, contentType };
}

type PackageFileExtension = 'dmg' | 'tgz' | 'deb' | 'rpm' | 'zip' | 'msi';

export function getFileExtension(
  packageVariant: PackageVariant
): PackageFileExtension {
  switch (getDistro(packageVariant)) {
    case 'linux':
      return 'tgz';
    case 'rpm':
      return 'rpm';
    case 'deb':
      return 'deb';
    case 'darwin':
    case 'win32':
      return 'zip';
    case 'win32msi':
      return 'msi';
    default:
      throw new Error(`Unknown build variant: ${packageVariant}`);
  }
}

export function getPackageFile(
  packageVariant: PackageVariant,
  packageInformation: PackageInformationProvider
): PackageFile {
  const { version, name, debName, rpmName } =
    packageInformation(packageVariant).metadata;

  const fileExtension = getFileExtension(packageVariant);

  const object = (() => {
    switch (getDistro(packageVariant)) {
      case 'linux':
        return {
          path: `${name}-${version}-${packageVariant}.${fileExtension}`,
          contentType: 'application/gzip',
        };
      case 'rpm':
        return {
          path: `${rpmName}-${version}.${getRPMArchName(
            getArch(packageVariant)
          )}.${fileExtension}`,
          contentType: 'application/x-rpm',
        };
      case 'deb':
        // debian packages are required to be separated by _ and have arch in the
        // name: https://www.debian.org/doc/manuals/debian-faq/pkg-basics.en.html
        // sometimes there is also revision number, but we can add that later.
        return {
          path: `${debName}_${version}_${getDebArchName(
            getArch(packageVariant)
          )}.${fileExtension}`,
          contentType: 'application/vnd.debian.binary-package',
        };
      case 'darwin':
      case 'win32':
        return {
          path: `${name}-${version}-${packageVariant}.${fileExtension}`,
          contentType: 'application/zip',
        };
      case 'win32msi':
        return {
          path: `${name}-${version}-${getArch(
            packageVariant
          )}.${fileExtension}`,
          contentType: 'application/x-msi',
        };
      default:
        throw new Error(`Unknown build variant: ${packageVariant}`);
    }
  })();

  return PackageFile(object);
}
