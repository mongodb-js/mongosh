import { expect } from 'chai';
import { CliServiceProvider } from 'mongosh-service-provider-server';
import Mapper from './mapper';
import { Collection, Cursor } from 'mongosh-shell-api';

describe('Mapper (integration)', function() {
  this.timeout(10000);

  before(require('mongodb-runner/mocha/before')({ port: 27018, timeout: 60000 }));
  after(require('mongodb-runner/mocha/after')({ port: 27018 }));

  let serviceProvider: CliServiceProvider;

  before(async() => {
    serviceProvider = await CliServiceProvider.connect('mongodb://localhost:27018');
  });

  after(() => {
    return serviceProvider.close(true);
  });

  let mapper: Mapper;
  let dbName;

  beforeEach(async() => {
    dbName = `test-${Date.now()}`;
    mapper = new Mapper(serviceProvider);
    mapper.setCtx({});
    mapper.use({}, dbName);
  });

  afterEach(async() => {
    // todo: drop database
  });

  describe('it', () => {
    let collection;

    beforeEach(async() => {
      const docs = [];

      let i = 1;
      while (i <= 21) {
        docs.push({ doc: i });
        i++;
      }

      await serviceProvider.insertMany(dbName, 'docs', docs);

      collection = new Collection(mapper, dbName, 'docs');
    });

    describe('when calling it after find', () => {
      it('returns next batch of docs', async() => {
        mapper.find(collection, {}, { _id: 0 });
        await mapper.it();
        expect(await mapper.it()).to.deep.equal([{
          doc: 21
        }]);
      });
    });
    describe('when calling limit after skip', () => {
      let cursor: Cursor;

      beforeEach(() => {
        cursor = mapper
          .find(collection, {}, { _id: 0 })
          .skip(1)
          .limit(1);
      });

      describe('when calling toArray on the cursor', () => {
        it('returns the right documents', async() => {
          expect(await cursor.toArray()).to.deep.equal([{ doc: 2 }]);
        });
      });

      describe('when calling toReplString on the cursor', () => {
        it('returns the right documents', async() => {
          expect(await cursor.toReplString()).to.deep.equal([{ doc: 2 }]);
        });
      });
    });
  });
});

