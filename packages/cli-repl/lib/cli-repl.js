const repl = require('repl');
const util = require('util');
const { CliServiceProvider } = require('mongosh-service-provider');
const Mapper = require('mongosh-mapper');
const { compile } = require('mongosh-mapper');
const ShellApi = require('mongosh-shell-api');
// const _ = require('lodash');

const COLORS = { RED: "31", GREEN: "32", YELLOW: "33", BLUE: "34", MAGENTA: "35" };
const colorize = (color, s) => `\x1b[${color}m${s}\x1b[0m`;

class CliRepl {
  // TODO: parse command line args
  processCmdArgs(argv) {
    this.options = {
      uri: 'mongodb://localhost:27017',
      user: argv.user ? argv.user : process.env.USER,
      cwd: argv.cwd ? argv.cwd : process.cwd()
    };
    this.options.user = colorize(COLORS.MAGENTA, this.options.user);
    this.options.cwd = colorize(COLORS.YELLOW, this.options.cwd);
  }

  constructor(useAntlr) {
    this.processCmdArgs({});

    this.useAntlr = !!useAntlr;
    this.serviceProvider = new CliServiceProvider(this.options.uri);

    this.mapper = new Mapper(this.serviceProvider);
    this.shellApi = new ShellApi(this.mapper);

    this.start();
  }

  greet() {
    console.log(`
  Hello ${this.options.user}! Welcome to the mongodb shell 2.0 ${this.options.cwd}.
`);
  }

  writer(output) {
    if (output && output.toReplString) {
      return output.toReplString();
    }
    if (typeof output === 'string') {
      return output;
    }
    return util.inspect(output, {
      showProxy: false,
      colors: true,
    });
  }

  async evaluator(originalEval, input, context, filename) {
    const argv = input.trim().split(' ');
    const cmd = argv[0];
    argv.shift();
    switch(cmd) {
      case 'use':
        return this.shellApi.use(argv[0]);
      case 'it':
        return this.shellApi.it();
      case 'help()':
        return this.shellApi.help;
      case 'var':
        this.mapper.cursorAssigned = true;
      default:
        const finalValue = await originalEval(input, context, filename);
        return await this.writer(finalValue);
    }
  }

  start() {
    this.greet();

    this.repl = repl.start({
      prompt: `$${this.options.user} > `,
      ignoreUndefined: true,
      writer: this.writer
    });

    const originalEval = util.promisify(this.repl.eval);

    const customEval = async (input, context, filename, callback) => {
      try {
        let str;
        if (this.useAntlr) {
          // Eval once with execution turned off and a throwaway copy of the context
          this.mapper.checkAwait = true;
          this.mapper.awaitLoc = [];
          const copyCtx = context;// _.cloneDeep(context);
          await this.evaluator(originalEval, input, copyCtx, filename);

          // Pass the locations to a parser so that it can add 'await' if any function calls contain 'await' locations
          const syncStr = compile(input, this.mapper.awaitLoc);
          if (syncStr.trim() !== input.trim()) {
            console.log(`DEBUG: rewrote input "${input.trim()}" to "${syncStr.trim()}"`);
          }

          // Eval the rewritten string, this time for real
          this.mapper.checkAwait = false;
          str = await this.evaluator(originalEval, syncStr, context, filename);
        } else {
          str = await this.evaluator(originalEval, input, context, filename);
        }
        callback(null, str);
      } catch (err) {
        callback(err, null);
      } finally {
        this.mapper.cursorAssigned = false;
      }
    };

    this.repl.eval = customEval;

    Object.keys(this.shellApi)
      .filter(k => (!k.startsWith('_')))
      .forEach(k => (this.repl.context[k] = this.shellApi[k]));
    this.mapper.setCtx(this.repl.context);
  }
}

module.exports = CliRepl;
