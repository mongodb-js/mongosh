const repl = require('repl');
const util = require('util');
const { CliServiceProvider } = require('mongosh-service-provider-server');
const Mapper = require('mongosh-mapper');
const { compile } = require('mongosh-mapper');
const ShellApi = require('mongosh-shell-api');
const ansi = require('ansi-escape-sequences');
// const _ = require('lodash');

class CliRepl {
  // TODO: parse command line args
  processCmdArgs(argv) {
    this.options = {
      uri: 'mongodb://localhost:27017',
      user: argv.user ? argv.user : process.env.USER,
      cwd: argv.cwd ? argv.cwd : process.cwd()
    };
    this.options.user = clr(this.options.user, ['green', 'bold']);
    this.options.cwd = clr(this.options.cwd, 'bold');
  }

  constructor(useAntlr) {
    this.processCmdArgs({});

    this.useAntlr = !!useAntlr;
    CliServiceProvider.connect(this.options.uri).then((serviceProvider) => {
      this.serviceProvider = serviceProvider;
      this.mapper = new Mapper(this.serviceProvider);
      this.shellApi = new ShellApi(this.mapper);
      this.start();
    });
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

  formatHelp() {
    const output = `
    ${clr('Help Commands:', ['bold', 'yellow'])}

      db.help()                    Help on db methods
      db.mycoll.help()             Help on collection methods
      sh.help()                    Sharding helpers
      rs.help()                    Replica set helpers
      help admin                   Administrative help
      help connect                 Connecting to a db help
      help keys                    Key shortcuts
      help misc                    Misc things to know
      help mr                      Mapreduce

    For more information on help commands: ${clr('https://docs.mongodb.com/manual/reference/mongo-shell/#command-helpers', ['bold', 'green'])} 

    ${clr('Top Level Commands:', ['bold', 'yellow'])}
 
      show dbs                     Show database names
      show collections             Show collections in current database
      show users                   Show users in current database
      show profile                 Show most recent system.profile entries with time >= 1ms
      show logs                    Show the accessible logger names
      show log <name>              Prints out the last segment of log in memory, 'global' is default
      use <db_name>                Set current database
      db.foo.find()                List objects in collection foo
      db.foo.find(<query>)         List objects given a query, where query is an object
      it                           Result of the last line evaluated; use to further iterate
      DBQuery.shellBatchSize = x   Set default number of items to display on shell
      .exit                        Quit the mongo shell

    For more information on top level commands: ${clr('https://docs.mongodb.com', ['bold', 'green'])}
    `.replace(/\n$/, '').replace(/^\n/, '')
    return output;
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
        return this.formatHelp();
        // return this.shellApi.help;
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
      prompt: `${clr('>', ['bold', 'green'])} `,
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

function clr (text, color) {
  return process.stdout.isTTY ? ansi.format(text, color) : text
}

module.exports = CliRepl;
