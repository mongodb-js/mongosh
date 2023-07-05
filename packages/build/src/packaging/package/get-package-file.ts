import type { PackageVariant } from '../../config';
import {
  getDistro,
  getArch,
  getDebArchName,
  getRPMArchName,
} from '../../config';
import type { PackageInformationProvider } from './package-information';

export interface PackageFile {
  path: string;
  contentType: string;
}

export function getPackageFile(
  packageVariant: PackageVariant,
  packageInformation: PackageInformationProvider
): PackageFile {
  const { version, name, debName, rpmName } =
    packageInformation(packageVariant).metadata;
  switch (getDistro(packageVariant)) {
    case 'linux':
      return {
        path: `${name}-${version}-${packageVariant}.tgz`,
        contentType: 'application/gzip',
      };
    case 'rpm':
      return {
        path: `${rpmName}-${version}.${getRPMArchName(
          getArch(packageVariant)
        )}.rpm`,
        contentType: 'application/x-rpm',
      };
    case 'deb':
      // debian packages are required to be separated by _ and have arch in the
      // name: https://www.debian.org/doc/manuals/debian-faq/pkg-basics.en.html
      // sometimes there is also revision number, but we can add that later.
      return {
        path: `${debName}_${version}_${getDebArchName(
          getArch(packageVariant)
        )}.deb`,
        contentType: 'application/vnd.debian.binary-package',
      };
    case 'darwin':
    case 'win32':
      return {
        path: `${name}-${version}-${packageVariant}.zip`,
        contentType: 'application/zip',
      };
    case 'win32msi':
      return {
        path: `${name}-${version}-${getArch(packageVariant)}.msi`,
        contentType: 'application/x-msi',
      };
    default:
      throw new Error(`Unknown build variant: ${packageVariant}`);
  }
}
