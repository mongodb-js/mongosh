const os = require('os');
const path = require('path');
const { compileExec } = require('@mongosh/build');
const config = require(path.join(__dirname, '..', 'config', 'build.conf.js'));

const run = async() => {
  console.log(`node --version ${process.version}`);

  await compileExec(
    config.input,
    config.execInput,
    config.outputDir,
    os.platform(),
    config.analyticsConfig,
    config.segmentKey
  );
};

run().then(
  () => process.exit(0),
  (err) => process.nextTick(() => { throw err; }));
