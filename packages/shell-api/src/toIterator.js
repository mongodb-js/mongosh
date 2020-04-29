import {
  MongoshInvalidInputError,
} from '@mongosh/errors';
class Iterator {
  constructor(array) {
    this.array = array;
    if (!Array.isArray(this.array)) {
      throw new MongoshInvalidInputError('Calling custom forEach method may not work as expected because callback is async. Try converting to array type before calling forEach.');
    }
    const proxy = new Proxy(this, {
      get: (obj, prop) => {
        if ((prop in obj)) {
          return obj[prop];
        }
        return this.array[prop];
      }
    });
    return proxy;
  }
  async forEach(func, thisArg) {
    for (let i = 0; i < this.array.length; i++) {
      await func(this.array[i], i, this.array, thisArg);
    }
  }
}

export default (array) => {
  return new Iterator(array);
};
