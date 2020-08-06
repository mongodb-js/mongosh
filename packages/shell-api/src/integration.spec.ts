import { expect } from 'chai';
import { CliServiceProvider } from '../../service-provider-server'; // avoid cyclic dep just for test
import { Cursor, Explainable, AggregationCursor, ShellInternalState, Mongo, ShellApi, asShellResult } from './index';
import { startTestServer } from '../../../testing/integration-testing-hooks';

describe('Shell API (integration)', function() {
  const connectionString = startTestServer();
  this.timeout(60000);
  let serviceProvider: CliServiceProvider;

  const getIndexNames = async(dbName: string, collectionName: string): Promise<any> => {
    const specs = await serviceProvider.getIndexes(
      dbName,
      collectionName
    );

    return specs.map(spec => spec.name);
  };

  const findAllWithoutId = (dbName: string, collectionName: string): any => serviceProvider.find(
    dbName,
    collectionName,
    {},
    { projection: { _id: 0 } }
  ).toArray();

  const expectCollectionToExist = async(dbName: any, collectionName: any): Promise<void> => {
    const collectionNames = (await serviceProvider.listCollections(dbName)).map(({ name }) => name);
    expect(collectionNames).to.include(collectionName);
  };

  const expectCollectionNotToExist = async(dbName: any, collectionName: any): Promise<void> => {
    const collectionNames = (await serviceProvider.listCollections(dbName)).map(({ name }) => name);
    expect(collectionNames).to.not.include(collectionName);
  };

  // TODO: replace with serviceProvider.createCollection()
  const createCollection = async(dbName: string, collectionName: string): Promise<any> => {
    const now = Date.now();
    await serviceProvider.insertOne(dbName, collectionName, { _id: now });
    await serviceProvider.deleteOne(dbName, collectionName, { _id: now });
  };

  before(async() => {
    serviceProvider = await CliServiceProvider.connect(connectionString);
  });

  after(() => {
    return serviceProvider.close(true);
  });

  let internalState;
  let shellApi;
  let mongo;
  let dbName;
  let database;
  let collection;
  let collectionName;

  beforeEach(async() => {
    dbName = `test-${Date.now()}`;
    collectionName = 'docs';

    internalState = new ShellInternalState(serviceProvider);
    shellApi = new ShellApi(internalState);
    mongo = new Mongo(internalState);
    mongo.use(dbName);
    database = mongo.getDB(dbName);
    collection = database.getCollection(collectionName);
    await database.dropDatabase();
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
          collection.find({}, { _id: 0 });
          await shellApi.it();
          expect(await shellApi.it()).to.deep.equal([{
            doc: 21
          }]);
        });
      });

      describe('when calling limit after skip', () => {
        let cursor: Cursor;

        beforeEach(() => {
          cursor = collection.find({}, { _id: 0 })
            .skip(1)
            .limit(1);
        });

        describe('when calling toArray on the cursor', () => {
          it('returns the right documents', async() => {
            expect(await cursor.toArray()).to.deep.equal([{ doc: 2 }]);
          });
        });

        describe('when calling asShellResult on the cursor', () => {
          it('returns the right documents', async() => {
            expect((await cursor[asShellResult]()).value).to.deep.equal([{ doc: 2 }]);
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

          result = await collection.bulkWrite(requests);
        });

        it('returns acknowledged = true', () => {
          expect(result.acknowledged).to.be.true;
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

    describe('updateOne', () => {
      beforeEach(async() => {
        await serviceProvider.insertMany(dbName, collectionName, [
          { doc: 1 },
          { doc: 1 },
          { doc: 2 }
        ]);
      });

      context('without upsert', () => {
        let result;

        beforeEach(async() => {
          result = await collection.updateOne(
            { doc: 1 }, { $inc: { x: 1 } }
          );
        });

        it('updates only one existing document matching filter', async() => {
          const docs = await findAllWithoutId(dbName, collectionName);

          expect(docs).to.deep.equal([
            { doc: 1, x: 1 },
            { doc: 1 },
            { doc: 2 }
          ]);
        });

        it('returns update result correctly', () => {
          it('returns update result correctly', () => {
            const {
              acknowledged,
              insertedId,
              matchedCount,
              modifiedCount,
              upsertedCount
            } = result;

            expect({
              acknowledged,
              insertedId,
              matchedCount,
              modifiedCount,
              upsertedCount
            }).to.deep.equal({
              acknowledged: 1,
              insertedId: null,
              matchedCount: 1,
              modifiedCount: 1,
              upsertedCount: 0
            });
          });
        });
      });

      context('with upsert', () => {
        let result;

        beforeEach(async() => {
          result = await collection.updateOne(
            { _id: 'new-doc' }, { $set: { _id: 'new-doc', doc: 3 } }, { upsert: true }
          );
        });

        it('inserts a document', async() => {
          const docs = await findAllWithoutId(dbName, collectionName);

          expect(docs).to.deep.equal([
            { doc: 1 },
            { doc: 1 },
            { doc: 2 },
            { doc: 3 }
          ]);
        });

        it('returns update result correctly', () => {
          const {
            acknowledged,
            insertedId,
            matchedCount,
            modifiedCount,
            upsertedCount
          } = result;

          expect({
            acknowledged,
            insertedId,
            matchedCount,
            modifiedCount,
            upsertedCount
          }).to.deep.equal({
            acknowledged: 1,
            insertedId: {
              _id: 'new-doc',
              index: 0
            },
            matchedCount: 0,
            modifiedCount: 0,
            upsertedCount: 1
          });
        });
      });
    });

    describe('convertToCapped', () => {
      let result;

      beforeEach(async() => {
        await createCollection(dbName, collectionName);

        expect(await serviceProvider.isCapped(
          dbName,
          collectionName
        )).to.be.false;

        result = await collection.convertToCapped(
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

        result = await collection.createIndexes([{ x: 1 }], {
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

        result = await collection.getIndexes(collection);
      });

      it('returns indexes for the collection', () => {
        expect(result.length).to.equal(2);
        expect(result[0]).to.deep.include(
          {
            key: {
              _id: 1
            },
            name: '_id_',
            v: 2
          });
        expect(result[1]).to.deep.include(
          {
            key: {
              x: 1
            },
            name: 'x_1',
            v: 2
          });
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

        await collection.dropIndexes('*');

        expect(await getIndexNames(dbName, collectionName)).not.to.contain('index-1');
      });
    });

    describe('#reIndex', () => {
      beforeEach(async() => {
        await createCollection(dbName, collectionName);
      });

      it('runs against the db', async() => {
        const result = await collection.reIndex();

        expect(
          result
        ).to.deep.include({
          nIndexesWas: 1,
          nIndexes: 1,
          ok: 1
        });
        expect(result.indexes.length).to.equal(1);
        expect(result.indexes[0]).to.deep.include({
          v: 2,
          key: {
            '_id': 1
          },
          name: '_id_'
        });
      });
    });

    describe('totalIndexSize', () => {
      beforeEach(async() => {
        await createCollection(dbName, collectionName);
      });

      it('returns total index size', async() => {
        expect(typeof await collection.totalIndexSize()).to.equal('number');
      });
    });

    describe('dataSize', () => {
      beforeEach(async() => {
        await createCollection(dbName, collectionName);
      });

      it('returns total index size', async() => {
        expect(typeof await collection.dataSize()).to.equal('number');
      });
    });

    describe('storageSize', () => {
      beforeEach(async() => {
        await createCollection(dbName, collectionName);
      });

      it('returns total index size', async() => {
        expect(typeof await collection.storageSize()).to.equal('number');
      });
    });

    describe('totalSize', () => {
      beforeEach(async() => {
        await createCollection(dbName, collectionName);
      });

      it('returns total index size', async() => {
        expect(typeof await collection.totalSize()).to.equal('number');
      });
    });

    describe('stats', () => {
      beforeEach(async() => {
        await createCollection(dbName, collectionName);
        await serviceProvider.insertOne(dbName, collectionName, { x: 1 });
      });

      it('returns stats without indexDetails', async() => {
        const stats = await collection.stats();
        expect(stats).to.contain.keys(
          'avgObjSize',
          'capped',
          'count',
          'indexBuilds',
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
      it('returns stats with indexDetails', async() => {
        const stats = await collection.stats({ indexDetails: true });
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
          result = await collection.drop();
        });

        it('returns true', async() => {
          expect(result).to.be.true;
        });

        it('deletes the collection', async() => {
          await expectCollectionNotToExist(dbName, collectionName);
        });
      });

      context('when a collection does not exist', () => {
        it('returns false', async() => {
          expect(await collection.drop()).to.be.false;
        });
      });
    });

    describe('exists', () => {
      context('when a collection exists', () => {
        beforeEach(async() => {
          await createCollection(dbName, collectionName);
        });

        it('returns the collection object', async() => {
          expect((await collection.exists()).name).to.equal(collectionName);
        });
      });

      context('when a collection does not exist', () => {
        it('returns false', async() => {
          expect(await collection.drop()).to.be.false;
        });
      });
    });

    describe('runCommand', () => {
      beforeEach(async() => {
        await createCollection(dbName, collectionName);
      });


      it('runs a command with the collection as parameter and returns the result', async() => {
        expect(await collection.runCommand('collStats')).to.include({
          ok: 1,
          ns: `${dbName}.${collectionName}`
        });
      });
    });

    describe('findAndModify', () => {
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
        await collection.findAndModify(
          {
            query: { doc: 1 },
            update: { foo: 'bar' }
          }
        );

        expect(await findAllWithoutId(dbName, collectionName)).to.deep.equal([
          { foo: 'bar' },
          { doc: 2, foo: 1 }
        ]);
      });

      it('removes only a matching document', async() => {
        await collection.findAndModify(
          {
            query: { doc: 1 },
            remove: true
          }
        );

        expect(await findAllWithoutId(dbName, collectionName)).to.deep.equal([
          { doc: 2, foo: 1 }
        ]);
      });

      it('changes the first matching document with sort', async() => {
        await collection.findAndModify(
          {
            query: { foo: 1 },
            sort: { doc: -1 },
            update: { changed: true }
          }
        );

        expect(await findAllWithoutId(dbName, collectionName)).to.deep.equal([
          { doc: 1, foo: 1 },
          { changed: true }
        ]);
      });

      it('returns the old document if new is not passed', async() => {
        expect(
          await collection.findAndModify({ query: { doc: 1 }, update: { changed: true } })
        ).to.deep.include({ doc: 1 });

        expect(
          await collection.findAndModify({ query: { doc: 2 }, remove: true })
        ).to.deep.include({ doc: 2 });
      });

      it('returns the new document if new is passed', async() => {
        expect(
          await collection.findAndModify({
            query: { doc: 1 }, new: true, update: { changed: true }
          })
        ).to.deep.include({ changed: true });
      });

      it('allows upserts', async() => {
        await collection.findAndModify({
          query: { doc: 3 }, new: true, update: { doc: 3 }, upsert: true
        });

        expect(
          await findAllWithoutId(dbName, collectionName)
        ).to.deep.include({ doc: 3 });
      });
    });

    describe('renameCollection', () => {
      context('without dropTarget', () => {
        beforeEach(async() => {
          await serviceProvider.insertOne(dbName, collectionName, { doc: 1 });
          await collection.renameCollection(
            'newName'
          );
        });

        it('renames a collection', async() => {
          await expectCollectionToExist(dbName, 'newName');
          await new Promise((resolve) => { setTimeout(resolve, 2000); });
          await expectCollectionNotToExist(dbName, collectionName);
        });

        it('does not drop documents', async() => {
          expect(
            await findAllWithoutId(
              dbName,
              'newName'
            )
          ).to.deep.include({
            doc: 1
          });
        });
      });

      context('with dropTarget = true', () => {
        beforeEach(async() => {
          await serviceProvider.insertOne(dbName, collectionName, { doc: 1 });
          await collection.renameCollection(
            'newName',
            true
          );
        });

        it('renames a collection', async() => {
          await expectCollectionToExist(dbName, 'newName');
          await new Promise((resolve) => { setTimeout(resolve, 2000); });
          await expectCollectionNotToExist(dbName, collectionName);
        });

        it('drops documents', async() => {
          expect(
            await findAllWithoutId(
              dbName,
              'newName'
            )
          ).to.deep.include({
            doc: 1
          });
        });
      });
    });

    describe('aggregate', () => {
      it('runs an aggregate pipeline on the database', async() => {
        await serviceProvider.insertOne(dbName, collectionName, { x: 1 });

        const cursor = await collection.aggregate([{
          $count: 'count'
        }]);

        expect(await (cursor as AggregationCursor).toArray()).to.deep.equal([{ count: 1 }]);
      });

      it('runs an explain with explain: true', async() => {
        await serviceProvider.insertOne(dbName, collectionName, { x: 1 });

        const cursor = await collection.aggregate([{
          $count: 'count'
        }]);

        expect(await (cursor as AggregationCursor).toArray()).to.deep.equal([{ count: 1 }]);
      });
    });
  });

  describe('db', () => {
    describe('getCollectionInfos', () => {
      it('returns an array with collection infos', async() => {
        await createCollection(dbName, collectionName);

        expect(await database.getCollectionInfos({}, { nameOnly: true })).to.deep.equal([{
          name: collectionName,
          type: 'collection'
        }]);
      });
    });

    describe('getCollectionNames', () => {
      it('returns an array with collection names', async() => {
        await createCollection(dbName, collectionName);

        expect(
          await database.getCollectionNames()
        ).to.deep.equal([collectionName]);
      });
    });

    describe('adminCommand', () => {
      it('runs an adminCommand', async() => {
        const result = await database.adminCommand(
          { serverStatus: 1 }
        );
        expect(result.ok).to.equal(1);
        expect(result.process).to.match(/mongo/);
      });
    });

    describe('aggregate', () => {
      it('runs an aggregate pipeline on the database', async() => {
        const cursor = await database.aggregate([{
          $listLocalSessions: {}
        }]);

        expect((await (cursor as AggregationCursor).toArray())[0]).to.have.keys('_id', 'lastUse');
      });
    });

    describe('dropDatabase', () => {
      let otherDbName;
      beforeEach(() => {
        otherDbName = `${dbName}-2`;
      });

      afterEach(async() => {
        await serviceProvider.dropDatabase(otherDbName);
      });

      const listDatabases = async(): Promise<string> => {
        const { databases } = await serviceProvider.listDatabases('admin');
        return databases.map(db => db.name);
      };

      it('drops only the target database', async() => {
        await createCollection(dbName, collectionName);
        await createCollection(otherDbName, collectionName);

        expect(
          await listDatabases()
        ).to.contain(dbName);

        await database.dropDatabase();

        expect(
          await listDatabases()
        ).not.to.contain(dbName);

        expect(
          await listDatabases()
        ).to.contain(otherDbName);
      });

      it('returns the drop database result', async() => {
        expect(
          await database.dropDatabase()
        ).to.deep.equal({ 'dropped': dbName, 'ok': 1 });
      });
    });

    describe('createCollection', () => {
      it('creates a collection without options', async() => {
        await database.createCollection('newcoll');
        const stats = await serviceProvider.runCommand(dbName, { collStats: 'newcoll' });
        expect(stats.nindexes).to.equal(1);
      });
      it('creates a collection with options', async() => {
        await database.createCollection('newcoll', {
          capped: true,
          size: 1024,
          max: 5000
        });
        const stats = await serviceProvider.runCommand(dbName, { collStats: 'newcoll' });
        expect(stats.nindexes).to.equal(1);
        expect(stats.capped).to.equal(true);
        expect(stats.maxSize).to.equal(1024);
        expect(stats.max).to.equal(5000);
      });
    });
    describe('createView', () => {
      it('creates a view without options', async() => {
        expect(
          await database.createView(
            'view',
            'source',
            [{ $match: { x: 1 } }]
          )
        ).to.deep.equal({ ok: 1 });
        const views = await serviceProvider.find(dbName, 'system.views', {}).toArray();
        expect(views).to.deep.equal([
          {
            _id: `${dbName}.view`,
            viewOn: 'source',
            pipeline: [ { $match: { x: 1 } } ]
          }
        ]);
      });
      it('creates a view with options', async() => {
        expect(
          await database.createView(
            'view',
            'source',
            [{ $match: { x: 1 } }],
            { collation: { locale: 'simple' } }
          )
        ).to.deep.equal({ ok: 1 });
        const views = await serviceProvider.find(dbName, 'system.views', {}).toArray();
        expect(views).to.deep.equal([
          {
            _id: `${dbName}.view`,
            viewOn: 'source',
            pipeline: [ { $match: { x: 1 } } ]
          }
        ]);
      });
    });
  });

  describe('explainable', () => {
    let explainable;

    beforeEach(() => {
      explainable = new Explainable(
        mongo,
        collection,
        'queryPlanner'
      );
    });

    describe('find', () => {
      it('returns a cursor that has the explain as result of asShellResult', async() => {
        const cursor = await explainable.find()
          .skip(1)
          .limit(1);
        const result = await cursor[asShellResult]();
        expect(result.value).to.have.keys([
          'ok',
          'queryPlanner',
          'serverInfo'
        ]);
      });
    });

    describe('aggregate', () => {
      it('returns a cursor that has the explain as result of asShellResult', async() => {
        const cursor = await explainable.find()
          .skip(1)
          .limit(1);
        const result = await cursor[asShellResult]();
        expect(result.value).to.have.keys([
          'ok',
          'queryPlanner',
          'serverInfo'
        ]);
      });
    });
  });
});
