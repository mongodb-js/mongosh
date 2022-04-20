#!/usr/bin/env node
/* eslint-disable strict, no-sync */
'use strict';
const fs = require('fs');
const path = require('path');

// Create compiled runtime support code.

const inJS = path.resolve(__dirname, '..', 'src', 'runtime-support.nocov.js');
const outJS = path.resolve(__dirname, '..', 'src', 'runtime-support.out.nocov.ts');

if (process.argv[2] === '--firstpass') {
  // Create a dummy file so that AsyncRewriter can be compiled using it.
  fs.writeFileSync(outJS, 'export default "";\n');
  return;
}

// Actually create the contents only once AsyncRewriter has actually been
// compiled.
const AsyncRewriter = require('../lib').default;
const rewriter = new AsyncRewriter();
const runtimeSupportCode = rewriter.process(
  rewriter.unprocessedRuntimeSupportCode() +
  fs.readFileSync(inJS, 'utf8'));
fs.writeFileSync(outJS, `export default ${JSON.stringify(runtimeSupportCode)};\n`);
