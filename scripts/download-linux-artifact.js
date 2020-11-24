#!/usr/bin/env node
'use strict';
require('./import-expansions');
const { getArtifactUrl } = require('../packages/build');
const config = require('../config/build.conf');
const download = require('download');
const fs = require('fs').promises;

(async() => {
  const url = getArtifactUrl('mongosh', config.revision, `mongosh-${config.version}-linux.tgz`);
  await fs.mkdir(config.outputDir, { recursive: true });
  await download(url, config.outputDir, { extract: true });
})().catch(err => process.nextTick(() => { throw err; }));
