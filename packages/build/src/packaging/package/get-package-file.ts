import { BuildVariant } from '../../config';

export interface PackageFile {
  path: string;
  contentType: string;
}

export function getPackageFile(buildVariant: BuildVariant, version: string, name: string): PackageFile {
  switch (buildVariant) {
    case BuildVariant.Linux:
      return {
        path: `${name}-${version}-${buildVariant}.tgz`,
        contentType: 'application/gzip'
      };
    case BuildVariant.Redhat:
      return {
        path: `${name}-${version}-x86_64.rpm`,
        contentType: 'application/x-rpm'
      };
    case BuildVariant.Debian:
      // debian packages are required to be separated by _ and have arch in the
      // name: https://www.debian.org/doc/manuals/debian-faq/pkg-basics.en.html
      // sometimes there is also revision number, but we can add that later.
      return {
        path: `${name}_${version}_amd64.deb`,
        contentType: 'application/vnd.debian.binary-package'
      };
    case BuildVariant.MacOs:
    case BuildVariant.Windows:
      return {
        path: `${name}-${version}-${buildVariant}.zip`,
        contentType: 'application/zip'
      };
    case BuildVariant.WindowsMSI:
      return {
        path: `${name}-${version}.msi`,
        contentType: 'application/x-msi'
      };
    default:
      throw new Error(`Unknown build variant: ${buildVariant}`);
  }
}
