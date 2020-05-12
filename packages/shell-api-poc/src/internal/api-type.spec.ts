import { expect } from 'chai';

import { apiMethod, apiProperty, ApiType } from './api-type';
import { AttributeSpec } from './attributes';
import { Help } from './help';

function expectedAttributeSpec(overrides): AttributeSpec {
  return {
    name: '',
    returnType: 'unknown',
    returnsClass: false,
    returnsPromise: false,
    serverVersions: [
      '0.0.0',
      '4.4.0'
    ],
    static: false,
    topologies: [
      0,
      1,
      2
    ],
    type: '',
    ...overrides
  };
}

describe('ApiType', () => {
  describe('ApiType base class', () => {
    let SomeType;

    beforeEach(() => {
      SomeType = class extends ApiType {
        constructor() {
          super();
        }
      };
    });

    it('adds an help method', () => {
      expect(typeof new SomeType().help).to.equal('function');
    });

    it('adds an attribute metadata with help', () => {
      expect(SomeType.attributes).to.deep.equal({
        help: expectedAttributeSpec({
          type: 'function',
          name: 'help'
        })
      });
    });

    it('adds a type static property', () => {
      expect(SomeType.type).to.equal('SomeType');
    });

    it('would return different metadata for different subclasses (no clashes)', () => {
      class OtherType extends ApiType {
        constructor() {
          super();
        }
      }

      OtherType.attributes.otherTypeAttribute = {} as any;

      expect(SomeType.attributes.otherTypeAttribute).to.be.undefined;
    });
  });

  describe('apiMethod', () => {
    let Type;
    let methodImpl;

    beforeEach(() => {
      methodImpl = (): any => {
        //
      };

      class ExampleApiType extends ApiType {
        x = 3;

        constructor() {
          super();
        }

        @apiMethod()
        doSomething(): any {
          return methodImpl(this);
        }
      }

      Type = ExampleApiType;
    });

    it('adds an instance method to the attributes', () => {
      expect(Type.attributes.doSomething).to.deep.equal(
        expectedAttributeSpec({
          name: 'doSomething',
          type: 'function'
        })
      );
    });

    it('adds method.help to the prototype', () => {
      expect(new Type().doSomething.help()).to.be.instanceOf(Help);
    });

    context('with successful sync methods', () => {
      beforeEach(() => {
        methodImpl = (instance): any => instance.x;
      });

      it('does not affect the implementation', () => {
        expect(new Type().doSomething()).to.equal(3);
      });
    });

    context('with failing sync methods', () => {
      let error;
      beforeEach(() => {
        error = new Error('err');
        methodImpl = (): any => { throw error; };
      });

      it('does not affect the implementation', () => {
        expect(() => {
          new Type().doSomething();
        }).to.throw('err');
      });
    });

    context('with successful async methods', () => {
      beforeEach(() => {
        methodImpl = (instance): any => Promise.resolve(instance.x);
      });

      it('does not affect the implementation', async() => {
        const promise = new Type().doSomething();
        expect(typeof promise.then).to.equal('function');
        expect(typeof promise.catch).to.equal('function');
        expect(await promise).to.equal(3);
      });
    });

    context('with failing async methods', () => {
      let error;
      beforeEach(() => {
        error = new Error('err');
        methodImpl = (): any => Promise.reject(error);
      });

      it('does not affect the implementation', async() => {
        const promise = new Type().doSomething();
        expect(typeof promise.then).to.equal('function');
        expect(typeof promise.catch).to.equal('function');
        expect((await promise.catch(err => err)).message).to.equal('err');
      });
    });
  });

  describe('apiProperty', () => {
    it('adds an instance property to the attributes', () => {
      class SomeType extends ApiType {
        constructor() {
          super();
        }

        @apiProperty()
        get something(): any {
          return {};
        }
      }

      expect(SomeType.attributes.something).to.deep.equal(
        expectedAttributeSpec({
          name: 'something',
          type: 'property'
        })
      );
    });
  });
});

