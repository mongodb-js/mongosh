import { expect } from 'chai';
import sinon, { StubbedInstance, stubInterface } from 'ts-sinon';
import { EventEmitter } from 'events';
import { ALL_PLATFORMS, ALL_SERVER_VERSIONS, ALL_TOPOLOGIES } from './enums';
import { signatures } from './decorators';
import Database from './database';
import Collection from './collection';
import Mongo from './mongo';
import { Cursor as ServiceProviderCursor, ServiceProvider } from '@mongosh/service-provider-core';
import ShellInternalState from './shell-internal-state';

describe('Database', () => {
  describe('help', () => {
    const apiClass: any = new Database({}, 'name');
    it('calls help function', () => {
      expect(apiClass.help().shellApiType()).to.equal('Help');
      expect(apiClass.help.shellApiType()).to.equal('Help');
    });
  });
  describe('collections', () => {
    it('allows to get a collection as property if is not one of the existing methods', () => {
      const database: any = new Database({}, 'db1');
      expect(database.someCollection).to.have.instanceOf(Collection);
      expect(database.someCollection.name).to.equal('someCollection');
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
      expect(database.name).to.equal('db1');
    });

    it('allows to access collections', () => {
      const database: any = new Database({}, 'db1');
      expect(database.collections).to.deep.equal({});
    });
  });
  describe('signatures', () => {
    it('type', () => {
      expect(signatures.Database.type).to.equal('Database');
    });
    it('attributes', () => {
      expect(signatures.Database.attributes.aggregate).to.deep.equal({
        type: 'function',
        returnsPromise: true,
        returnType: 'AggregationCursor',
        platforms: ALL_PLATFORMS,
        topologies: ALL_TOPOLOGIES,
        serverVersions: ALL_SERVER_VERSIONS
      });
    });
    it('hasAsyncChild', () => {
      expect(signatures.Database.hasAsyncChild).to.equal(true);
    });
  });
  describe('Metadata', () => {
    describe('toReplString', () => {
      const mongo = sinon.spy();
      const db = new Database(mongo, 'myDB');
      it('toReplString returns DB name', () => {
        expect(db.toReplString()).to.equal('myDB');
      });
      it('shellApiType', () => {
        expect(db.shellApiType()).to.equal('Database');
      });
    });
  });
  describe('attributes', () => {
    const mongo = sinon.spy();
    const db = new Database(mongo, 'myDB') as any;
    it('creates new collection for attribute', () => {
      expect(db.coll.shellApiType()).to.equal('Collection');
    });
  });
  describe('commands', () => {
    let mongo: Mongo;
    let serviceProvider: StubbedInstance<ServiceProvider>;
    let database: Database;
    let bus: StubbedInstance<EventEmitter>;
    let internalState: ShellInternalState;

    beforeEach(() => {
      bus = stubInterface<EventEmitter>();
      serviceProvider = stubInterface<ServiceProvider>();
      internalState = new ShellInternalState(serviceProvider, bus);
      mongo = new Mongo(internalState);
      database = new Database(mongo, 'db1');
    });
    describe('getCollectionInfos', () => {
      it('returns the result of serviceProvider.listCollections', async() => {
        const filter = { name: 'abc' };
        const options = { nameOnly: true };
        const result = [{ name: 'coll1' }];

        serviceProvider.listCollections.resolves(result);

        expect(await database.getCollectionInfos(
          filter,
          options)).to.deep.equal(result);

        expect(serviceProvider.listCollections).to.have.been.calledOnceWith('db1', filter, options);
      });
    });

    describe('getCollectionNames', () => {
      it('returns the result of serviceProvider.listCollections', async() => {
        const result = [{ name: 'coll1' }];

        serviceProvider.listCollections.resolves(result);

        expect(await database.getCollectionNames()).to.deep.equal(['coll1']);

        expect(serviceProvider.listCollections).to.have.been.calledOnceWith(
          'db1', {}, { nameOnly: true });
      });
    });

    describe('runCommand', () => {
      it('calls serviceProvider.runCommand on the database', async() => {
        await database.runCommand({ someCommand: 'someCollection' });

        expect(serviceProvider.runCommand).to.have.been.calledWith(
          database.name,
          {
            someCommand: 'someCollection'
          }
        );
      });

      it('returns whatever serviceProvider.runCommand returns', async() => {
        const expectedResult = { ok: 1 };
        serviceProvider.runCommand.resolves(expectedResult);
        const result = await database.runCommand({ someCommand: 'someCollection' });
        expect(result).to.deep.equal(expectedResult);
      });

      it('throws if serviceProvider.runCommand rejects', async() => {
        const expectedError = new Error();
        serviceProvider.runCommand.rejects(expectedError);
        const catchedError = await database.runCommand({ someCommand: 'someCollection' })
          .catch(e => e);
        expect(catchedError).to.equal(expectedError);
      });
    });

    describe('adminCommand', () => {
      it('calls serviceProvider.runCommand with the admin database', async() => {
        await database.adminCommand({ someCommand: 'someCollection' });

        expect(serviceProvider.runCommand).to.have.been.calledWith(
          'admin',
          {
            someCommand: 'someCollection'
          }
        );
      });

      it('returns whatever serviceProvider.runCommand returns', async() => {
        const expectedResult = { ok: 1 };
        serviceProvider.runCommand.resolves(expectedResult);
        const result = await database.adminCommand({ someCommand: 'someCollection' });
        expect(result).to.deep.equal(expectedResult);
      });
      it('throws if serviceProvider.runCommand rejects', async() => {
        const expectedError = new Error();
        serviceProvider.runCommand.rejects(expectedError);
        const catchedError = await database.adminCommand({ someCommand: 'someCollection' })
          .catch(e => e);
        expect(catchedError).to.equal(expectedError);
      });
    });

    describe('aggregate', () => {
      let serviceProviderCursor: StubbedInstance<ServiceProviderCursor>;

      beforeEach(() => {
        serviceProviderCursor = stubInterface<ServiceProviderCursor>();
      });

      it('calls serviceProvider.aggregateDb with pipleline and options', async() => {
        await database.aggregate(
          [{ $piplelineStage: {} }], { options: true });

        expect(serviceProvider.aggregateDb).to.have.been.calledWith(
          database.name,
          [{ $piplelineStage: {} }],
          { options: true }
        );
      });

      it('returns an AggregationCursor that wraps the service provider one', async() => {
        const toArrayResult = [];
        serviceProviderCursor.toArray.resolves(toArrayResult);
        serviceProvider.aggregateDb.returns(serviceProviderCursor);

        const cursor = await database.aggregate([{ $piplelineStage: {} }]);
        expect(await cursor.toArray()).to.equal(toArrayResult);
      });

      it('throws if serviceProvider.aggregateDb rejects', async() => {
        const expectedError = new Error();
        serviceProvider.aggregateDb.throws(expectedError);

        expect(
          await database.aggregate(
            [{ $piplelineStage: {} }]
          ).catch(e => e)
        ).to.equal(expectedError);
      });

      it('pass readConcern and writeConcern as dbOption', async() => {
        await database.aggregate(
          [],
          { otherOption: true, readConcern: { level: 'majority' }, writeConcern: { w: 1 } }
        );

        expect(serviceProvider.aggregateDb).to.have.been.calledWith(
          database.name,
          [],
          { otherOption: true },
          { readConcern: { level: 'majority' }, w: 1 }
        );
      });

      it('runs explain if explain true is passed', async() => {
        const expectedExplainResult = {};
        serviceProviderCursor.explain.resolves(expectedExplainResult);
        serviceProvider.aggregateDb.returns(serviceProviderCursor as any);

        const explainResult = await database.aggregate(
          [],
          { explain: true }
        );

        expect(explainResult).to.equal(expectedExplainResult);
        expect(serviceProviderCursor.explain).to.have.been.calledOnce;
      });

      it('wont run explain if explain is not passed', async() => {
        serviceProvider.aggregateDb.returns(serviceProviderCursor as any);

        const cursor = await database.aggregate(
          [],
          {}
        );
        await cursor.toReplString();

        expect(cursor.shellApiType()).to.equal('AggregationCursor');
        expect(serviceProviderCursor.explain).not.to.have.been.called;
      });
    });
    describe('getSiblingDB', () => {
      it('returns a database', async() => {
        const otherDb = await database.getSiblingDB('otherdb');
        expect(otherDb).to.be.instanceOf(Database);
        expect(otherDb.name).to.equal('otherdb');
      });

      it('throws if name is not a string', () => {
        expect(() => {
          database.getSiblingDB(undefined);
        }).to.throw('Database name must be a string. Received undefined.');
      });

      it('throws if name is empty', () => {
        expect(() => {
          database.getSiblingDB('');
        }).to.throw('Database name cannot be empty.');
      });

      it('reuses db instances', () => {
        const otherDb = database.getSiblingDB('otherdb');
        expect(
          database.getSiblingDB('otherdb')
        ).to.equal(otherDb);
      });
    });

    describe('getCollection', () => {
      it('returns a collection for the database', async() => {
        const coll = database.getCollection('coll');
        expect(coll).to.be.instanceOf(Collection);
        expect(coll.name).to.equal('coll');
        expect(coll.database).to.equal(database);
      });

      it('throws if name is not a string', () => {
        expect(() => {
          database.getCollection(undefined);
        }).to.throw('Collection name must be a string. Received undefined.');
      });

      it('throws if name is empty', () => {
        expect(() => {
          database.getCollection('');
        }).to.throw('Collection name cannot be empty.');
      });

      it('allows to use collection names that would collide with methods', () => {
        const coll = database.getCollection('getCollection');
        expect(coll).to.be.instanceOf(Collection);
        expect(coll.name).to.equal('getCollection');
      });

      it('allows to use collection names that starts with _', () => {
        const coll = database.getCollection('_coll1');
        expect(coll).to.be.instanceOf(Collection);
        expect(coll.name).to.equal('_coll1');
      });

      it('reuses collections', () => {
        expect(
          database.getCollection('coll')
        ).to.equal(database.getCollection('coll'));
      });
    });

    describe('dropDatabase', () => {
      it('calls serviceProvider.dropDatabase on the database', async() => {
        await database.dropDatabase({ w: 1 });

        expect(serviceProvider.dropDatabase).to.have.been.calledWith(
          database.name,
          { w: 1 }
        );
      });

      it('returns whatever serviceProvider.dropDatabase returns', async() => {
        const expectedResult = { ok: 1 };
        serviceProvider.dropDatabase.resolves(expectedResult);
        const result = await database.dropDatabase();
        expect(result).to.deep.equal(expectedResult);
      });

      it('throws if serviceProvider.dropDatabase rejects', async() => {
        const expectedError = new Error();
        serviceProvider.dropDatabase.rejects(expectedError);
        const catchedError = await database.dropDatabase()
          .catch(e => e);
        expect(catchedError).to.equal(expectedError);
      });
    });
  });
});

