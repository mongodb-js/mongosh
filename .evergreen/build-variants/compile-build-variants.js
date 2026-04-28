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
    runOn: 'macos-15-arm64-gui',
    executableOsId: 'darwin-arm64',
  },
  {
    id: 'win32',
    displayName: 'Windows VS 2022',
    runOn: 'windows-2022-latest-small',
    executableOsId: 'win32',
  },
  {
    id: 'linux_x64_node_nightly',
    // Node.js v26+ needs GCC >= 13.2 (per BUILDING.md); rhel80-build ships
    // GCC 12.4. RHEL 10 ships a new-enough toolchain by default, so the
    // nightly variant builds there instead of going through gcc-toolset.
    displayName: 'RHEL 10 x64 Node.js nightly',
    runOn: 'rhel10.0-large',
    executableOsId: 'linux-x64-node-nightly',
    nodeJsVersion: 'nightly',
    // TODO(MONGOSH-2969): re-enable when V8 in Node.js nightly stops emitting
    // non-dependent static_asserts inside discarded `if constexpr` branches.
    // Current v26 nightlies (as of 2026-04) fail to build on any toolchain
    // (see deps/v8/src/builtins/builtins-iterator-inl.h:275 et al). All the
    // multi-version patch / nvm install / setup-env wiring is in place so
    // dropping this `disabled` flag is the only thing needed once v26 stabilizes.
    disabled: true,
  },
]
  .filter(({ disabled }) => disabled !== true)
  .map((buildVariant) => {
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
