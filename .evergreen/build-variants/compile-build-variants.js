// @ts-check

/** @type {import("./compile-build-variants").CompileBuildVariant[]} */
exports.COMPILE_BUILD_VARIANTS = [
  {
    displayName: 'RHEL 7.0 x64',
    runOn: 'rhel70-build',
    executableOsId: 'linux-x64',
  },
  {
    displayName: 'RHEL 8.0 x64',
    runOn: 'rhel80-build',
    id: 'linux_x64_rhel8',
    executableOsId: 'linux-x64',
  },
  {
    displayName: 'RHEL 7.0 x64',
    runOn: 'rhel70-build',
    executableOsId: 'linux-x64-openssl11',
    sharedOpenSsl: 'openssl11',
  },
  {
    displayName: 'RHEL 8.0 x64',
    runOn: 'rhel80-build',
    id: 'linux_x64_openssl11_rhel8',
    executableOsId: 'linux-x64-openssl11',
    sharedOpenSsl: 'openssl11',
  },
  {
    displayName: 'RHEL 7.0 x64',
    runOn: 'rhel70-build',
    executableOsId: 'linux-x64-openssl3',
    sharedOpenSsl: 'openssl3',
  },
  {
    displayName: 'RHEL 8.0 x64',
    runOn: 'rhel80-build',
    id: 'linux_x64_openssl3_rhel8',
    executableOsId: 'linux-x64-openssl3',
    sharedOpenSsl: 'openssl3',
  },
  {
    displayName: 'Amazon 2 arm64',
    runOn: 'amazon2-arm64-large',
    executableOsId: 'linux-arm64',
  },
  {
    displayName: 'Amazon 2 arm64',
    runOn: 'amazon2-arm64-large',
    executableOsId: 'linux-arm64-openssl11',
    sharedOpenSsl: 'openssl11',
  },
  {
    displayName: 'Amazon 2 arm64',
    runOn: 'amazon2-arm64-large',
    executableOsId: 'linux-arm64-openssl3',
    sharedOpenSsl: 'openssl3',
  },
  {
    displayName: 'RHEL 8 PPC',
    runOn: 'rhel8-power-small',
    executableOsId: 'linux-ppc64le',
  },
  {
    displayName: 'RHEL 7 s390x',
    runOn: 'rhel7-zseries-large',
    executableOsId: 'linux-s390x',
  },
  {
    displayName: 'MacOS 15 Sequoia (amd64)',
    id: 'darwin',
    runOn: 'macos-15-amd64-gui',
    executableOsId: 'darwin-x64',
  },
  {
    displayName: 'MacOS 15 Sequoia (arm64)',
    runOn: 'macos-15-arm64',
    executableOsId: 'darwin-arm64',
  },
  {
    id: 'win32',
    displayName: 'Windows VS 2022',
    runOn: 'windows-2022-latest-small',
    executableOsId: 'win32',
  },
].map((buildVariant) => {
  const { displayName, sharedOpenSsl, id, executableOsId } = buildVariant;
  const formattedDisplayName = [displayName, sharedOpenSsl, '(Build)']
    .filter((text) => text)
    .join(' ');

  return {
    ...buildVariant,
    id,
    displayName: formattedDisplayName,
    name: `build_${id ?? executableOsId.replaceAll('-', '_')}`,
  };
});
