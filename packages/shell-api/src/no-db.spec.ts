import { expect } from 'chai';
import NoDatabase from './no-db';
describe('NoDatabase', () => {
  let nomongo;
  let nodb;
  beforeEach(() => {
    nodb = new NoDatabase();
    nomongo = nodb.mongo;
  });
  it('throws for show', () => {
    try {
      nodb.mongo.show('dbs');
    } catch (e) {
      return expect(e.name).to.equal('MongoshInvalidInputError');
    }
    expect.fail('no error thrown for NoDb.mongo.use');
  });
  it('throws for nomongo.use', () => {
    try {
      nomongo.use('test');
    } catch (e) {
      return expect(e.name).to.equal('MongoshInvalidInputError');
    }
    expect.fail('no error thrown for NoDb');
  });
});
