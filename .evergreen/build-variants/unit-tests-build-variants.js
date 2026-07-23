//@ts-check
const {
  MONGODB_VERSIONS,
  NODE_VERSIONS,
  PLATFORMS,
  platformToDetails,
} = require('../constants');

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
    UNIT_TESTS_BUILD_VARIANTS.push({
      ...platformDetails,
      name: `${platform}-n${nShort}`,
      displayName: `${platformDetails.displayName} n${nShort} (Unit tests)`,
      id: `${platform}-n${nShort}`,
      runWithUnitTestsOnly: true,
      tags: platformDetails.tags ?? [],
      platform,
      nShort,
      nVersion,
      skipNodeVersionCheck,
      disable: optional === true,
    });
    for (const {
      shortName: mShort,
      versionSpec: mVersion,
    } of MONGODB_VERSIONS) {
      if (
        ['44xc', '44xe', '50xc', '50xe'].includes(mShort) &&
        platform === 'darwin'
      ) {
        // Unit tests on macOS use arm64 and therefore require 6.0+
        continue;
      }
      const details =
        platform === 'linux' &&
        ['latest', '90xc', '90xe'].includes(mShort)
          ? {
              ...platformDetails,
              runOn: 'ubuntu2204-small',
              displayName: 'Ubuntu 22.04 x64',
            }
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
        mVersion,
        skipNodeVersionCheck,
        disable: optional === true,
      });
    }
  }
}

exports.UNIT_TESTS_BUILD_VARIANTS = UNIT_TESTS_BUILD_VARIANTS;
