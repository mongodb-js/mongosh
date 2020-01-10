import CliRepl from './cli-repl';

// TODO: Durran: Refactor to handle both executable and
// dev mode with npm start.
if (process.argv[2] === 'start') new CliRepl();
if (process.argv[2] === 'start-antlr') new CliRepl(true);

export default CliRepl;
