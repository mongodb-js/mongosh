const os = require('os');
const path = require('path');
const { compileExec } = require('@mongosh/build');
const config = require(path.join(__dirname, '..', 'config', 'build.conf.js'));

compileExec(config.input, config.outputDir, os.platform());
