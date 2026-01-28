// @ts-check
const { COMPILE_BUILD_VARIANTS } = require('./compile-build-variants');

/** @type {import("./e2e-tests-build-variants.js").E2ETestsBuildVariant[]} */
exports.E2E_TESTS_BUILD_VARIANTS = [
  {
    displayName: 'RHEL 7.0 x64',
    runOn: 'rhel70-small',
    tags: ['nightly-driver'],
    executableOsId: 'linux-x64',
    mVersion: '7.0.x',
  },
  {
    displayName: 'RHEL 7.6 x64',
    runOn: 'rhel76-small',
    tags: ['nightly-driver'],
    executableOsId: 'linux-x64',
    mVersion: '7.0.x',
  },
  {
    displayName: 'RHEL 8.0 x64',
    runOn: 'rhel80-small',
    tags: ['nightly-driver'],
    executableOsId: 'linux-x64',
    mVersion: 'stable',
  },
  {
    displayName: 'RHEL 9.0 x64',
    runOn: 'rhel90-small',
    tags: ['nightly-driver'],
    executableOsId: 'linux-x64',
    mVersion: '7.0.x',
  },
  {
    displayName: 'RHEL 9.3 x64',
    runOn: 'rhel93-small',
    tags: ['nightly-driver'],
    executableOsId: 'linux-x64',
    mVersion: 'stable',
  },
  {
    displayName: 'RHEL 8.3 x64',
    runOn: 'rhel83-fips',
    tags: ['nightly-driver'],
    executableOsId: 'linux-x64',
    mVersion: 'stable',
  },
  {
    displayName: 'RHEL 8.3 x64',
    runOn: 'rhel83-fips',
    tags: ['nightly-driver'],
    sharedOpenSsl: 'openssl11',
    executableOsId: 'linux-x64-openssl11',
    mVersion: 'stable',
  },
  {
    displayName: 'RHEL 8.3 x64',
    runOn: 'rhel83-fips',
    tags: ['nightly-driver'],
    fips: true,
    sharedOpenSsl: 'openssl11',
    executableOsId: 'linux-x64-openssl11',
    mVersion: 'stable',
  },
  {
    displayName: 'RHEL 9.3 x64',
    runOn: 'rhel93-fips',
    tags: ['nightly-driver'],
    executableOsId: 'linux-x64',
    mVersion: 'stable',
  },
  {
    displayName: 'RHEL 9.3 x64',
    runOn: 'rhel93-fips',
    tags: ['nightly-driver'],
    sharedOpenSsl: 'openssl3',
    executableOsId: 'linux-x64-openssl3',
    mVersion: 'stable',
  },
  {
    displayName: 'RHEL 9.3 x64',
    runOn: 'rhel93-fips',
    tags: ['nightly-driver'],
    fips: true,
    sharedOpenSsl: 'openssl3',
    executableOsId: 'linux-x64-openssl3',
    mVersion: 'stable',
  },
  {
    displayName: 'RHEL 10 x64',
    runOn: 'rhel10.0-small',
    tags: ['nightly-driver'],
    executableOsId: 'linux-x64',
    mVersion: 'stable',
  },
  {
    displayName: 'RHEL 10 x64',
    runOn: 'rhel10.0-small',
    tags: ['nightly-driver'],
    sharedOpenSsl: 'openssl3',
    executableOsId: 'linux-x64-openssl3',
    mVersion: 'stable',
  },
  {
    displayName: 'Ubuntu 18.04 x64',
    runOn: 'ubuntu1804-small',
    tags: ['nightly-driver'],
    executableOsId: 'linux-x64',
    mVersion: '6.0.x',
  },
  {
    displayName: 'Ubuntu 20.04 x64',
    runOn: 'ubuntu2004-small',
    tags: ['nightly-driver'],
    executableOsId: 'linux-x64',
    mVersion: 'stable',
  },
  {
    displayName: 'Ubuntu 20.04 x64',
    runOn: 'ubuntu2004-small',
    tags: ['nightly-driver'],
    sharedOpenSsl: 'openssl11',
    executableOsId: 'linux-x64-openssl11',
    mVersion: 'stable',
  },
  {
    displayName: 'Ubuntu 22.04 x64',
    runOn: 'ubuntu2204-small',
    tags: ['nightly-driver'],
    executableOsId: 'linux-x64',
    mVersion: 'stable',
  },
  {
    displayName: 'Ubuntu 22.04 x64',
    runOn: 'ubuntu2204-small',
    tags: ['nightly-driver'],
    sharedOpenSsl: 'openssl3',
    executableOsId: 'linux-x64-openssl3',
    mVersion: 'stable',
  },
  {
    displayName: 'Ubuntu 24.04 x64',
    runOn: 'ubuntu2404-small',
    tags: ['nightly-driver'],
    executableOsId: 'linux-x64',
    mVersion: 'stable',
  },
  {
    displayName: 'Ubuntu 24.04 x64',
    runOn: 'ubuntu2404-small',
    tags: ['nightly-driver'],
    sharedOpenSsl: 'openssl3',
    executableOsId: 'linux-x64-openssl3',
    mVersion: 'stable',
  },
  {
    displayName: 'Debian 10 x64',
    runOn: 'debian10-small',
    tags: ['nightly-driver'],
    executableOsId: 'linux-x64',
    mVersion: '6.0.x',
  },
  {
    displayName: 'Debian 10 x64',
    runOn: 'debian10-small',
    tags: ['nightly-driver'],
    sharedOpenSsl: 'openssl11',
    executableOsId: 'linux-x64-openssl11',
    mVersion: '6.0.x',
  },
  {
    displayName: 'Debian 11 x64',
    runOn: 'debian11-small',
    tags: ['nightly-driver'],
    executableOsId: 'linux-x64',
    mVersion: '7.0.x',
  },
  {
    displayName: 'Debian 11 x64',
    runOn: 'debian11-small',
    tags: ['nightly-driver'],
    sharedOpenSsl: 'openssl11',
    executableOsId: 'linux-x64-openssl11',
    mVersion: '7.0.x',
  },
  {
    displayName: 'Amazon Linux 2 x64',
    runOn: 'amazon2-small',
    tags: ['nightly-driver'],
    executableOsId: 'linux-x64',
    mVersion: '7.0.x',
  },
  {
    displayName: 'Amazon Linux 2023 x64',
    runOn: 'amazon2023.0-small',
    tags: ['nightly-driver'],
    executableOsId: 'linux-x64',
    mVersion: 'stable',
  },
  {
    displayName: 'SLES 12 x64',
    runOn: 'suse12-sp5-small',
    tags: ['nightly-driver'],
    executableOsId: 'linux-x64',
    mVersion: '7.0.x',
  },
  {
    displayName: 'SLES 15 x64',
    runOn: 'suse15sp4-small',
    tags: ['nightly-driver'],
    executableOsId: 'linux-x64',
    mVersion: 'stable',
  },
  {
    displayName: 'Ubuntu 18.04 arm64',
    runOn: 'ubuntu1804-arm64-small',
    executableOsId: 'linux-arm64',
    mVersion: '6.0.x',
  },
  {
    displayName: 'Ubuntu 20.04 arm64',
    runOn: 'ubuntu2004-arm64-small',
    executableOsId: 'linux-arm64',
    mVersion: 'stable',
  },
  {
    displayName: 'Ubuntu 20.04 arm64',
    runOn: 'ubuntu2004-arm64-small',
    sharedOpenSsl: 'openssl11',
    executableOsId: 'linux-arm64-openssl11',
    mVersion: 'stable',
  },
  {
    displayName: 'Ubuntu 22.04 arm64',
    runOn: 'ubuntu2204-arm64-small',
    executableOsId: 'linux-arm64',
    mVersion: 'stable',
  },
  {
    displayName: 'Ubuntu 22.04 arm64',
    runOn: 'ubuntu2204-arm64-small',
    sharedOpenSsl: 'openssl3',
    executableOsId: 'linux-arm64-openssl3',
    mVersion: 'stable',
  },
  {
    displayName: 'Ubuntu 24.04 arm64',
    runOn: 'ubuntu2404-arm64-small',
    executableOsId: 'linux-arm64',
    mVersion: 'stable',
  },
  {
    displayName: 'Ubuntu 24.04 arm64',
    runOn: 'ubuntu2404-arm64-small',
    sharedOpenSsl: 'openssl3',
    executableOsId: 'linux-arm64-openssl3',
    mVersion: 'stable',
  },
  {
    displayName: 'Ubuntu 24.04 arm64',
    runOn: 'ubuntu2404-arm64-small',
    sharedOpenSsl: 'openssl3',
    executableOsId: 'linux-arm64-openssl3',
    mVersion: '8.2.x',
  },
  {
    displayName: 'Amazon Linux 2 arm64',
    runOn: 'amazon2-arm64-small',
    executableOsId: 'linux-arm64',
    mVersion: '7.0.x',
  },
  {
    displayName: 'Amazon Linux 2023 arm64',
    runOn: 'amazon2023.0-arm64-small',
    executableOsId: 'linux-arm64',
    mVersion: 'stable',
  },
  {
    displayName: 'Amazon Linux 2023 arm64',
    runOn: 'amazon2023.0-arm64-small',
    executableOsId: 'linux-arm64',
    mVersion: '8.2.x',
  },
  {
    displayName: 'RHEL 8.2 arm64',
    runOn: 'rhel82-arm64-small',
    executableOsId: 'linux-arm64',
    mVersion: 'stable',
  },
  {
    displayName: 'RHEL 9.0 arm64',
    runOn: 'rhel90-arm64-small',
    executableOsId: 'linux-arm64',
    mVersion: '7.0.x',
  },
  {
    displayName: 'RHEL 9.0 arm64',
    runOn: 'rhel90-arm64-small',
    sharedOpenSsl: 'openssl3',
    executableOsId: 'linux-arm64-openssl3',
    mVersion: '7.0.x',
  },
  {
    displayName: 'RHEL 9.3 arm64',
    runOn: 'rhel93-arm64-small',
    executableOsId: 'linux-arm64',
    mVersion: 'stable',
  },
  {
    displayName: 'RHEL 9.3 arm64',
    runOn: 'rhel93-arm64-small',
    sharedOpenSsl: 'openssl3',
    executableOsId: 'linux-arm64-openssl3',
    mVersion: 'stable',
  },
  {
    displayName: 'RHEL 10 arm64',
    runOn: 'rhel10.0-arm64-small',
    tags: ['nightly-driver'],
    executableOsId: 'linux-arm64',
    mVersion: 'stable',
  },
  {
    displayName: 'RHEL 10 arm64',
    runOn: 'rhel10.0-arm64-small',
    tags: ['nightly-driver'],
    sharedOpenSsl: 'openssl3',
    executableOsId: 'linux-arm64-openssl3',
    mVersion: 'stable',
  },
  {
    displayName: 'RHEL 8 PPC',
    runOn: 'rhel8-power-small',
    executableOsId: 'linux-ppc64le',
    mVersion: 'stable',
  },
  {
    displayName: 'RHEL 9 PPC',
    runOn: 'rhel9-power-small',
    executableOsId: 'linux-ppc64le',
    mVersion: 'stable',
  },
  {
    displayName: 'RHEL 9 PPC',
    runOn: 'rhel9-power-small',
    executableOsId: 'linux-ppc64le',
    mVersion: '8.2.x',
  },
  {
    displayName: 'RHEL 7 s390x',
    runOn: 'rhel7-zseries-small',
    executableOsId: 'linux-s390x',
    mVersion: '6.0.x',
  },
  {
    displayName: 'RHEL 8 s390x',
    runOn: 'rhel8-zseries-small',
    executableOsId: 'linux-s390x',
    mVersion: 'stable',
  },
  {
    displayName: 'RHEL 9 s390x',
    runOn: 'rhel9-zseries-small',
    executableOsId: 'linux-s390x',
    mVersion: 'stable',
  },
  {
    displayName: 'RHEL 9 s390x',
    runOn: 'rhel9-zseries-small',
    executableOsId: 'linux-s390x',
    mVersion: '8.2.x',
  },
  {
    displayName: 'MacOS 14 x64',
    runOn: 'macos-14',
    executableOsId: 'darwin-x64',
    mVersion: 'stable',
  },
  {
    displayName: 'MacOS 14 arm64',
    runOn: 'macos-14-arm64',
    executableOsId: 'darwin-arm64',
    mVersion: 'stable',
  },
  {
    displayName: 'MacOS 14 arm64',
    runOn: 'macos-14-arm64',
    executableOsId: 'darwin-arm64',
    mVersion: '8.2.x',
  },
  {
    displayName: 'MacOS Big Sur',
    id: 'darwin',
    runOn: 'macos-13',
    executableOsId: 'darwin-x64',
    mVersion: '8.0.5',
  },
  {
    displayName: 'MacOS Big Sur arm64',
    runOn: 'macos-13-arm64',
    id: 'darwin_arm64',
    executableOsId: 'darwin-arm64',
    mVersion: '8.0.5',
    additionalTasks: [
      'package_artifact_darwin_x64',
      'sign_artifact_darwin_x64',
      'package_artifact_darwin_arm64',
      'sign_artifact_darwin_arm64',
    ],
  },
  {
    displayName: 'Windows VS PRE-2022',
    runOn: 'windows-vsCurrent-small',
    executableOsId: 'win32',
    mVersion: 'stable',
    additionalTasks: [
      'package_artifact_win32_x64',
      'package_artifact_win32msi_x64',
    ],
  },
  {
    displayName: 'Windows VS PRE-2022',
    runOn: 'windows-vsCurrent-small',
    executableOsId: 'win32',
    mVersion: '8.2.x'
  },
  {
    displayName: 'Windows VS 2022',
    runOn: 'windows-2022-latest-small',
    executableOsId: 'win32',
    mVersion: 'stable',
    additionalTasks: [
      'package_artifact_win32_x64',
      'package_artifact_win32msi_x64',
    ],
  },
  {
    displayName: 'Windows VS 2022',
    runOn: 'windows-2022-latest-small',
    executableOsId: 'win32',
    mVersion: '8.2.x'
  },
].map((buildVariant) => {
  const { displayName, fips, sharedOpenSsl, mVersion, runOn, executableOsId } =
    buildVariant;
  let id = (buildVariant.id ?? runOn ?? executableOsId).replaceAll('-', '_');

  const name = [
    'e2e_tests',
    id,
    sharedOpenSsl,
    mVersion != 'stable' ? `m${mVersion.replaceAll('.', '')}` : undefined,
    fips,
  ]
    .filter((text) => text)
    .join('_');

  const formattedDisplayName = [
    displayName,
    mVersion != 'stable' ? mVersion.replaceAll('.', '') : undefined,
    sharedOpenSsl,
    fips ? 'FIPS' : undefined,
    '(E2E tests)',
  ]
    .filter((text) => text)
    .join(' ');

  let compileBuildVariant = COMPILE_BUILD_VARIANTS.find(
    (pkg) => pkg.executableOsId == executableOsId
  )?.name;

  if (!compileBuildVariant)
    throw new Error(`Compile build variant not found for ${executableOsId}`);

  return {
    ...buildVariant,
    id,
    displayName: formattedDisplayName,
    name,
    compileBuildVariant,
  };
});
