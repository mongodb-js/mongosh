import { expect } from 'chai';
import NoDatabase from './no-db';
describe('NoDatabase', function () {
  let nomongo;
  let nodb;
  beforeEach(function () {
    nodb = new NoDatabase();
    nomongo = nodb._mongo;
  });
  it('throws for show', function () {
    try {
      nodb._mongo.show('dbs');
    } catch (e: any) {
      return expect(e.name).to.equal('MongoshInvalidInputError');
    }
    expect.fail('no error thrown for NoDb._mongo.use');
  });
  it('throws for nomongo.use', function () {
    try {
      nomongo.use('test');
    } catch (e: any) {
      return expect(e.name).to.equal('MongoshInvalidInputError');
    }
    expect.fail('no error thrown for NoDb');
  });
});
