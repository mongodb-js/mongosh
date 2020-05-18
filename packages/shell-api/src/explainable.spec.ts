import { expect } from 'chai';
import sinon, { StubbedInstance, stubInterface } from 'ts-sinon';
import { EventEmitter } from 'events';
import { ALL_PLATFORMS, ALL_SERVER_VERSIONS, ALL_TOPOLOGIES, ReplPlatform } from './enums';
import { signatures } from './decorators';
import Database from './database';
import Cursor from './cursor';
import Mongo from './mongo';
import Collection from './collection';
import Explainable from './explainable';
import { ServiceProvider } from '@mongosh/service-provider-core';
import ShellInternalState from './shell-internal-state';

describe('Explainable', () => {
  describe('signatures', () => {
    it('type', () => {
      expect(signatures.Explainable.type).to.equal('Explainable');
    });
    it('attributes', () => {
      expect(signatures.Explainable.attributes.find).to.deep.equal({
        type: 'function',
        returnsPromise: false,
        returnType: 'ExplainableCursor',
        platforms: ALL_PLATFORMS,
        topologies: ALL_TOPOLOGIES,
        serverVersions: ALL_SERVER_VERSIONS
      });
    });
    it('hasAsyncChild', () => {
      expect(signatures.Explainable.hasAsyncChild).to.equal(true);
    });
  });
  describe('metadata', () => {
    const mongo = { internalState: { emitApiCall: sinon.spy() } };
    const db = new Database(mongo, 'myDB');
    const coll = new Collection(mongo, db, 'myCollection');
    const explainable = new Explainable(mongo, coll, 'verbosity');
    it('toReplString', () => {
      expect(explainable.toReplString()).to.equal('Explainable(myDB.myCollection)');
    });
    it('shellApiType', () => {
      expect(explainable.shellApiType()).to.equal('Explainable');
    });
  });
  describe('commands', () => {
    let mongo: Mongo;
    let serviceProvider: StubbedInstance<ServiceProvider>;
    let database: Database;
    let bus: StubbedInstance<EventEmitter>;
    let internalState: ShellInternalState;
    let collection: Collection;
    let explainable: Explainable;

    beforeEach(() => {
      bus = stubInterface<EventEmitter>();
      serviceProvider = stubInterface<ServiceProvider>();
      internalState = new ShellInternalState(ReplPlatform.CLI, serviceProvider, bus);
      mongo = new Mongo(internalState);
      database = new Database(mongo, 'db1');
      collection = new Collection(mongo, database, 'coll1');
      explainable = new Explainable(mongo, collection, 'queryPlanner');
    });
    describe('getCollection', () => {
      it('returns the explainable collection', () => {
        expect(
          explainable.getCollection()
        ).to.equal(collection);
      });
    });

    describe('getVerbosity', () => {
      it('returns the explainable verbosity', () => {
        expect(
          explainable.getVerbosity()
        ).to.equal('queryPlanner');
      });
    });

    describe('setVerbosity', () => {
      it('sets the explainable verbosity', () => {
        expect(explainable.verbosity).not.to.equal('allPlansExecution');
        explainable.setVerbosity('allPlansExecution');
        expect(explainable.verbosity).to.equal('allPlansExecution');
      });

      it('validates the verbosity', () => {
        expect(() => {
          explainable.setVerbosity('badVerbosityArgument');
        }).to.throw('verbosity can only be one of queryPlanner, executionStats, allPlansExecution. Received badVerbosityArgument.');
      });
    });

    describe('find', () => {
      let cursorStub;
      let explainResult;
      beforeEach(async() => {
        explainResult = { ok: 1 };

        const cursorSpy = {
          explain: sinon.spy(() => explainResult)
        } as unknown;
        collection.find = sinon.spy(() => (cursorSpy as Cursor));

        cursorStub = await explainable.find(
          { query: 1 },
          { projection: 1 }
        );
      });

      it('calls collection.find with arguments', () => {
        expect(collection.find).to.have.been.calledOnceWithExactly(
          { query: 1 },
          { projection: 1 }
        );
      });

      it('returns an cursor that has shellApiType when evaluated', () => {
        expect(cursorStub.shellApiType()).to.equal('ExplainableCursor');
      });

      context('when calling toReplString on the result', () => {
        it('calls explain with verbosity', async() => {
          expect(await cursorStub.toReplString()).to.equal(explainResult);
          expect(cursorStub.verbosity).to.equal('queryPlanner');
        });

        it('returns the explain result', async() => {
          expect(
            await cursorStub.toReplString()
          ).to.equal(explainResult);
        });
      });
    });

    describe('aggregate', () => {
      let explainResult;
      let expectedExplainResult;
      let cursor;
      beforeEach(async() => {
        explainResult = { ok: 1 };
        cursor = {
          explain: sinon.spy(() => Promise.resolve(expectedExplainResult))
        };

        collection.aggregate = sinon.spy(() => Promise.resolve(cursor));

        explainResult = await explainable.aggregate(
          { pipeline: 1 },
          { aggregate: 1 }
        );
      });

      it('calls collection.aggregate with arguments', () => {
        expect(collection.aggregate).to.have.been.calledOnceWithExactly(
          { pipeline: 1 },
          { aggregate: 1, explain: false }
        );
      });

      it('calls explain with verbosity', async() => {
        expect(
          cursor.explain
        ).to.have.been.calledOnceWithExactly('queryPlanner');
      });

      it('returns the explain result', () => {
        expect(explainResult).to.equal(expectedExplainResult);
      });
    });
  });
});
