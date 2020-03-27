import sinon from 'sinon';
import Mapper from '../../mapper';
import { Collection } from './shell-api';
import * as types from './shell-types';
import { expect } from 'chai';

/**
 * Test that a collection method proxies the respective Mapper method correctly,
 * with the right arguments and returning the right result.
 *
 * It ensures:
 * - that the method is defined in the shell api and that is meant to be a function
 * - that the mapper method to be proxied to exists
 * - that the mapper method is called with a collection as first argument and with
 *   the rest of invokation arguments.
 * - that the result of mapper invokation is returned.
 *
 * @param {String} name - the name of the method to invoke
 */
function testWrappedMethod(name: string): void {
  const attribute = types.Collection.attributes[name];
  expect(attribute).to.exist;
  expect(attribute.type).to.equal('function');

  const mock = sinon.mock();
  const mapper: Mapper = sinon.createStubInstance(Mapper, {
    [name]: mock
  });

  const args = [1, 2, 3];
  const retVal = {};

  const collection = new Collection(
    mapper, 'db1', 'coll1');

  mock.withArgs(collection, ...args).returns(retVal);

  const result = collection[name](...args);
  mock.verify();

  expect(result).to.equal(retVal);
}

describe('Collection', () => {
  describe('#help', () => {
    const collection = new Collection();

    it('returns the translated text', () => {
      expect((collection.findOne as any).help().help).to.include('Selects');
    });
  });

  describe('#convertToCapped', () => {
    it('wraps mapper.convertToCapped', () => {
      testWrappedMethod('convertToCapped');
    });
  });

  describe('#createIndexes', () => {
    it('wraps mapper.createIndexes', () => {
      testWrappedMethod('createIndexes');
    });
  });

  describe('#createIndex', () => {
    it('wraps mapper.createIndex', () => {
      testWrappedMethod('createIndex');
    });
  });

  describe('#ensureIndex', () => {
    it('wraps mapper.ensureIndex', () => {
      testWrappedMethod('ensureIndex');
    });
  });

  describe('#getIndexes', () => {
    it('wraps mapper.getIndexes', () => {
      testWrappedMethod('getIndexes');
    });
  });

  describe('#getIndexSpecs', () => {
    it('wraps mapper.getIndexSpecs', () => {
      testWrappedMethod('getIndexSpecs');
    });
  });

  describe('#getIndices', () => {
    it('wraps mapper.getIndices', () => {
      testWrappedMethod('getIndices');
    });
  });

  describe('#getIndexKeys', () => {
    it('wraps mapper.getIndexKeys', () => {
      testWrappedMethod('getIndexKeys');
    });
  });

  describe('#dropIndexes', () => {
    it('wraps mapper.dropIndexes', () => {
      testWrappedMethod('dropIndexes');
    });
  });

  describe('#totalIndexSize', () => {
    it('wraps mapper.totalIndexSize', () => {
      testWrappedMethod('totalIndexSize');
    });
  });
});
