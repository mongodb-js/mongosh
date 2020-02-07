export class CursorIterationResult extends Array {
  toReplString: () => this;
  shellApiType: () => string;

  constructor(...args) {
    super(...args);

    Object.defineProperty(this, 'toReplString', {
      value: () => { return this; },
      enumerable: false
    });

    Object.defineProperty(this, 'shellApiType', {
      value: () => { return 'CursorIterationResult'; },
      enumerable: false
    });
  }
}