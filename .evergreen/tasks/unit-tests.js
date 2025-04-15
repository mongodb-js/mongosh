// @ts-check
const path = require('path');
const fs = require('fs');
const { PLATFORMS } = require('../constants');
const {
  UNIT_TESTS_BUILD_VARIANTS,
} = require('../build-variants/unit-tests-build-variants');

const UNIT_TESTS = [];

const pathToPackages = path.join(__dirname, '..', '..', 'packages');
const MONGOSH_PACKAGES = fs
  .readdirSync(pathToPackages, { withFileTypes: true })
  .filter(
    (d) =>
      d.isDirectory() &&
      fs.existsSync(path.join(pathToPackages, d.name, 'package.json'))
  )
  .map((d) => ({
    name: d.name,
    ...(JSON.parse(
      fs.readFileSync(
        path.join(pathToPackages, d.name, 'package.json'),
        'utf-8'
      )
    ).mongosh || {}),
  }));

for (const packageInfo of MONGOSH_PACKAGES) {
  const id = `${packageInfo.name.replace(/-/g, '_')}`;

  const variants = packageInfo.variants ?? PLATFORMS;
  UNIT_TESTS.push({
    id,
    packageName: packageInfo.name,
    unitTestsOnly: packageInfo.unitTestsOnly || false,
    usePuppeteer: packageInfo.usePuppeteer || false,
    variants,
  });
}

const UNIT_TESTS_WITH_BUILD_VARIANTS = [];
for (let variant of UNIT_TESTS_BUILD_VARIANTS) {
  for (let unitTest of UNIT_TESTS.filter(
    (t) =>
      t.variants.includes(variant.platform) &&
      (!t.unitTestsOnly || (t.unitTestsOnly && variant.runWithUnitTestsOnly))
  )) {
    UNIT_TESTS_WITH_BUILD_VARIANTS.push([unitTest, variant]);
  }
}
exports.UNIT_TESTS_WITH_BUILD_VARIANTS = UNIT_TESTS_WITH_BUILD_VARIANTS;

exports.UNIT_TESTS = UNIT_TESTS;
