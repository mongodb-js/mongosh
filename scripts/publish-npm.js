const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const readline = require('readline');

const rootPath = path.resolve('__dirname', '..');

function requireSegmentApiKey() {
  const MONGOSH_SEGMENT_API_KEY = process.env.MONGOSH_SEGMENT_API_KEY || '';

  if (!MONGOSH_SEGMENT_API_KEY) {
    throw new Error('MONGOSH_SEGMENT_API_KEY environment variable must be set');
  }

  if (MONGOSH_SEGMENT_API_KEY.length !== 32) {
    throw new Error('MONGOSH_SEGMENT_API_KEY does not seem to have the proper format');
  }

  return MONGOSH_SEGMENT_API_KEY;
}

function gitClone(repo, dest) {
  return execSync(`git clone ${repo} ${dest}`);
}

function getGitRemoteUrl() {
  return execSync('git config --get remote.origin.url', {cwd: rootPath}).toString().trim();
}

function getGitRemoteHeadSHA(remoteUrl) {
  return execSync(
    `git ls-remote ${remoteUrl} HEAD`, {cwd: rootPath}
  ).toString().split(/\s+/)[0].trim();
}

function writeSegmentApiKey(segmentApiKey, releaseDirPath) {
  const analyticsConfigPath = path.resolve(
    releaseDirPath,
    'packages',
    'cli-repl',
    'lib',
    'analytics-config.js'
  );

  console.info(`writing ${segmentApiKey} to ${analyticsConfigPath}`);

  fs.writeFileSync(
    analyticsConfigPath,
    `module.exports = { SEGMENT_API_KEY: '${segmentApiKey}' };`
  );

  assert.equal(require(analyticsConfigPath).SEGMENT_API_KEY, segmentApiKey);
}

function isDone(task, releaseDirPath) {
  return fs.existsSync(`${releaseDirPath}-${task}.done`);
}

function done(task, releaseDirPath) {
  fs.writeFileSync(`${releaseDirPath}-${task}.done`, '');
}

function publish() {
  const segmentApiKey = requireSegmentApiKey();
  const remoteUrl = getGitRemoteUrl();
  const remoteHeadSha = getGitRemoteHeadSHA(remoteUrl);
  const releaseDirPath = path.resolve(rootPath, 'tmp', 'releases', remoteHeadSha);

  if (!isDone('clone', releaseDirPath)) {
    console.info(`cloning '${remoteUrl}' to '${releaseDirPath}'`);
    gitClone(remoteUrl, releaseDirPath);
    done('clone', releaseDirPath);
  } else {
    console.info('already cloned .. skipping');
  }

  if (!isDone('bootstrap', releaseDirPath)) {
    execSync('npm run bootstrap-ci', {cwd: releaseDirPath, stdio: 'inherit'});
    done('bootstrap', releaseDirPath);
  } else {
    console.info('already bootstrapped .. skipping');
  }

  if (!isDone('write-segment-api-key', releaseDirPath)) {
    writeSegmentApiKey(segmentApiKey, releaseDirPath);
    done('write-segment-api-key', releaseDirPath);
  } else {
    console.info('already written segment api key .. skipping');
  }

  if (!isDone('lerna-publish', releaseDirPath)) {
    execSync('npm run publish-npm-lerna', {cwd: releaseDirPath, stdio: 'inherit'});
    done('lerna-publish', releaseDirPath);
  } else {
    console.info('already published to npm .. skipping');
  }

  console.info('done');
}

function main() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  console.log(
    'NOTE: This will publish what is currently pushed on the main branch of the remote. ' +
    ' ie. Any change not pushed or in a different branch will be ignored.\n'
  );

  rl.question('Is that what you want? Y/[N]: ', (answer) => {
    rl.close();
    if (answer.match(/^[yY]$/)) {
      publish();
    }
  });
}

main();
