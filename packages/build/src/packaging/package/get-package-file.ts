import { inspect } from 'util';
import type { PackageVariant } from '../../config';
import {
  getDistro,
  getArch,
  getDebArchName,
  getRPMArchName,
} from '../../config';
import type { PackageInformationProvider } from './package-information';

export class PackageFile {
  constructor(public path: string, public contentType: string) {}

  toJSON() {
    const { path, contentType } = this;
    return { path, contentType };
  }

  static fromObject(obj: unknown): PackageFile {
    if (typeof obj !== 'object' || obj === null)
      throw new Error(
        'received non-object in PackageFile.fromObject()' + inspect(obj)
      );

    for (const key of ['path', 'contentType']) {
      // @ts-expect-error asfd
      const value = obj[key];
      if (typeof value !== 'string')
        throw new Error(
          'no string field for key ' + key + ' in obj: ' + inspect(obj)
        );
    }

    // @ts-expect-error we're parsing files
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    return new PackageFile(obj.path, obj.contentType);
  }
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

  return PackageFile.fromObject(object);
}
