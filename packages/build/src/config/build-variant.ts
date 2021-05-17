/**
 * Build Variant enum.
 *
 * Different from 'platform': platform is extracted from os.platform() and
 * build variant defines the desired distribution type to build for.
 */
export type Distro = 'win32' | 'win32msi' | 'darwin' | 'linux' | 'debian' | 'rhel' | 'suse' | 'amzn2';
export type Arch = 'x64' | 's390x' | 'arm64' | 'ppc64le';
export type BuildVariant = `${Distro}-${Arch}`;

export const ALL_BUILD_VARIANTS: readonly BuildVariant[] = Object.freeze([
  'win32-x64', 'win32msi-x64',
  'darwin-x64',
  'linux-x64', 'linux-s390x', 'linux-arm64', 'linux-ppc64le',
  'debian-x64', 'debian-arm64',
  'rhel-x64', 'rhel-s390x', 'rhel-arm64', 'rhel-ppc64le',
  'suse-x64',
  'amzn2-arm64'
] as const);

export function validateBuildVariant(variant?: BuildVariant): asserts variant is BuildVariant {
  if (typeof variant === 'undefined' || !ALL_BUILD_VARIANTS.includes(variant)) {
    throw new Error(`${variant} is not a valid build variant identifier`);
  }
}

export function getDistro(variant: BuildVariant): Distro {
  validateBuildVariant(variant);
  return variant.split('-')[0] as Distro;
}

export function getArch(variant: BuildVariant): Arch {
  validateBuildVariant(variant);
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

// eslint-disable-next-line complexity
export function getDownloadCenterDistroDescription(variant: BuildVariant): string {
  switch (variant) {
    case 'win32-x64': return 'Windows 64-bit (8.1+)';
    case 'win32msi-x64': return 'Windows 64-bit (8.1+) (MSI)';
    case 'darwin-x64': return 'MacOS 64-bit (10.12+)';
    case 'linux-x64': return 'Linux Tarball 64-bit';
    case 'linux-s390x': return 'Linux Tarball s390x';
    case 'linux-arm64': return 'Linux Tarball arm64';
    case 'linux-ppc64le': return 'Linux Tarball ppc64le';
    case 'debian-x64': return 'Debian / Ubuntu 64-bit';
    case 'debian-arm64': return 'Debian / Ubuntu arm64';
    case 'rhel-x64': return 'Redhat / Centos / Amazon Linux 2 64-bit';
    case 'rhel-s390x': return 'Redhat / Centos s390x';
    case 'rhel-ppc64le': return 'Redhat / Centos ppc64le';
    case 'rhel-arm64': return 'Redhat / Centos arm64';
    case 'suse-x64': return 'SUSE Linux 64-bit';
    case 'amzn2-arm64': return 'Amazon Linux 2 arm64';
    default: throw new Error(`${variant} is not a valid build variant`);
  }
}
