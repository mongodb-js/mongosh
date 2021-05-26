
interface MongoErrorRephrase {
  match: RegExp | string;
  replacement: ((message: string) => string) | string;
}
const ERROR_REPHRASES: MongoErrorRephrase[] = [
  {
    match: 'apiVersion parameter is required',
    replacement: 'The apiVersion parameter is required, please run mongosh with the --apiVersion argument and make sure to specify the apiVersion option for Mongo(..) instances.'
  }
];

export function rephraseMongoError(error: any): any {
  if (!isMongoError(error)) {
    return error;
  }

  const e = error as Error;
  const message = e.message;

  const rephrase = ERROR_REPHRASES.find(m => {
    return typeof m.match === 'string' ? message.includes(m.match) : m.match.test(message);
  });

  if (rephrase) {
    e.message = typeof rephrase.replacement === 'function' ? rephrase.replacement(message) : rephrase.replacement;
  }

  return e;
}

function isMongoError(error: any): boolean {
  return /^Mongo([A-Z].*)?Error$/.test(Object.getPrototypeOf(error).constructor.name ?? '');
}
