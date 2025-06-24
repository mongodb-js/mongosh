import { MongoshInvalidInputError } from '@mongosh/errors';
import { ShellApiErrors } from './error-codes';
import type Mongo from './mongo';
import type { GenericServerSideSchema } from './helpers';

export default class NoDatabase<
  M extends GenericServerSideSchema = GenericServerSideSchema
> {
  _mongo: Mongo<M>;
  constructor() {
    this._mongo = new NoMongo() as Mongo<M>;
    const proxy = new Proxy(this, {
      get: (_target, prop): any => {
        if (prop === '_mongo') return this._mongo; // so we can create rs/sh without erroring
        throw new MongoshInvalidInputError(
          'No connected database',
          ShellApiErrors.NotConnected
        );
      },
    });
    return proxy;
  }
}

class NoMongo {
  constructor() {
    const proxy = new Proxy(this, {
      get: (): any => {
        throw new MongoshInvalidInputError(
          'No connected database',
          ShellApiErrors.NotConnected
        );
      },
    });
    return proxy;
  }
}
