const CliRepl = require('./lib/cli-repl.js');

if (process.argv[2] === 'start') new CliRepl();
if (process.argv[2] === 'start-antlr') new CliRepl(true);

module.exports = CliRepl;
