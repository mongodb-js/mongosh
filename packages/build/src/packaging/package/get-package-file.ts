import { BuildVariant, getDistro, getArch, getDebArchName, getRPMArchName } from '../../config';
import type { PackageInformation } from './package-information';

export interface PackageFile {
  path: string;
  contentType: string;
}

export function getPackageFile(buildVariant: BuildVariant, packageInformation: PackageInformation): PackageFile {
  const { version, name, debName, rpmName } = packageInformation.metadata;
  switch (getDistro(buildVariant)) {
    case 'linux':
      return {
        path: `${name}-${version}-${buildVariant}.tgz`,
        contentType: 'application/gzip'
      };
    case 'rhel7':
      return {
        path: `${rpmName}-${version}.el7.${getRPMArchName(getArch(buildVariant))}.rpm`,
        contentType: 'application/x-rpm'
      };
    case 'rhel8':
      return {
        path: `${rpmName}-${version}.el8.${getRPMArchName(getArch(buildVariant))}.rpm`,
        contentType: 'application/x-rpm'
      };
    case 'suse':
      return {
        path: `${rpmName}-${version}.suse12.${getRPMArchName(getArch(buildVariant))}.rpm`,
        contentType: 'application/x-rpm'
      };
    case 'amzn1':
      return {
        path: `${rpmName}-${version}.amzn1.${getRPMArchName(getArch(buildVariant))}.rpm`,
        contentType: 'application/x-rpm'
      };
    case 'amzn2':
      return {
        path: `${rpmName}-${version}.amzn2.${getRPMArchName(getArch(buildVariant))}.rpm`,
        contentType: 'application/x-rpm'
      };
    case 'debian':
      // debian packages are required to be separated by _ and have arch in the
      // name: https://www.debian.org/doc/manuals/debian-faq/pkg-basics.en.html
      // sometimes there is also revision number, but we can add that later.
      return {
        path: `${debName}_${version}_${getDebArchName(getArch(buildVariant))}.deb`,
        contentType: 'application/vnd.debian.binary-package'
      };
    case 'darwin':
    case 'win32':
      return {
        path: `${name}-${version}-${buildVariant}.zip`,
        contentType: 'application/zip'
      };
    case 'win32msi':
      return {
        path: `${name}-${version}-${getArch(buildVariant)}.msi`,
        contentType: 'application/x-msi'
      };
    default:
      throw new Error(`Unknown build variant: ${buildVariant}`);
  }
}
