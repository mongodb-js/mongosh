import {
  MongoshInvalidInputError
} from '@mongosh/errors';
import Cursor from './cursor';
class Iterator {
  iterable: Cursor | any[];
  isCursor: boolean;

  constructor(iterable: Cursor | any[]) {
    this.iterable = iterable;
    this.isCursor = this.iterable instanceof Cursor;
    if (!this.isCursor && !Array.isArray(this.iterable)) {
      throw new MongoshInvalidInputError('Calling custom forEach method may not work as expected because callback is async. Try converting to array type before calling forEach.');
    }
    const proxy = new Proxy(this, {
      get: (obj, prop) => {
        if ((prop in obj)) {
          return (obj as any)[prop];
        }
        return (this.iterable as any)[prop];
      }
    });
    return proxy;
  }
  async forEach(func: (...args: any[]) => void | Promise<void>, thisArg: any) {
    if (this.isCursor) {
      const cursor = this.iterable as Cursor;
      let doc = await cursor.tryNext();
      while (doc !== null) {
        await func(doc);
        doc = await cursor.tryNext();
      }
    } else {
      const arr = this.iterable as any[];
      for (let i = 0; i < arr.length; i++) {
        await func(arr[i], i, arr, thisArg);
      }
    }
  }
}

export default (iterable: Cursor | any[]) => {
  return new Iterator(iterable);
};
