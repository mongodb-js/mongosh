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
        mShort === '42xe' &&
        (platform === 'linux' || platform === 'darwin')
      ) {
        // The MongoDB 4.2 enterprise server does not work on Ubuntu 20.04 or arm64 macOS
        continue;
      }
      if (
        ['42xc', '42xe', '44xc', '44xe', '50xc', '50xe'].includes(mShort) &&
        platform === 'darwin'
      ) {
        // Unit tests on macOS use arm64 and therefore require 6.0+
        continue;
      }
      // Ubuntu 20.04 is EOL for server 9.0 and no longer receives nightly
      // builds, so its `latest` download is permanently frozen at a pre-9.0-GA
      // build. Run the `latest` (mlatest) linux variant on the minimum
      // still-supported distro instead.
      const details =
        platform === 'linux' && mShort === 'latest'
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
