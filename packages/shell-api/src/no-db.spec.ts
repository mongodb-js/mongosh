import { expect } from 'chai';
import NoDatabase from './no-db';
import type Mongo from './mongo';

describe('NoDatabase', function () {
  let nomongo: Mongo;
  let nodb: NoDatabase;
  beforeEach(function () {
    nodb = new NoDatabase();
    nomongo = nodb._mongo;
  });
  it('throws for show', async function () {
    try {
      await nodb._mongo.show('dbs');
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
