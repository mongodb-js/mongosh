import { MongoshInvalidInputError } from '@mongosh/errors';
import Mongo from './mongo';

export default class NoDatabase {
  mongo: Mongo;
  constructor() {
    this.mongo = new NoMongo() as Mongo;
    const proxy = new Proxy(this, {
      get: (target, prop): any => {
        if (prop === 'mongo') return this.mongo; // so we can create rs/sh without erroring
        throw new MongoshInvalidInputError('No connected database');
      }
    });
    return proxy;
  }
}

class NoMongo {
  constructor() {
    const proxy = new Proxy(this, {
      get: (): any => {
        throw new MongoshInvalidInputError('No connected database');
      }
    });
    return proxy;
  }
}
