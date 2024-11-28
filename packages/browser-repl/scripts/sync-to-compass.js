/* eslint-disable no-console */
'use strict';
const fs = require('fs');
const path = require('path');
const child_process = require('child_process');
const { debounce } = require('lodash');

if (!process.env.COMPASS_HOME) {
  throw new Error('Missing required environment variable $COMPASS_HOME.');
}

const packageDir = path.resolve(__dirname, '..');
const srcDir = path.resolve(__dirname, '..', 'src');
const libDir = path.resolve(__dirname, '..', 'lib');

const destDir = path.dirname(
  child_process.execFileSync(
    'node',
    ['-e', "console.log(require.resolve('@mongosh/browser-repl'))"],
    { cwd: process.env.COMPASS_HOME, encoding: 'utf-8' }
  )
);

console.log({ packageDir, srcDir, libDir, destDir });

const compileAndCopy = debounce(
  function () {
    child_process.execFileSync('npm', ['run', 'compile'], { cwd: packageDir });
    fs.cpSync(libDir, destDir, { recursive: true });
    console.log('done.');
  },
  1_000,
  {
    leading: true,
    trailing: true,
  }
);

const srcWatcher = fs.watch(
  srcDir,
  { recursive: true },
  function (eventType, filename) {
    console.log(eventType, filename);
    compileAndCopy();
  }
);

function cleanup() {
  srcWatcher.close();
}

for (const evt of ['SIGINT', 'SIGTERM']) {
  process.on(evt, cleanup);
}

// do an initial copy on startup
compileAndCopy();
