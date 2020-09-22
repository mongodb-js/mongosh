const os = require('os');
const path = require('path');
const { compileExec } = require('@mongosh/build');
const config = require(path.join(__dirname, '..', 'config', 'build.conf.js'));

const run = async() => {
  console.log(`node --version ${process.version}`);

  let { signableBinary } = config;
  if (process.argv.includes('--no-signable')) {
    signableBinary = false;
  }
  if (process.argv.includes('--signable')) {
    signableBinary = true;
  }

  await compileExec(
    config.input,
    config.execInput,
    config.outputDir,
    os.platform(),
    signableBinary,
    config.analyticsConfig,
    config.segmentKey
  );
};

run().then(
  () => process.exit(0),
  (err) => process.nextTick(() => { throw err; }));
