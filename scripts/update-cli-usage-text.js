#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const child_process = require('child_process');

const usage = child_process.execFileSync(process.execPath, [path.resolve(__dirname, '..', 'packages', 'cli-repl', 'bin', 'mongosh.js'), '--help'],
{encoding: 'utf8'})

for (const file of process.argv.slice(2)) {
  let contents = fs.readFileSync(file, 'utf8');
  contents = contents.replaceAll(/(<!--\s*AUTOMATICALLY_INSERT_CLI_USAGE\s*-->).*(<!--\s*\/AUTOMATICALLY_INSERT_CLI_USAGE\s*-->)/gs,
    (_match, p1, p2) => `${p1}\n\n\`\`\`shell${usage}\`\`\`\n\n${p2}`);
  fs.writeFileSync(file, contents);
}
