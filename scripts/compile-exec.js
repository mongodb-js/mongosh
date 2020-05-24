const os = require('os');
const path = require('path');
const { compileExec } = require('@mongosh/build');
const config = require(path.join(__dirname, '..', 'config', 'build.conf.js'));

const run = async() => {
  await compileExec(
    config.input,
    config.execInput,
    config.outputDir,
    os.platform(),
    config.analyticsConfig,
    config.segmentKey
  );
  process.exit(0);
};

run();
