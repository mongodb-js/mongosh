#!/usr/bin/env node
const { CliRepl } = require('../lib');
process.title = 'mongosh';
new CliRepl();
