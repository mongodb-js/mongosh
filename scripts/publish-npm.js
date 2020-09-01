const { execSync, execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const readline = require('readline');

const rootPath = path.resolve('__dirname', '..');

function requireSegmentApiKey() {
  const { MONGOSH_SEGMENT_API_KEY } = process.env;

  assert(
    MONGOSH_SEGMENT_API_KEY,
    'MONGOSH_SEGMENT_API_KEY environment variable must be set'
  );

  assert(
    MONGOSH_SEGMENT_API_KEY.length === 32,
    'MONGOSH_SEGMENT_API_KEY does not seem to have the proper format'
  );

  return MONGOSH_SEGMENT_API_KEY;
}

function gitClone(repo, dest) {
  return execSync(`git clone ${repo} ${dest}`);
}

function getGitRemoteUrl() {
  return execSync(
    'git config --get remote.origin.url',
    { cwd: rootPath }
  ).toString().trim();
}

function getGitRemoteHeadSHA(remoteUrl) {
  return execSync(
    `git ls-remote ${remoteUrl} HEAD`, { cwd: rootPath }
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

function isTaskDone(task, releaseDirPath) {
  return fs.existsSync(`${releaseDirPath}-${task}.done`);
}

function markTaskAsDone(task, releaseDirPath) {
  fs.writeFileSync(`${releaseDirPath}-${task}.done`, '');
}

function publish() {
  const segmentApiKey = requireSegmentApiKey();
  const remoteUrl = getGitRemoteUrl();
  const remoteHeadSha = getGitRemoteHeadSHA(remoteUrl);
  const releaseDirPath = path.resolve(rootPath, 'tmp', 'releases', remoteHeadSha);

  if (!isTaskDone('clone', releaseDirPath)) {
    console.info(`cloning '${remoteUrl}' to '${releaseDirPath}'`);
    gitClone(remoteUrl, releaseDirPath);
    markTaskAsDone('clone', releaseDirPath);
  } else {
    console.info('already cloned .. skipping');
  }

  if (!isTaskDone('bootstrap', releaseDirPath)) {
    execSync(
      'npm run bootstrap-ci',
      {cwd: releaseDirPath, stdio: 'inherit'}
    );
    markTaskAsDone('bootstrap', releaseDirPath);
  } else {
    console.info('already bootstrapped .. skipping');
  }

  if (!isTaskDone('write-segment-api-key', releaseDirPath)) {
    writeSegmentApiKey(segmentApiKey, releaseDirPath);
    markTaskAsDone('write-segment-api-key', releaseDirPath);
  } else {
    console.info('already written segment api key .. skipping');
  }

  if (!isTaskDone('lerna-publish', releaseDirPath)) {
    const lerna = path.resolve(releaseDirPath, 'node_modules', '.bin', 'lerna');
    execFileSync(
      lerna,
      ['publish', '--force-publish'],
      { cwd: releaseDirPath, stdio: 'inherit' }
    );
    markTaskAsDone('lerna-publish', releaseDirPath);
  } else {
    console.info('already published to npm .. skipping');
  }

  console.info('done, now you can remove', releaseDirPath);
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
