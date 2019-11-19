const CliRepl = require('./lib/cli-repl.js');

if (process.argv[2] === 'start') new CliRepl();

module.exports = CliRepl;
