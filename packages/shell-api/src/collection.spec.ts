import sinon from 'sinon';
import Mapper from '../../mapper';
import { Collection, Database } from './shell-api';
import * as signatures from './shell-api-signatures';
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
  const attribute = signatures.Collection.attributes[name];
  expect(attribute).to.exist;
  expect(attribute.type).to.equal('function');

  const mock = sinon.mock();
  const mapper: Mapper = sinon.createStubInstance(Mapper, {
    [`collection_${name}`]: mock
  });

  const args = [1, 2, 3];
  const retVal = {};

  const database = new Database('db1');
  const collection = new Collection(mapper, database, 'coll1');

  mock.withArgs(collection, ...args).returns(retVal);

  const result = collection[name](...args);
  mock.verify();

  expect(result).to.equal(retVal);
}

describe('Collection', () => {
  describe('#help', () => {
    const collection = new Collection();

    it('returns the translated text', () => {
      expect((collection.findOne as any).help().help).to.include('db.collection.findOne(query, projection)');
    });
  });

  [
    'convertToCapped',
    'find',
    'findOne',
    'createIndexes',
    'createIndex',
    'ensureIndex',
    'getIndexes',
    'getIndexSpecs',
    'getIndices',
    'getIndexKeys',
    'dropIndexes',
    'totalIndexSize',
    'dropIndex',
    'reIndex',
    'stats',
    'dataSize',
    'storageSize',
    'totalSize',
    'drop',
    'exists',
    'getFullName',
    'getName'
  ].forEach((methodName) => {
    describe(`#${methodName}`, () => {
      it(`wraps mapper.collection_${methodName}`, () => {
        testWrappedMethod(methodName);
      });
    });
  });

  describe('#getDB', () => {
    it('returns the db', () => {
      const database = new Database('db1');
      const collection = new Collection(new Mapper({}), database, 'coll1');

      expect(collection.getDB()).to.equal(database);
    });
  });
});
