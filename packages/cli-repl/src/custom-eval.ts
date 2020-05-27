import isRecoverableError from 'is-recoverable-error';
import { Recoverable } from 'repl';
import queue from 'fastq';
import util from 'util';

export function createCustomEval(replEval: Function, shellEvaluatorCustomEval: Function): Function {
  const q = queue(worker, 1);

  const originalEval = util.promisify(replEval);

  const customEval = async function(input, context, filename, callback): Promise<any> {
    if (isRecoverableError(input)) {
      return callback(new Recoverable(new SyntaxError()));
    }
    q.push({ input, context, filename }, callback);
  };

  async function worker(opts, cb) {
    const { input, context, filename } = opts;
    let result;
    try {
      result = await shellEvaluatorCustomEval(originalEval, input, context, filename);
    } catch (err) {
      result = err;
    }
    return cb(null, result);
  }

  return customEval;
}
