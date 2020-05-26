import isRecoverableError from 'is-recoverable-error';
import { Recoverable } from 'repl';
import util from 'util';
import PQueue from 'p-queue';

export function createCustomEval(replEval: Function, shellEvaluatorCustomEval: Function): Function {
  const queue = new PQueue({ concurrency: 1 });

  const originalEval = util.promisify(replEval);

  const customEval = async function(input, context, filename, callback): Promise<any> {
    async function evalTask(): Promise<void> {
      try {
        const result = await shellEvaluatorCustomEval(
          originalEval,
          input,
          context,
          filename
        );

        return callback(null, result);
      } catch (err) {
        if (isRecoverableError(input)) {
          return callback(new Recoverable(err));
        }

        return callback(err);
      }
    }

    await queue.add(evalTask);
  };

  return customEval;
}
