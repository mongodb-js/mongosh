import {
  shellApiClassDefault,
  ShellApiClass
} from './decorators';

import { MongoshUnimplementedError } from '@mongosh/errors';

@shellApiClassDefault
class DeprecatedClass extends ShellApiClass {
  public name: string;
  constructor(name, alternatives = {}) {
    super();
    this.name = name;
    const proxy = new Proxy(this, {
      get: (obj, prop): any => {
        if (!(prop in obj)) {
          const alt = alternatives[prop] || '';
          throw new MongoshUnimplementedError(`The class ${name} is deprecated.${alt}`);
        }
        return obj[prop];
      }
    });
    return proxy;
  }

  /**
   * Internal method to determine what is printed for this class.
   */
  _asPrintable(): string {
    return `The class ${this.name} is deprecated`;
  }
}

export class DBQuery extends DeprecatedClass {
  constructor() {
    super('DBQuery', {
      shellBatchSize: ' Please use \'batchSize\' on the cursor instead: db.coll.find().batchSize(<size>)'
    });
  }
}
