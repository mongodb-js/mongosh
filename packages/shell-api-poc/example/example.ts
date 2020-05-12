/* eslint-disable no-console */
const repl = require('repl');
const vm = require('vm');
const util = require('util');
const events = require('events');

import { MongoClient } from 'mongodb';
import { ShellApi } from '../src/types/shell-api';
import { toEvaluationResult } from '../src/internal/evaluable';

async function main(): Promise<void> {
  console.info('Connecting to mongodb...');

  const client = await MongoClient.connect(
    'mongodb://localhost:27017',
    { useUnifiedTopology: true }
  );

  console.info('connected.');

  const eventEmitter = new events.EventEmitter();
  const shellApi = new ShellApi(eventEmitter, client);

  const context = {};

  Object.values((ShellApi as any).attributes).forEach((attribute: any) => {
    context[attribute.name] = typeof shellApi[attribute.name] === 'function' ?
      shellApi[attribute.name].bind(shellApi) :
      shellApi[attribute.name];
  });

  vm.createContext(context);

  function isRecoverableError(error): boolean {
    if (error.name === 'SyntaxError') {
      return /^(Unexpected end of input|Unexpected token)/.test(error.message);
    }
    return false;
  }

  async function myEval(code, _context, filename, callback): Promise<void> {
    let result;
    try {
      const script = new vm.Script(code);
      result = await script.runInContext(context);
    } catch (e) {
      if (isRecoverableError(e)) {
        return callback(new repl.Recoverable(e));
      }

      return callback(e);
    }

    try {
      if (result && result[toEvaluationResult]) {
        result = await result[toEvaluationResult]();
      }
    } catch (e) {
      return callback(e);
    }

    callback(null, result);
  }

  const replServer = repl.start({
    prompt: '> ',
    eval: myEval,
    writer: (output) => {
      return util.inspect(output, { compact: false, depth: 5 });
    }
  });

  replServer.on('exit', async() => {
    // await client.close();
    process.exit();
  });
}

main();
