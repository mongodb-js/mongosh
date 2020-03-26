import { expect } from 'chai';
import { CliServiceProvider } from '@mongosh/service-provider-server';
import Mapper from './mapper';
import { Collection, Cursor } from '@mongosh/shell-api';

describe('Mapper (integration)', function() {
  this.timeout(10000);

  before(require('mongodb-runner/mocha/before')({ port: 27018, timeout: 60000 }));
  after(require('mongodb-runner/mocha/after')({ port: 27018 }));

  let serviceProvider: CliServiceProvider;

  const getIndexNames = async(dbName: string, collectionName: string): Promise<any> => {
    const specs = await serviceProvider.getIndexes(
      dbName,
      collectionName
    );

    return specs.map(spec => spec.name);
  };

  before(async() => {
    serviceProvider = await CliServiceProvider.connect('mongodb://localhost:27018');
  });

  after(() => {
    return serviceProvider.close(true);
  });

  let mapper: Mapper;
  let dbName;
  let collection;
  let collectionName;

  beforeEach(async() => {
    dbName = `test-${Date.now()}`;
    collectionName = 'docs';

    mapper = new Mapper(serviceProvider);
    mapper.setCtx({});
    mapper.use({}, dbName);
    collection = new Collection(
      mapper,
      dbName,
      collectionName
    );
  });

  afterEach(async() => {
    await serviceProvider.dropDatabase(dbName);
  });

  describe('commands', () => {
    describe('it', () => {
      beforeEach(async() => {
        const docs = [];

        let i = 1;
        while (i <= 21) {
          docs.push({ doc: i });
          i++;
        }

        await serviceProvider.insertMany(dbName, collectionName, docs);
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

  describe('collection', () => {
    describe('bulkWrite', () => {
      context('with an insertOne request', () => {
        let requests;
        let result;

        beforeEach(async() => {
          requests = [
            {
              insertOne: {
                document: {
                  doc: 1
                }
              }
            }
          ];

          result = await mapper.bulkWrite(
            collection,
            requests
          );
        });

        it('returns ackowledged = true', () => {
          expect(result.ackowledged).to.be.true;
        });

        it('returns insertedCount = 1', () => {
          expect(result.insertedCount).to.equal(1);
        });

        it('returns insertedIds', () => {
          expect(Object.keys(result.insertedIds)).to.have.lengthOf(1);
        });

        it('performs insert', async() => {
          const docs = await serviceProvider.find(
            dbName,
            collectionName,
            {},
            { projection: { _id: 0 } }
          ).toArray();

          expect(docs).to.deep.equal([
            { doc: 1 }
          ]);
        });
      });
    });

    describe('converToCapped', () => {
      let result;

      beforeEach(async() => {
        await serviceProvider.insertOne(dbName, collectionName, { doc: 1 });

        expect(await serviceProvider.isCapped(
          dbName,
          collectionName
        )).to.be.false;

        result = await mapper.convertToCapped(
          collection,
          1000
        );
      });

      it('returns ok = 1', () => {
        expect(result.ok).to.equal(1);
      });

      it('converts the collection', async() => {
        expect(await serviceProvider.isCapped(
          dbName,
          collectionName
        )).to.be.true;
      });
    });

    describe('createIndexes', () => {
      let result;

      beforeEach(async() => {
        await serviceProvider.insertOne(dbName, collectionName, { doc: 1 });

        expect(await getIndexNames(dbName, collectionName)).not.to.contain('index-1');

        result = await mapper.createIndexes(collection, [{ x: 1 }], {
          name: 'index-1'
        });
      });

      it('returns creation result', () => {
        expect(result).to.contain({
          createdCollectionAutomatically: false,
          numIndexesBefore: 1,
          numIndexesAfter: 2,
          ok: 1
        });
      });

      it('creates the index', async() => {
        expect(await getIndexNames(dbName, collectionName)).to.contain('index-1');
      });
    });

    describe('getIndexes', () => {
      let result;

      beforeEach(async() => {
        await serviceProvider.insertOne(dbName, collectionName, { doc: 1 });
        await serviceProvider.createIndexes(dbName, collectionName, [
          { key: { x: 1 } }
        ]);

        result = await mapper.getIndexes(collection);
      });

      it('returns indexes for the collection', () => {
        expect(result).to.deep.equal([
          {
            key: {
              _id: 1
            },
            name: '_id_',
            ns: `${dbName}.${collectionName}`,
            v: 2
          },
          {
            key: {
              x: 1
            },
            name: 'x_1',
            ns: `${dbName}.${collectionName}`,
            v: 2
          }
        ]);
      });
    });

    describe('dropIndexes', () => {
      beforeEach(async() => {
        await serviceProvider.insertOne(dbName, collectionName, { doc: 1 });
        await serviceProvider.createIndexes(dbName, collectionName, [
          { key: { x: 1 }, name: 'index-1' }
        ]);
      });

      it('removes indexes', async() => {
        expect(await getIndexNames(dbName, collectionName)).to.contain('index-1');

        await mapper.dropIndexes(collection, '*');

        expect(await getIndexNames(dbName, collectionName)).not.to.contain('index-1');
      });
    });
  });
});

