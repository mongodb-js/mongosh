'use strict';
const child_process = require('child_process');
const path = require('path');
const os = require('os');

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
const INPUT = path.join(MONGOSH, 'lib', 'run.js');

/**
 * The input for the exec.
 */
const EXEC_INPUT = path.join(MONGOSH, 'dist', 'mongosh.js');

/**
 * The output dir for the build.
 */
const OUTPUT_DIR = path.join(ROOT, 'dist');

/**
 * Analytics configuration file.
 */
const ANALYTICS_CONFIG = path.join(MONGOSH, 'lib', 'analytics-config.js');

/**
 * The bundle id for MacOs.
 */
const APPLE_NOTARIZATION_BUNDLE_ID = 'com.mongodb.mongosh';

/**
 * The SHA for the current git HEAD.
 */
const REVISION = process.env.IS_PATCH ?
  `pr-${process.env.GITHUB_PR_NUMBER}-${process.env.REVISION_ORDER_ID}` :
  process.env.REVISION;

const BUILD_VARIANT = (process.env.BUILD_VARIANT || '').split('_')[0];

/**
 * Export the configuration for the build.
 */
module.exports = {
  version: CONFIG.version,
  rootDir: ROOT,
  input: INPUT,
  execInput: EXEC_INPUT,
  outputDir: OUTPUT_DIR,
  analyticsConfig: ANALYTICS_CONFIG,
  project: process.env.PROJECT,
  revision: REVISION,
  branch: process.env.BRANCH_NAME,
  evgAwsKey: process.env.AWS_KEY,
  evgAwsSecret: process.env.AWS_SECRET,
  downloadCenterAwsKey: process.env.DOWNLOAD_CENTER_AWS_KEY,
  downloadCenterAwsSecret: process.env.DOWNLOAD_CENTER_AWS_SECRET,
  githubToken: process.env.GITHUB_TOKEN,
  segmentKey: process.env.SEGMENT_API_KEY,
  isCi: process.env.IS_CI === 'true',
  isPatch: process.env.IS_PATCH === 'true',
  platform: os.platform(),
  execNodeVersion: process.env.NODE_JS_VERSION || `^${process.version.slice(1)}`,
  buildVariant: BUILD_VARIANT,
  appleCodesignIdentity: process.env.APPLE_CODESIGN_IDENTITY,
  appleCodesignEntitlementsFile: path.resolve(__dirname, 'macos-entitlements.xml'),
  appleNotarizationBundleId: APPLE_NOTARIZATION_BUNDLE_ID,
  appleNotarizationUsername: process.env.APPLE_NOTARIZATION_USERNAME,
  appleNotarizationApplicationPassword: process.env.APPLE_NOTARIZATION_APPLICATION_PASSWORD,
  repo: {
    owner: 'mongodb-js',
    repo: 'mongosh'
  },
  dryRun: false
};
