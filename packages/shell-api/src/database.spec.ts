import sinon from 'sinon';
import Mapper from '../../mapper/lib';
import { Database, Collection } from './shell-api';
import * as signatures from './shell-api-signatures';
import { expect } from 'chai';

/**
 * Test that a database method proxies the respective Mapper method correctly,
 * with the right arguments and returning the right result.
 *
 * It ensures:
 * - that the method is defined in the shell api and that is meant to be a function
 * - that the mapper method to be proxied to exists
 * - that the mapper method is called with a database as first argument and with
 *   the rest of invokation arguments.
 * - that the result of mapper invokation is returned.
 *
 * @param {String} name - the name of the method to invoke
 */
function testWrappedMethod(name: string): void {
  const attribute = signatures.Database.attributes[name];
  expect(attribute).to.exist;
  expect(attribute.type).to.equal('function');

  const mock = sinon.mock();
  const mapper: Mapper = sinon.createStubInstance(Mapper, {
    [`database_${name}`]: mock
  });

  const args = [1, 2, 3];
  const retVal = {};

  const database = new Database(
    mapper, 'db1');

  mock.withArgs(database, ...args).returns(retVal);

  const result = database[name](...args);
  mock.verify();

  expect(result).to.equal(retVal);
}

describe('Database', () => {
  [
    'getCollectionInfos',
    'getCollectionNames',
    'runCommand',
    'adminCommand',
    'aggregate',
    'getSiblingDB',
    'getCollection',
    'dropDatabase'
  ].forEach((methodName) => {
    describe(`#${methodName}`, () => {
      it(`wraps mapper.database_${methodName}`, () => {
        testWrappedMethod(methodName);
      });
    });
  });

  it('allows to get a collection as property if is not one of the existing methods', () => {
    const database: any = new Database({}, 'db1');
    expect(database.someCollection).to.have.instanceOf(Collection);
    expect(database.someCollection._name).to.equal('someCollection');
  });

  it('reuses collections', () => {
    const database: any = new Database({}, 'db1');
    expect(database.someCollection).to.equal(database.someCollection);
  });

  it('does not return a collection starting with _', () => {
    // this is the behaviour in the old shell

    const database: any = new Database({}, 'db1');
    expect(database._someProperty).to.equal(undefined);
  });

  it('does not return a collection for symbols', () => {
    const database: any = new Database({}, 'db1');
    expect(database[Symbol('someProperty')]).to.equal(undefined);
  });

  it('does not return a collection with invalid name', () => {
    const database: any = new Database({}, 'db1');
    expect(database['   ']).to.equal(undefined);
  });

  it('allows to access _name', () => {
    const database: any = new Database({}, 'db1');
    expect(database._name).to.equal('db1');
  });

  it('allows to access _collections', () => {
    const database: any = new Database({}, 'db1');
    expect(database._collections).to.deep.equal({});
  });
});
