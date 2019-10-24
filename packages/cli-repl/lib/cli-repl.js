const repl = require('repl');
const util = require('util');
const { CliServiceProvider } = require('mongodbsh-service-provider');
const Mapper = require('mongodbsh-mapper');
const ShellApi = require('mongodbsh-shell-api');

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

  constructor(argv) {
    this.processCmdArgs(argv || {});

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

  finish(err, res, cb) {
    Promise.resolve(res).then((result) => {
      cb(null, result);
    }).catch((error) => {
      cb(error, null);
    });
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
      colors: true
    });
  }

  start() {
    this.greet();

    this.repl = repl.start({
      prompt: `$${this.options.user} > `,
      writer: this.writer
    });
    const originalEval = this.repl.eval;

    const customEval = (input, context, filename, callback) => {
      const argv = input.trim().split(' ');
      const cmd = argv[0];
      argv.shift();
      switch(cmd) {
        case 'use':
          return callback(null, this.shellApi.use(argv[0]));
        case 'help()':
          return callback(null, this.shellApi.help); // TODO: get help() and help working for sub fields
        default:
          originalEval(input, context, filename, (err, res) => { this.finish(err, res, callback) });
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
