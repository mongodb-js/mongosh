import { expect } from 'chai';
import sinon from 'sinon';
import type { StubbedInstance } from 'ts-sinon';
import { stubInterface } from 'ts-sinon';
import type { EventEmitter } from 'events';
import { ALL_PLATFORMS, ALL_SERVER_VERSIONS, ALL_TOPOLOGIES } from './enums';
import type { ExplainableCursor } from './index';
import { signatures, toShellResult } from './index';
import Database from './database';
import type Cursor from './cursor';
import Mongo from './mongo';
import Collection from './collection';
import Explainable from './explainable';
import type { ServiceProvider, Document } from '@mongosh/service-provider-core';
import { bson } from '@mongosh/service-provider-core';
import ShellInstanceState from './shell-instance-state';

describe('Explainable', function () {
  describe('help', function () {
    const apiClass = new Explainable(
      {} as any,
      {} as any,
      'queryPlannerExtended'
    );
    it('calls help function', async function () {
      expect((await toShellResult(apiClass.help())).type).to.equal('Help');
      expect((await toShellResult(apiClass.help)).type).to.equal('Help');
    });
  });
  describe('signatures', function () {
    it('type', function () {
      expect(signatures.Explainable.type).to.equal('Explainable');
    });
    it('attributes', function () {
      expect(signatures.Explainable.attributes?.find).to.deep.equal({
        type: 'function',
        returnsPromise: true,
        deprecated: false,
        returnType: 'ExplainableCursor',
        platforms: ALL_PLATFORMS,
        topologies: ALL_TOPOLOGIES,
        apiVersions: [1, Infinity],
        serverVersions: ALL_SERVER_VERSIONS,
        isDirectShellCommand: false,
        acceptsRawInput: false,
        shellCommandCompleter: undefined,
      });
    });
  });
  describe('metadata', function () {
    const mongo: any = { _instanceState: { emitApiCallWithArgs: sinon.spy() } };
    const db = new Database(mongo, 'myDB');
    const coll = new Collection(mongo, db, 'myCollection');
    const explainable = new Explainable(mongo, coll, 'queryPlannerExtended');
    it('toShellResult', async function () {
      const result = await toShellResult(explainable);
      expect(result.type).to.equal('Explainable');
      expect(result.printable).to.equal('Explainable(myDB.myCollection)');
    });
  });
  describe('commands', function () {
    let mongo: Mongo;
    let serviceProvider: StubbedInstance<ServiceProvider>;
    let database: Database;
    let bus: StubbedInstance<EventEmitter>;
    let instanceState: ShellInstanceState;
    let collection: Collection;
    let explainable: Explainable;

    beforeEach(function () {
      bus = stubInterface<EventEmitter>();
      serviceProvider = stubInterface<ServiceProvider>();
      serviceProvider.initialDb = 'test';
      serviceProvider.bsonLibrary = bson;
      instanceState = new ShellInstanceState(serviceProvider, bus);
      mongo = new Mongo(
        instanceState,
        undefined,
        undefined,
        undefined,
        serviceProvider
      );
      database = new Database(mongo, 'db1');
      collection = new Collection(mongo, database, 'coll1');
      explainable = new Explainable(mongo, collection, 'queryPlanner');
    });
    describe('getCollection', function () {
      it('returns the explainable collection', function () {
        expect(explainable.getCollection()).to.equal(collection);
      });
    });

    describe('getVerbosity', function () {
      it('returns the explainable verbosity', function () {
        expect(explainable.getVerbosity()).to.equal('queryPlanner');
      });
    });

    describe('setVerbosity', function () {
      it('sets the explainable verbosity', function () {
        expect(explainable._verbosity).not.to.equal('allPlansExecution');
        explainable.setVerbosity('allPlansExecution');
        expect(explainable._verbosity).to.equal('allPlansExecution');
      });

      it('throws in case of non valid verbosity', function () {
        expect(() => {
          collection.explain(0 as any);
        }).to.throw('verbosity must be a string');
      });
    });

    describe('find', function () {
      context('without options', function () {
        let cursorStub: ExplainableCursor;
        let explainResult: Document;

        beforeEach(async function () {
          explainResult = { ok: 1 };

          const cursorSpy = {
            explain: sinon.spy(() => explainResult),
          } as unknown;
          collection.find = sinon.spy(() =>
            Promise.resolve(cursorSpy as Cursor)
          );

          cursorStub = await explainable.find({ query: 1 }, { projection: 1 });
        });

        it('calls collection.find with arguments', function () {
          expect(collection.find).to.have.been.calledOnceWithExactly(
            { query: 1 },
            { projection: 1 },
            {}
          );
        });

        it('returns an cursor that has toShellResult when evaluated', async function () {
          expect((await toShellResult(cursorStub)).type).to.equal(
            'ExplainableCursor'
          );
        });

        context(
          'when calling toShellResult().printable on the result',
          function () {
            it('calls explain with verbosity', function () {
              expect(cursorStub._verbosity).to.equal('queryPlanner');
            });

            it('returns the explain result', async function () {
              expect((await toShellResult(cursorStub)).printable).to.equal(
                explainResult
              );
            });
          }
        );
      });

      context('with options', function () {
        let cursorStub: ExplainableCursor;
        let explainResult: Document;

        beforeEach(async function () {
          explainResult = { ok: 1 };

          const cursorSpy = {
            explain: sinon.spy(() => explainResult),
          } as unknown;
          collection.find = sinon.spy(() =>
            Promise.resolve(cursorSpy as Cursor)
          );

          cursorStub = await explainable.find({}, undefined, {
            collation: { locale: 'simple' },
          });
        });

        it('calls collection.find with arguments', function () {
          expect(collection.find).to.have.been.calledOnceWithExactly(
            {},
            undefined,
            { collation: { locale: 'simple' } }
          );
        });

        it('returns an cursor that has toShellResult when evaluated', async function () {
          expect((await toShellResult(cursorStub)).type).to.equal(
            'ExplainableCursor'
          );
        });
      });
    });

    describe('aggregate', function () {
      let explainResult: Document;
      const expectedExplainResult = { ok: 1 };

      context('without options', function () {
        beforeEach(function () {
          collection.aggregate = sinon.spy(() =>
            Promise.resolve(expectedExplainResult)
          ) as any;
        });

        const stages = [{ pipeline: 1 }, { $count: 'count' }];
        [stages, [stages]].forEach((args) => {
          describe(`and stages as ${
            args.length === 1 ? 'pipeline array' : 'individual args'
          }`, function () {
            beforeEach(async function () {
              explainResult = await explainable.aggregate(...args);
            });
            it('calls collection.aggregate with arguments', function () {
              expect(collection.aggregate).to.have.been.calledOnceWithExactly(
                args.length === 1 ? args[0] : args,
                { explain: 'queryPlanner' }
              );
            });

            it('returns the explain result', function () {
              expect(explainResult).to.equal(expectedExplainResult);
            });
          });
        });
      });

      context('with options', function () {
        beforeEach(async function () {
          collection.aggregate = sinon.spy(() =>
            Promise.resolve(expectedExplainResult)
          ) as any;

          explainResult = await explainable.aggregate([{ pipeline: 1 }], {
            aggregate: 1,
          });
        });

        it('calls collection.aggregate with arguments', function () {
          expect(collection.aggregate).to.have.been.calledOnceWithExactly(
            [{ pipeline: 1 }],
            { aggregate: 1, explain: 'queryPlanner' }
          );
        });

        it('returns the explain result', function () {
          expect(explainResult).to.equal(expectedExplainResult);
        });
      });
    });
  });
});
