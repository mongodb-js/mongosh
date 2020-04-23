import { expect } from 'chai';
import { CliServiceProvider } from '@mongosh/service-provider-server';
import Mapper from './mapper';
import { Collection, Cursor, Database } from '@mongosh/shell-api';

const mongodbRunnerBefore = require('mongodb-runner/mocha/before');
const mongodbRunnerAfter = require('mongodb-runner/mocha/after');

describe('Mapper (integration)', function() {
  this.timeout(60000);

  before(function(done) {
    try {
      mongodbRunnerBefore({ port: 27018, timeout: 60000 }).call(this, done);
    } catch (e) {
      done(e);
    }
  });

  after(mongodbRunnerAfter({ port: 27018 }));

  let serviceProvider: CliServiceProvider;

  const getIndexNames = async(dbName: string, collectionName: string): Promise<any> => {
    const specs = await serviceProvider.getIndexes(
      dbName,
      collectionName
    );

    return specs.map(spec => spec.name);
  };

  // TODO: replace with serviceProvider.createCollection()
  const createCollection = async(dbName: string, collectionName: string): Promise<any> => {
    const now = Date.now();
    await serviceProvider.insertOne(dbName, collectionName, { _id: now });
    await serviceProvider.deleteOne(dbName, collectionName, { _id: now });
  };

  before(async() => {
    serviceProvider = await CliServiceProvider.connect('mongodb://localhost:27018');
  });

  after(() => {
    return serviceProvider.close(true);
  });

  let mapper: Mapper;
  let dbName;
  let database;
  let collection;
  let collectionName;

  beforeEach(async() => {
    dbName = `test-${Date.now()}`;
    collectionName = 'docs';

    mapper = new Mapper(serviceProvider);
    mapper.context = { db: new Database(mapper, 'test') };
    mapper.use(dbName);
    database = new Database(mapper, dbName);

    collection = new Collection(
      mapper,
      database,
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
          mapper.collection_find(collection, {}, { _id: 0 });
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
            .collection_find(collection, {}, { _id: 0 })
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

          result = await mapper.collection_bulkWrite(
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
        await createCollection(dbName, collectionName);

        expect(await serviceProvider.isCapped(
          dbName,
          collectionName
        )).to.be.false;

        result = await mapper.collection_convertToCapped(
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
        await createCollection(dbName, collectionName);
        expect(await getIndexNames(dbName, collectionName)).not.to.contain('index-1');

        result = await mapper.collection_createIndexes(collection, [{ x: 1 }], {
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
        await createCollection(dbName, collectionName);
        await serviceProvider.createIndexes(dbName, collectionName, [
          { key: { x: 1 } }
        ]);

        result = await mapper.collection_getIndexes(collection);
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
        await createCollection(dbName, collectionName);
        await serviceProvider.createIndexes(dbName, collectionName, [
          { key: { x: 1 }, name: 'index-1' }
        ]);
      });

      it('removes indexes', async() => {
        expect(await getIndexNames(dbName, collectionName)).to.contain('index-1');

        await mapper.collection_dropIndexes(collection, '*');

        expect(await getIndexNames(dbName, collectionName)).not.to.contain('index-1');
      });
    });

    describe('#reIndex', () => {
      beforeEach(async() => {
        await createCollection(dbName, collectionName);
      });

      it('runs against the db', async() => {
        const result = await mapper.collection_reIndex(collection);

        expect(
          result
        ).to.deep.equal({
          nIndexesWas: 1,
          nIndexes: 1,
          indexes: [
            {
              v: 2,
              key: {
                '_id': 1
              },
              name: '_id_',
              ns: `${dbName}.${collectionName}`
            }
          ],
          ok: 1
        });
      });
    });

    describe('totalIndexSize', () => {
      beforeEach(async() => {
        await createCollection(dbName, collectionName);
      });

      it('returns total index size', async() => {
        expect(typeof await mapper.collection_totalIndexSize(collection)).to.equal('number');
      });
    });

    describe('dataSize', () => {
      beforeEach(async() => {
        await createCollection(dbName, collectionName);
      });

      it('returns total index size', async() => {
        expect(typeof await mapper.collection_dataSize(collection)).to.equal('number');
      });
    });

    describe('storageSize', () => {
      beforeEach(async() => {
        await createCollection(dbName, collectionName);
      });

      it('returns total index size', async() => {
        expect(typeof await mapper.collection_storageSize(collection)).to.equal('number');
      });
    });

    describe('totalSize', () => {
      beforeEach(async() => {
        await createCollection(dbName, collectionName);
      });

      it('returns total index size', async() => {
        expect(typeof await mapper.collection_totalSize(collection)).to.equal('number');
      });
    });

    describe('stats', () => {
      beforeEach(async() => {
        await createCollection(dbName, collectionName);
        await serviceProvider.insertOne(dbName, collectionName, { x: 1 });
      });

      it('returns stats', async() => {
        const stats = await mapper.collection_stats(collection);
        expect(stats).to.contain.keys(
          'avgObjSize',
          'capped',
          'count',
          'indexBuilds',
          'indexDetails',
          'indexSizes',
          'nindexes',
          'ns',
          'ok',
          'scaleFactor',
          'size',
          'storageSize',
          'totalIndexSize',
          'wiredTiger'
        );
      });
    });

    describe('drop', () => {
      context('when a collection exists', () => {
        let result;
        beforeEach(async() => {
          await createCollection(dbName, collectionName);
          result = await mapper.collection_drop(collection);
        });

        it('returns true', async() => {
          expect(result).to.be.true;
        });

        it('deletes the collection', async() => {
          const collectionNames = (
            await serviceProvider.listCollections(dbName)
          ).map(({ name }) => name);

          expect(collectionNames).to.not.include(collectionName);
        });
      });

      context('when a collection does not exist', () => {
        it('returns false', async() => {
          expect(await mapper.collection_drop(collection)).to.be.false;
        });
      });
    });

    describe('exists', () => {
      context('when a collection exists', () => {
        beforeEach(async() => {
          await createCollection(dbName, collectionName);
        });

        it('returns the collection object', async() => {
          expect((await mapper.collection_exists(collection)).name).to.equal(collectionName);
        });
      });

      context('when a collection does not exist', () => {
        it('returns false', async() => {
          expect(await mapper.collection_drop(collection)).to.be.false;
        });
      });
    });

    describe('findAndModify', () => {
      const findAll = (): any => serviceProvider.find(
        dbName,
        collectionName,
        {},
        { projection: { _id: 0 } }
      ).toArray();

      beforeEach(async() => {
        await serviceProvider.insertMany(
          dbName,
          collectionName,
          [
            { doc: 1, foo: 1 },
            { doc: 2, foo: 1 }
          ]
        );
      });

      it('changes only a matching document', async() => {
        await mapper.collection_findAndModify(
          collection,
          {
            query: { doc: 1 },
            update: { foo: 'bar' }
          }
        );

        expect(await findAll()).to.deep.equal([
          { foo: 'bar' },
          { doc: 2, foo: 1 }
        ]);
      });

      it('removes only a matching document', async() => {
        await mapper.collection_findAndModify(
          collection,
          {
            query: { doc: 1 },
            remove: true
          }
        );

        expect(await findAll()).to.deep.equal([
          { doc: 2, foo: 1 }
        ]);
      });

      it('changes the first matching document with sort', async() => {
        await mapper.collection_findAndModify(
          collection,
          {
            query: { foo: 1 },
            sort: { doc: -1 },
            update: { changed: true }
          }
        );

        expect(await findAll()).to.deep.equal([
          { doc: 1, foo: 1 },
          { changed: true }
        ]);
      });

      it('returns the old document if new is not passed', async() => {
        expect(
          await mapper.collection_findAndModify(collection, { query: { doc: 1 }, update: { changed: true } })
        ).to.deep.include({ doc: 1 });

        expect(
          await mapper.collection_findAndModify(collection, { query: { doc: 2 }, remove: true })
        ).to.deep.include({ doc: 2 });
      });

      it('returns the new document if new is passed', async() => {
        expect(
          await mapper.collection_findAndModify(collection, {
            query: { doc: 1 }, new: true, update: { changed: true }
          })
        ).to.deep.include({ changed: true });
      });

      it('allows upserts', async() => {
        await mapper.collection_findAndModify(collection, {
          query: { doc: 3 }, new: true, update: { doc: 3 }, upsert: true
        });

        expect(
          await findAll()
        ).to.deep.include({ doc: 3 });
      });
    });
  });

  describe('db', () => {
    describe('getCollectionInfos', () => {
      it('returns an array with collection infos', async() => {
        await createCollection(dbName, collectionName);

        expect(await mapper.database_getCollectionInfos(database, {}, { nameOnly: true })).to.deep.equal([{
          name: collectionName,
          type: 'collection'
        }]);
      });
    });

    describe('getCollectionNames', () => {
      it('returns an array with collection names', async() => {
        await createCollection(dbName, collectionName);

        expect(await mapper.database_getCollectionNames(database)).to.deep.equal([collectionName]);
      });
    });
  });
});

