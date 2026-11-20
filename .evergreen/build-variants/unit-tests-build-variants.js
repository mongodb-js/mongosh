//@ts-check
const {
  MONGODB_VERSIONS,
  NODE_VERSIONS,
  PLATFORMS,
  platformToDetails,
} = require('../constants');

// MongoDB 6.0.30 has no macOS artifacts in the public download feed yet, so
// the macOS 6.0.x unit test variants cannot set up a server. Pin them to the
// last published macOS version until the artifacts are available.
const MONGODB_VERSION_OVERRIDES = {
  darwin: {
    '60xc': '6.0.29',
    '60xe': '6.0.29-enterprise',
  },
};

// Server-version coverage lives on Linux, where hosts are plentiful and cheap.
// macOS only needs to prove that the platform works, so keep a representative
// set (oldest supported, one LTS community and enterprise, and latest) instead
// of the whole matrix.
const DARWIN_MONGODB_VERSIONS = ['60xc', '80xc', '80xe', 'latest'];

/** @type {import("./unit-tests-build-variants.js").UnitTestsBuildVariant[]} */
const UNIT_TESTS_BUILD_VARIANTS = [];

for (const {
  shortName: nShort,
  versionSpec: nVersion,
  skipNodeVersionCheck,
  optional,
} of NODE_VERSIONS) {
  for (const platform of PLATFORMS) {
    const platformDetails = platformToDetails[platform];
    const ubuntu2204Details = {
      ...platformDetails,
      runOn: 'ubuntu2204-small',
      displayName: 'Ubuntu 22.04 x64',
    };
    const unitTestsOnlyDetails =
      platform === 'linux' ? ubuntu2204Details : platformDetails;
    UNIT_TESTS_BUILD_VARIANTS.push({
      ...unitTestsOnlyDetails,
      name: `${platform}-n${nShort}`,
      displayName: `${unitTestsOnlyDetails.displayName} n${nShort} (Unit tests)`,
      id: `${platform}-n${nShort}`,
      runWithUnitTestsOnly: true,
      tags: unitTestsOnlyDetails.tags ?? [],
      platform,
      nShort,
      nVersion,
      skipNodeVersionCheck,
      disable: optional === true,
    });
    for (const {
      shortName: mShort,
      versionSpec: mVersion,
      versionListUrl: mVersionListUrl,
    } of MONGODB_VERSIONS) {
      if (
        ['44xc', '44xe', '50xc', '50xe'].includes(mShort) &&
        platform === 'darwin'
      ) {
        // Unit tests on macOS use arm64 and therefore require 6.0+
        continue;
      }
      if (
        platform === 'darwin' &&
        !DARWIN_MONGODB_VERSIONS.includes(mShort)
      ) {
        continue;
      }
      const details =
        platform === 'linux' && ['latest', '90xc', '90xe'].includes(mShort)
          ? ubuntu2204Details
          : platformDetails;
      UNIT_TESTS_BUILD_VARIANTS.push({
        ...details,
        name: `tests_${platform}-m${mShort}_n${nShort}`,
        id: `${platform}-m${mShort}_n${nShort}`,
        runWithUnitTestsOnly: false,
        tags: [
          ...(details.tags ?? []),
          ...(mShort === 'latest' ? ['mlatest'] : []),
        ],
        displayName: `${details.displayName}${
          mShort === undefined ? '' : ` m${mShort}`
        } n${nShort} (Unit tests)`,
        platform,
        nShort,
        nVersion,
        mShort,
        mVersion: MONGODB_VERSION_OVERRIDES[platform]?.[mShort] ?? mVersion,
        mVersionListUrl,
        skipNodeVersionCheck,
        disable: optional === true,
      });
    }
  }
}

exports.UNIT_TESTS_BUILD_VARIANTS = UNIT_TESTS_BUILD_VARIANTS;
