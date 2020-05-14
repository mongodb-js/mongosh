const path = require('path');

/**
 * The project root.
 */
const ROOT = path.join(__dirname, '..');

/**
 * The mongosh package.
 */
const MONGOSH = path.join(ROOT, 'packages', 'cli-repl');

/**
 * The project config.
 */
const CONFIG = require(path.join(MONGOSH, 'package.json'));

/**
 * The input for the build.
 */
const INPUT = path.join(MONGOSH, 'bin', 'mongosh.js');

/**
 * The output dir for the build.
 */
const OUTPUT_DIR = path.join(ROOT, 'dist');

/**
 * Export the configuration for the build.
 */
module.exports = {
  version: CONFIG.version,
  input: INPUT,
  outputDir: OUTPUT_DIR,
  evgAwsKey: process.env.AWS_KEY,
  evgAwsSecret: process.env.AWS_SECRET,
  downloadCenterAwsKey: process.env.DOWNLOAD_CENTER_AWS_KEY,
  downloadCenterAwsSecret: process.env.DOWNLOAD_CENTER_AWS_SECRET
};
