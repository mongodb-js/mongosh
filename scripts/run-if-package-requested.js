#!/usr/bin/env node
'use strict';
const path = require('path');
const packageDir = path.basename(process.cwd());
if (process.env.MONGOSH_RUN_ONLY_IN_PACKAGE && process.env.MONGOSH_RUN_ONLY_IN_PACKAGE !== packageDir) {
  process.stderr.write(
    `${packageDir} is not ${process.env.MONGOSH_RUN_ONLY_IN_PACKAGE}, skipping "${process.argv.slice(2).join(' ')}"\n`);
  return;
}

if (process.version.startsWith("v24")) {
    process.env.NODE_OPTIONS = `${parentEnv.NODE_OPTIONS ?? ''} --no-experimental-strip-types`;
}

const child_process = require('child_process');
child_process.spawn(process.argv[2], process.argv.slice(3), { stdio: 'inherit', shell: process.platform === 'win32' })
  .on('exit', (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal);
    }
    process.exit(code);
  });
