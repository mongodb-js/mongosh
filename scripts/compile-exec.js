const os = require('os');
const path = require('path');
const { compileExec } = require('@mongosh/build');
const { execSync } = require('child_process');
const config = require(path.join(__dirname, '..', 'config', 'build.conf.js'));

const run = async() => {
  console.log(`node --version ${execSync('node --version')}`);

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
