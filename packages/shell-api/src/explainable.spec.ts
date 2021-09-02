import { expect } from 'chai';
import sinon, { StubbedInstance, stubInterface } from 'ts-sinon';
import { EventEmitter } from 'events';
import { ALL_PLATFORMS, ALL_SERVER_VERSIONS, ALL_TOPOLOGIES } from './enums';
import { signatures, toShellResult } from './index';
import Database from './database';
import Cursor from './cursor';
import Mongo from './mongo';
import Collection from './collection';
import Explainable from './explainable';
import { ServiceProvider, bson, Document } from '@mongosh/service-provider-core';
import ShellInstanceState from './shell-instance-state';

describe('Explainable', () => {
  describe('help', () => {
    const apiClass = new Explainable({} as any, {} as any, 'queryPlannerExtended');
    it('calls help function', async() => {
      expect((await toShellResult(apiClass.help())).type).to.equal('Help');
      expect((await toShellResult(apiClass.help)).type).to.equal('Help');
    });
  });
  describe('signatures', () => {
    it('type', () => {
      expect(signatures.Explainable.type).to.equal('Explainable');
    });
    it('attributes', () => {
      expect(signatures.Explainable.attributes.find).to.deep.equal({
        type: 'function',
        returnsPromise: true,
        deprecated: false,
        returnType: 'ExplainableCursor',
        platforms: ALL_PLATFORMS,
        topologies: ALL_TOPOLOGIES,
        apiVersions: [ 1, Infinity ],
        serverVersions: ALL_SERVER_VERSIONS,
        isDirectShellCommand: false,
        shellCommandCompleter: undefined
      });
    });
  });
  describe('metadata', () => {
    const mongo: any = { _instanceState: { emitApiCall: sinon.spy() } };
    const db = new Database(mongo, 'myDB');
    const coll = new Collection(mongo, db, 'myCollection');
    const explainable = new Explainable(mongo, coll, 'queryPlannerExtended');
    it('toShellResult', async() => {
      const result = await toShellResult(explainable);
      expect(result.type).to.equal('Explainable');
      expect(result.printable).to.equal('Explainable(myDB.myCollection)');
    });
  });
  describe('commands', () => {
    let mongo: Mongo;
    let serviceProvider: StubbedInstance<ServiceProvider>;
    let database: Database;
    let bus: StubbedInstance<EventEmitter>;
    let instanceState: ShellInstanceState;
    let collection: Collection;
    let explainable: Explainable;

    beforeEach(() => {
      bus = stubInterface<EventEmitter>();
      serviceProvider = stubInterface<ServiceProvider>();
      serviceProvider.initialDb = 'test';
      serviceProvider.bsonLibrary = bson;
      instanceState = new ShellInstanceState(serviceProvider, bus);
      mongo = new Mongo(instanceState, undefined, undefined, undefined, serviceProvider);
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
        expect(explainable._verbosity).not.to.equal('allPlansExecution');
        explainable.setVerbosity('allPlansExecution');
        expect(explainable._verbosity).to.equal('allPlansExecution');
      });


      it('throws in case of non valid verbosity', () => {
        expect(() => {
          collection.explain(0 as any);
        }).to.throw('verbosity must be a string');
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
        collection.find = sinon.spy(() => Promise.resolve(cursorSpy as Cursor));

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

      it('returns an cursor that has toShellResult when evaluated', async() => {
        expect((await toShellResult(cursorStub)).type).to.equal('ExplainableCursor');
      });

      context('when calling toShellResult().printable on the result', () => {
        it('calls explain with verbosity', () => {
          expect(cursorStub._verbosity).to.equal('queryPlanner');
        });

        it('returns the explain result', async() => {
          expect(
            (await toShellResult(cursorStub)).printable
          ).to.equal(explainResult);
        });
      });
    });

    describe('aggregate', () => {
      let explainResult: Document;
      const expectedExplainResult = { ok: 1 };

      context('without options', () => {
        beforeEach(() => {
          collection.aggregate = sinon.spy(() => Promise.resolve(expectedExplainResult)) as any;
        });

        const stages = [{ pipeline: 1 }, { $count: 'count' }];
        [ stages, [stages] ].forEach(args => {
          describe(`and stages as ${args.length === 1 ? 'pipeline array' : 'individual args'}`, () => {
            beforeEach(async() =>{
              explainResult = await explainable.aggregate(...args);
            });
            it('calls collection.aggregate with arguments', () => {
              expect(collection.aggregate).to.have.been.calledOnceWithExactly(
                args.length === 1 ? args[0] : args,
                { explain: 'queryPlanner' }
              );
            });

            it('returns the explain result', () => {
              expect(explainResult).to.equal(expectedExplainResult);
            });
          });
        });
      });

      context('with options', () => {
        beforeEach(async() => {
          collection.aggregate = sinon.spy(() => Promise.resolve(expectedExplainResult)) as any;

          explainResult = await explainable.aggregate(
            [{ pipeline: 1 }],
            { aggregate: 1 }
          );
        });

        it('calls collection.aggregate with arguments', () => {
          expect(collection.aggregate).to.have.been.calledOnceWithExactly(
            [{ pipeline: 1 }],
            { aggregate: 1, explain: 'queryPlanner' }
          );
        });

        it('returns the explain result', () => {
          expect(explainResult).to.equal(expectedExplainResult);
        });
      });
    });
  });
});
