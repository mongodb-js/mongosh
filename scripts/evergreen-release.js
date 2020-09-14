require('./import-expansions');

const path = require('path');
const { release, BuildVariant } = require(path.join('..', 'packages', 'build'));
const config = require(path.join(__dirname, '..', 'config', 'build.conf.js'));

/**
 * Run the release process.
 */
const runRelease = async() => {
  const command = process.argv[2];

  if (!['package', 'publish'].includes(command)) {
    throw new Error('USAGE: npm run evergreen-release <package|publish> [--dry]');
  }

  if (process.argv.includes('--dry')) {
    config.dryRun = true;
  }
  const cliBuildVariant =
    process.argv.map((arg) => arg.match(/^--build-variant=(.+)$/)).filter(Boolean)[0];
  if (cliBuildVariant !== undefined) {
    config.buildVariant = cliBuildVariant[1];
  }

  // Resolve 'Windows' to 'win32' etc.
  if (BuildVariant[config.buildVariant])
    config.buildVariant = BuildVariant[config.buildVariant];

  await release(command, config);
};

runRelease().then(
  () => process.exit(0),
  (err) => process.nextTick(() => { throw err; }));
