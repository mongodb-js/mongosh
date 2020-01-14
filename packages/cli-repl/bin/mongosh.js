#!/usr/bin/env node
const { CliRepl } = require('../lib');

process.title = 'mongosh';

if (process.argv[2] === 'start-antlr') {
  return new CliRepl(true);
}

new CliRepl();
