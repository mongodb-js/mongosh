/**
 * Build Variant enum.
 *
 * Different from 'platform': platform is extracted from os.platform() and
 * build variant defines the desired distribution type to build for.
 */
export type Distro = 'win32' | 'win32msi' | 'darwin' | 'linux' | 'debian' | 'rhel';
export type Arch = 'x64' | 's390x' | 'arm64' | 'ppc64le';
export type BuildVariant = `${Distro}-${Arch}`;

export const ALL_BUILD_VARIANTS: readonly BuildVariant[] = Object.freeze([
  'win32-x64', 'win32msi-x64', 'darwin-x64',
  'linux-x64', 'linux-s390x', 'linux-arm64', 'linux-ppc64le',
  'debian-x64', 'debian-s390x', 'debian-arm64', 'debian-ppc64le',
  'rhel-x64', 'rhel-s390x', 'rhel-arm64', 'rhel-ppc64le'
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
