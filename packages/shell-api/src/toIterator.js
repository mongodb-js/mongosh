import {
  MongoshInvalidInputError
} from '@mongosh/errors';
import { Cursor } from './cursor';
class Iterator {
  constructor(iterable) {
    this.iterable = iterable;
    this.isCursor = this.iterable instanceof Cursor;
    if (!this.isCursor && !Array.isArray(this.iterable)) {
      throw new MongoshInvalidInputError('Calling custom forEach method may not work as expected because callback is async. Try converting to array type before calling forEach.');
    }
    const proxy = new Proxy(this, {
      get: (obj, prop) => {
        if ((prop in obj)) {
          return obj[prop];
        }
        return this.iterable[prop];
      }
    });
    return proxy;
  }
  async forEach(func, thisArg) {
    if (this.isCursor) {
      while (await this.iterable.hasNext()) {
        await func(await this.iterable.next());
      }
    } else {
      for (let i = 0; i < this.iterable.length; i++) {
        await func(this.iterable[i], i, this.iterable, thisArg);
      }
    }
  }
}

export default (iterable) => {
  return new Iterator(iterable);
};
