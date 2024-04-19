'use strict';
const fs = require('fs');
const packed = fs.readFileSync('./lib/packed.js', 'utf8');
const wrapped = `module.exports = ${JSON.stringify(packed)}`;
fs.writeFileSync('./lib/wrapped.js', wrapped);
