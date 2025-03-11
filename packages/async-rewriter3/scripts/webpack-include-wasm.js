'use strict';
const { readFileSync, readdirSync, writeFileSync } = require('fs');
const path = require('path');

const dist = path.join(__dirname, '..', 'dist');
const files = Object.create(null);
for (const file of readdirSync(dist)) {
  const filename = path.join(dist, file);
  if (filename.endsWith('.wasm')) {
    files[file] = readFileSync(filename).toString('base64');
  }
}

const indexFilename = path.join(dist, 'index.js')
const indexPrev = readFileSync(indexFilename, 'utf8');
writeFileSync(indexFilename, `((ExtraAssets) => { ${indexPrev}; })(${JSON.stringify(files)});`);
