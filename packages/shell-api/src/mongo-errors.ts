import type { ShellPlugin } from './';

interface MongoErrorRephrase {
  matchMessage?: RegExp | string;
  code?: number;
  replacement: ((message: string) => string) | string;
}
const ERROR_REPHRASES: MongoErrorRephrase[] = [
  {
    // NotPrimaryNoSecondaryOk (also used for old terminology)
    code: 13435,
    replacement: (message) =>
      message.includes('db.runCommand')
        ? message
        : 'not primary - consider using db.getMongo().setReadPref() or readPreference in the connection string',
  },
];

export function rephraseMongoError(error: any): any {
  if (!isMongoError(error)) {
    return error;
  }

  const e = error as Error;
  const message = e.message;

  const rephrase = ERROR_REPHRASES.find((m) => {
    if (m.matchMessage) {
      return typeof m.matchMessage === 'string'
        ? message.includes(m.matchMessage)
        : m.matchMessage.test(message);
    }
    return m.code !== undefined && (e as any).code === m.code;
  });

  if (rephrase) {
    e.message =
      typeof rephrase.replacement === 'function'
        ? rephrase.replacement(message)
        : rephrase.replacement;
  }

  return e;
}

function isMongoError(error: any): boolean {
  return /^Mongo([A-Z].*)?Error$/.test(
    Object.getPrototypeOf(error)?.constructor?.name ?? ''
  );
}

export class TransformMongoErrorPlugin implements ShellPlugin {
  transformError(err: Error): Error {
    return rephraseMongoError(err);
  }
}
