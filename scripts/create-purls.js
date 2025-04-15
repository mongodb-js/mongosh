#!/usr/bin/env node
'use strict';
const fs = require('fs');
for (const file of process.argv.slice(2)) {
  for (const { name, version } of JSON.parse(fs.readFileSync(file, 'utf8'))) {
    if (name === '.node.js') {
      console.log(`pkg:generic/node@${encodeURIComponent(version)}`);
    } else {
      console.log(`pkg:npm/${encodeURIComponent(name)}@${encodeURIComponent(version)}`);
    }
  }
}
