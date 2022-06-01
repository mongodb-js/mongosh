import { RELEASE_PACKAGE_MATRIX } from '../../../../config/release-package-matrix';

export type Distro = 'win32' | 'win32msi' | 'darwin' | 'linux' | 'deb' | 'rpm';
export type Arch = 'x64' | 's390x' | 'arm64' | 'ppc64le';
export type OpenSSLTag = '' | '-openssl11' | '-openssl3';

/**
 * Package Variant enum.
 *
 * Different from 'platform': platform is extracted from os.platform() and
 * package variant defines the desired distribution type to build for.
 */
export type PackageVariant = `${Distro}-${Arch}${OpenSSLTag}`;

export const ALL_PACKAGE_VARIANTS = Object.freeze(
  RELEASE_PACKAGE_MATRIX.flatMap(({ packages }) => packages.map(({ name }) => name))) as readonly PackageVariant[];

export function validatePackageVariant(variant?: PackageVariant): asserts variant is PackageVariant {
  if (
    typeof variant === 'undefined' ||
    !ALL_PACKAGE_VARIANTS.includes(variant)
  ) {
    throw new Error(`${variant} is not a valid build variant identifier`);
  }
}

export function getDistro(variant: PackageVariant): Distro {
  validatePackageVariant(variant);
  return variant.split('-')[0] as Distro;
}

export function getArch(variant: PackageVariant): Arch {
  validatePackageVariant(variant);
  return variant.split('-')[1] as Arch;
}

export function getDebArchName(arch: Arch): string {
  switch (arch) {
    case 'x64': return 'amd64';
    case 's390x': return 's390x';
    case 'ppc64le': return 'ppc64el';
    case 'arm64': return 'arm64';
    default: throw new Error(`${arch} is not a valid arch value`);
  }
}

export function getRPMArchName(arch: Arch): string {
  switch (arch) {
    case 'x64': return 'x86_64';
    case 's390x': return 's390x';
    case 'ppc64le': return 'ppc64le';
    case 'arm64': return 'aarch64';
    default: throw new Error(`${arch} is not a valid arch value`);
  }
}

export function getDownloadCenterDistroDescription(variant: PackageVariant): string {
  for (const { packages } of RELEASE_PACKAGE_MATRIX) {
    for (const pkg of packages) {
      if (pkg.name === variant) {return pkg.description;}
    }
  }

  throw new Error(`${variant} is not a valid build variant`);
}
