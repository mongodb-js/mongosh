import { signatures, toShellResult } from './index';
import Cursor from './cursor';
import type {
  FindCursor as ServiceProviderCursor,
  ServiceProviderFindCursor,
} from '@mongosh/service-provider-core';
import {
  ALL_PLATFORMS,
  ALL_SERVER_VERSIONS,
  ALL_TOPOLOGIES,
  ALL_API_VERSIONS,
  ServerVersions,
} from './enums';
import chai from 'chai';
import sinonChai from 'sinon-chai';
import sinon from 'sinon';
import type { StubbedInstance } from 'ts-sinon';
import { stubInterface } from 'ts-sinon';
import {
  CommonErrors,
  MongoshDeprecatedError,
  MongoshInvalidInputError,
  MongoshUnimplementedError,
} from '@mongosh/errors';
chai.use(sinonChai);
const { expect } = chai;

async function allItemsFromAsyncIterable<T>(
  iterable: AsyncIterable<T>
): Promise<T[]> {
  const list: T[] = [];
  for await (const item of iterable) list.push(item);
  return list;
}

describe('Cursor', function () {
  describe('help', function () {
    const apiClass = new Cursor(
      {
        _serviceProvider: { platform: 'CLI' },
      } as any,
      {} as any
    );
    it('calls help function', async function () {
      expect((await toShellResult(apiClass.help())).type).to.equal('Help');
      expect((await toShellResult(apiClass.help)).type).to.equal('Help');
    });
  });
  describe('signature', function () {
    it('signature for class correct', function () {
      expect(signatures.Cursor.type).to.equal('Cursor');
    });
    it('map signature', function () {
      expect(signatures.Cursor.attributes?.map).to.deep.equal({
        type: 'function',
        returnsPromise: false,
        deprecated: false,
        returnType: 'Cursor',
        platforms: ALL_PLATFORMS,
        topologies: ALL_TOPOLOGIES,
        apiVersions: ALL_API_VERSIONS,
        serverVersions: ALL_SERVER_VERSIONS,
        isDirectShellCommand: false,
        acceptsRawInput: false,
        shellCommandCompleter: undefined,
      });
    });
  });
  describe('instance', function () {
    let wrappee: ServiceProviderFindCursor;
    let cursor: Cursor;
    beforeEach(function () {
      wrappee = {
        map: sinon.spy(),
        closed: true,
        bufferedCount() {
          return 0;
        },
      } as Partial<ServiceProviderFindCursor> as ServiceProviderFindCursor;
      cursor = new Cursor(
        {
          _serviceProvider: { platform: 'CLI' },
          _displayBatchSize: () => 20,
        } as any,
        wrappee
      );
    });

    it('sets dynamic properties', async function () {
      expect((await toShellResult(cursor)).type).to.equal('Cursor');
      expect((await toShellResult(cursor._it())).type).to.equal(
        'CursorIterationResult'
      );
      expect((await toShellResult(cursor)).printable).to.deep.equal({
        documents: [],
        cursorHasMore: false,
      });
      expect((await toShellResult(cursor.help)).type).to.equal('Help');
    });

    it('map() returns a new cursor', function () {
      expect(cursor.map((doc) => doc)).to.equal(cursor);
    });
    it('pretty returns the same cursor', function () {
      expect(cursor.pretty()).to.equal(cursor);
    });

    it('has the correct metadata', function () {
      expect((cursor.collation as any).serverVersions).to.deep.equal([
        '3.4.0',
        ServerVersions.latest,
      ]);
    });
  });
  describe('Cursor Internals', function () {
    const mongo = {
      _displayBatchSize: () => 20,
    } as any;
    describe('#addOption', function () {
      let spCursor: StubbedInstance<ServiceProviderCursor>;
      let shellApiCursor: Cursor;

      beforeEach(function () {
        spCursor = stubInterface<ServiceProviderCursor>();
        shellApiCursor = new Cursor(mongo, spCursor);
      });

      it('fluidly adds the cursor flag', function () {
        expect(shellApiCursor.addOption(2)).to.equal(shellApiCursor);
        expect(spCursor.addCursorFlag).to.have.been.calledWith(
          'tailable',
          true
        );
      });

      it('throws if a SlaveOk flag passed', function () {
        try {
          shellApiCursor.addOption(4);
          expect.fail('expected error');
        } catch (e: any) {
          expect(e).to.be.instanceOf(MongoshUnimplementedError);
          expect(e.message).to.contain('the slaveOk option is not supported.');
          expect(e.code).to.equal(CommonErrors.NotImplemented);
        }
      });

      it('throws if an unknown flag passed', function () {
        try {
          shellApiCursor.addOption(123123);
          expect.fail('expected error');
        } catch (e: any) {
          expect(e).to.be.instanceOf(MongoshInvalidInputError);
          expect(e.message).to.contain('Unknown option flag number: 123123');
          expect(e.code).to.equal(CommonErrors.InvalidArgument);
        }
      });
    });

    describe('#allowPartialResults', function () {
      let spCursor: StubbedInstance<ServiceProviderCursor>;
      let shellApiCursor: Cursor;

      beforeEach(function () {
        spCursor = stubInterface<ServiceProviderCursor>();
        shellApiCursor = new Cursor(mongo, spCursor);
      });

      it('fluidly adds the cursor flag', function () {
        expect(shellApiCursor.allowPartialResults()).to.equal(shellApiCursor);
        expect(spCursor.addCursorFlag).to.have.been.calledWith('partial', true);
      });
    });

    describe('#allowDiskUse', function () {
      let spCursor: StubbedInstance<ServiceProviderCursor>;
      let shellApiCursor: Cursor;

      beforeEach(function () {
        spCursor = stubInterface<ServiceProviderCursor>();
        shellApiCursor = new Cursor(mongo, spCursor);
      });

      it('calls the driver method', function () {
        expect(shellApiCursor.allowDiskUse()).to.equal(shellApiCursor);
        expect(spCursor.allowDiskUse).to.have.been.calledWith();
      });

      it('calls the driver method for true', function () {
        expect(shellApiCursor.allowDiskUse(true)).to.equal(shellApiCursor);
        expect(spCursor.allowDiskUse).to.have.been.calledWith(true);
      });

      it('calls the driver method for false', function () {
        expect(shellApiCursor.allowDiskUse(false)).to.equal(shellApiCursor);
        expect(spCursor.allowDiskUse).to.have.been.calledWith(false);
      });
    });

    describe('#batchSize', function () {
      let spCursor: StubbedInstance<ServiceProviderCursor>;
      let shellApiCursor: Cursor;

      beforeEach(function () {
        spCursor = stubInterface<ServiceProviderCursor>();
        shellApiCursor = new Cursor(mongo, spCursor);
      });

      it('fluidly set the batch size', function () {
        expect(shellApiCursor.batchSize(5)).to.equal(shellApiCursor);
        expect(spCursor.batchSize).to.have.been.calledWith(5);
      });
    });

    describe('#close', function () {
      let spCursor: StubbedInstance<ServiceProviderCursor>;
      let shellApiCursor: Cursor;

      beforeEach(function () {
        spCursor = stubInterface<ServiceProviderCursor>();
        shellApiCursor = new Cursor(mongo, spCursor);
      });

      it('closes the cursor', async function () {
        await shellApiCursor.close();
        expect(spCursor.close).to.have.been.called;
      });
    });

    describe('#collation', function () {
      let spCursor: StubbedInstance<ServiceProviderCursor>;
      let shellApiCursor: Cursor;
      const coll = { locale: 'en' };

      beforeEach(function () {
        spCursor = stubInterface<ServiceProviderCursor>();
        spCursor.collation.withArgs(coll as any);
        shellApiCursor = new Cursor(mongo, spCursor);
      });

      it('fluidly sets the collation', function () {
        expect(shellApiCursor.collation(coll)).to.equal(shellApiCursor);
        expect(spCursor.collation).to.have.been.calledWith(coll);
      });
    });

    describe('#comment', function () {
      let spCursor: StubbedInstance<ServiceProviderCursor>;
      let shellApiCursor: Cursor;
      const cmt = 'hi';

      beforeEach(function () {
        spCursor = stubInterface<ServiceProviderCursor>();
        shellApiCursor = new Cursor(mongo, spCursor);
      });

      it('fluidly sets the comment', function () {
        expect(shellApiCursor.comment(cmt)).to.equal(shellApiCursor);
        expect(spCursor.comment).to.have.been.calledWith(cmt);
      });
    });

    describe('#count', function () {
      let spCursor: StubbedInstance<ServiceProviderCursor>;
      let shellApiCursor: Cursor;

      beforeEach(function () {
        spCursor = stubInterface<ServiceProviderCursor>();
        spCursor.count.resolves(5);
        shellApiCursor = new Cursor(mongo, spCursor);
      });

      it('fluidly sets the count', async function () {
        expect(await shellApiCursor.count()).to.equal(5);
        expect(spCursor.count).to.have.been.calledWith();
      });

      it('is aliased by size()', async function () {
        expect(await shellApiCursor.size()).to.equal(5);
        expect(spCursor.count).to.have.been.calledWith();
      });
    });

    describe('#hasNext', function () {
      let spCursor: StubbedInstance<ServiceProviderCursor>;
      let shellApiCursor: Cursor;

      beforeEach(function () {
        spCursor = stubInterface<ServiceProviderCursor>();
        shellApiCursor = new Cursor(mongo, spCursor);
        spCursor.hasNext.resolves(true);
      });

      it('returns the cursor hasNext value', async function () {
        expect(await shellApiCursor.hasNext()).to.equal(true);
        expect(spCursor.hasNext).to.have.been.calledWith();
      });
    });

    describe('#tryNext', function () {
      let spCursor: StubbedInstance<ServiceProviderCursor>;
      let shellApiCursor: Cursor;

      beforeEach(function () {
        spCursor = stubInterface<ServiceProviderCursor>();
        shellApiCursor = new Cursor(mongo, spCursor);
        spCursor.tryNext.resolves({ doc: 1 });
      });

      it('returns the cursor hasNext value', async function () {
        expect(await shellApiCursor.tryNext()).to.deep.equal({ doc: 1 });
        expect(spCursor.tryNext).to.have.been.calledWith();
      });
    });

    describe('#isExhausted', function () {
      let spCursor: any;
      let shellApiCursor: Cursor;

      [
        // hasNext, isClosed, expected
        [1, true, false],
        [1, false, false],
        [0, true, true],
        [0, false, false],
      ].forEach(([buffCount, isClosed, expected]) => {
        context(
          `when cursor.objsLeftInBatch is ${buffCount} and cursor.isClosed is ${isClosed}`,
          function () {
            beforeEach(function () {
              // NOTE: have to use proxy bc can't stub readonly attributes like closed
              spCursor = new Proxy({} as ServiceProviderCursor, {
                get: (target, prop): any => {
                  if (prop === 'closed') {
                    return isClosed;
                  }
                  if (prop === 'bufferedCount') {
                    return () => buffCount;
                  }
                  return (target as any).prop;
                },
              });
              shellApiCursor = new Cursor(mongo, spCursor);
            });

            it(`returns ${expected}`, function () {
              expect(shellApiCursor.isExhausted()).to.equal(expected);
            });
          }
        );
      });
    });

    describe('#hint', function () {
      let spCursor: StubbedInstance<ServiceProviderCursor>;
      let shellApiCursor: Cursor;
      const index = 'a_1';

      beforeEach(function () {
        spCursor = stubInterface<ServiceProviderCursor>();
        shellApiCursor = new Cursor(mongo, spCursor);
      });

      it('fluidly sets hint', function () {
        expect(shellApiCursor.hint(index)).to.equal(shellApiCursor);
        expect(spCursor.hint).to.have.been.calledWith(index);
      });
    });

    describe('#limit', function () {
      let spCursor: StubbedInstance<ServiceProviderCursor>;
      let shellApiCursor: Cursor;
      const value = 6;

      beforeEach(function () {
        spCursor = stubInterface<ServiceProviderCursor>();
        shellApiCursor = new Cursor(mongo, spCursor);
      });

      it('fluidly sets limit', function () {
        expect(shellApiCursor.limit(value)).to.equal(shellApiCursor);
        expect(spCursor.limit).to.have.been.calledWith(value);
      });
    });

    describe('#max', function () {
      let spCursor: StubbedInstance<ServiceProviderCursor>;
      let shellApiCursor: Cursor;
      const value = { a: 1 };

      beforeEach(function () {
        spCursor = stubInterface<ServiceProviderCursor>();
        shellApiCursor = new Cursor(mongo, spCursor);
      });

      it('fluidly sets max', function () {
        expect(shellApiCursor.max(value)).to.equal(shellApiCursor);
        expect(spCursor.max).to.have.been.calledWith(value);
      });
    });

    describe('#maxTimeMS', function () {
      let spCursor: StubbedInstance<ServiceProviderCursor>;
      let shellApiCursor: Cursor;
      const value = 5000;

      beforeEach(function () {
        spCursor = stubInterface<ServiceProviderCursor>();
        shellApiCursor = new Cursor(mongo, spCursor);
      });

      it('fluidly sets maxTimeMS', function () {
        expect(shellApiCursor.maxTimeMS(value)).to.equal(shellApiCursor);
        expect(spCursor.maxTimeMS).to.have.been.calledWith(value);
      });
    });

    describe('#maxAwaitTimeMS', function () {
      let spCursor: StubbedInstance<ServiceProviderCursor>;
      let shellApiCursor: Cursor;
      const value = 5000;

      beforeEach(function () {
        spCursor = stubInterface<ServiceProviderCursor>();
        shellApiCursor = new Cursor(mongo, spCursor);
      });

      it('fluidly sets maxAwaitTimeMS', function () {
        expect(shellApiCursor.maxAwaitTimeMS(value)).to.equal(shellApiCursor);
        expect(spCursor.maxAwaitTimeMS).to.have.been.calledWith(value);
      });
    });

    describe('#min', function () {
      let spCursor: StubbedInstance<ServiceProviderCursor>;
      let shellApiCursor: Cursor;
      const value = { a: 1 };

      beforeEach(function () {
        spCursor = stubInterface<ServiceProviderCursor>();
        shellApiCursor = new Cursor(mongo, spCursor);
      });

      it('fluidly sets min', function () {
        expect(shellApiCursor.min(value)).to.equal(shellApiCursor);
        expect(spCursor.min).to.have.been.calledWith(value);
      });
    });

    describe('#noCursorTimeout', function () {
      let spCursor: StubbedInstance<ServiceProviderCursor>;
      let shellApiCursor: Cursor;

      beforeEach(function () {
        spCursor = stubInterface<ServiceProviderCursor>();
        shellApiCursor = new Cursor(mongo, spCursor);
      });

      it('fluidly adds the cursor flag', function () {
        expect(shellApiCursor.noCursorTimeout()).to.equal(shellApiCursor);
        expect(spCursor.addCursorFlag).to.have.been.calledWith(
          'noCursorTimeout',
          true
        );
      });
    });

    describe('#oplogReplay', function () {
      let spCursor: StubbedInstance<ServiceProviderCursor>;
      let shellApiCursor: Cursor;

      beforeEach(function () {
        spCursor = stubInterface<ServiceProviderCursor>();
        shellApiCursor = new Cursor(mongo, spCursor);
      });

      it('fluidly adds the cursor flag', function () {
        expect(shellApiCursor.oplogReplay()).to.equal(shellApiCursor);
        expect(spCursor.addCursorFlag).to.have.been.calledWith(
          'oplogReplay',
          true
        );
      });
    });

    describe('#projection', function () {
      let spCursor: StubbedInstance<ServiceProviderCursor>;
      let shellApiCursor: Cursor;
      const value = { a: 1 };

      beforeEach(function () {
        spCursor = stubInterface<ServiceProviderCursor>();
        shellApiCursor = new Cursor(mongo, spCursor);
      });

      it('fluidly sets projection', function () {
        expect(shellApiCursor.projection(value)).to.equal(shellApiCursor);
        expect(spCursor.project).to.have.been.calledWith(value);
      });
    });

    describe('#readPref', function () {
      let spCursor: StubbedInstance<ServiceProviderCursor>;
      let shellApiCursor: Cursor;
      let fromOptionsStub;
      const value = 'primary';
      const tagSet = [{ nodeType: 'ANALYTICS' }];

      beforeEach(function () {
        spCursor = stubInterface<ServiceProviderCursor>();
        shellApiCursor = new Cursor(mongo, spCursor);
        fromOptionsStub = sinon.stub();
        fromOptionsStub.callsFake((input) => input);
        mongo._serviceProvider = {
          readPreferenceFromOptions: fromOptionsStub,
        };
      });

      it('fluidly sets the read preference', function () {
        expect(shellApiCursor.readPref(value)).to.equal(shellApiCursor);
        expect(spCursor.withReadPreference).to.have.been.calledWith(value);
      });

      it('fluidly sets the read preference with tagSet and hedge options', function () {
        expect(
          shellApiCursor.readPref(value, tagSet, { enabled: true })
        ).to.equal(shellApiCursor);
        expect(spCursor.withReadPreference).to.have.been.calledWith({
          readPreference: value,
          readPreferenceTags: tagSet,
          hedge: { enabled: true },
        });
      });
    });

    describe('#readConcern', function () {
      let spCursor: StubbedInstance<ServiceProviderCursor>;
      let shellApiCursor: Cursor;
      const value = 'local';

      beforeEach(function () {
        spCursor = stubInterface<ServiceProviderCursor>();
        shellApiCursor = new Cursor(mongo, spCursor);
      });

      it('fluidly sets the read concern', function () {
        expect(shellApiCursor.readConcern(value)).to.equal(shellApiCursor);
        expect(spCursor.withReadConcern).to.have.been.calledWith({
          level: value,
        });
      });
    });

    describe('#returnKey', function () {
      let spCursor: StubbedInstance<ServiceProviderCursor>;
      let shellApiCursor: Cursor;
      const value = true;

      beforeEach(function () {
        spCursor = stubInterface<ServiceProviderCursor>();
        shellApiCursor = new Cursor(mongo, spCursor);
      });

      it('fluidly sets the return key value', function () {
        expect(shellApiCursor.returnKey(value)).to.equal(shellApiCursor);
        expect(spCursor.returnKey).to.have.been.calledWith(value);
      });
    });

    describe('#showRecordId', function () {
      let spCursor: StubbedInstance<ServiceProviderCursor>;
      let shellApiCursor: Cursor;
      const value = true;

      beforeEach(function () {
        spCursor = stubInterface<ServiceProviderCursor>();
        shellApiCursor = new Cursor(mongo, spCursor);
      });

      it('fluidly sets the return key value', function () {
        expect(shellApiCursor.showRecordId()).to.equal(shellApiCursor);
        expect(spCursor.showRecordId).to.have.been.calledWith(value);
      });
    });

    describe('#objsLeftInBatch', function () {
      let spCursor: StubbedInstance<ServiceProviderCursor>;
      let shellApiCursor: Cursor;

      beforeEach(function () {
        spCursor = stubInterface<ServiceProviderCursor>();
        spCursor.bufferedCount.returns(100);
        shellApiCursor = new Cursor(mongo, spCursor);
      });

      it('returns the count', function () {
        expect(shellApiCursor.objsLeftInBatch()).to.equal(100);
        expect(spCursor.bufferedCount).to.have.been.calledWith();
      });
    });

    describe('#skip', function () {
      let spCursor: StubbedInstance<ServiceProviderCursor>;
      let shellApiCursor: Cursor;
      const value = 6;

      beforeEach(function () {
        spCursor = stubInterface<ServiceProviderCursor>();
        shellApiCursor = new Cursor(mongo, spCursor);
      });

      it('fluidly sets skip', function () {
        expect(shellApiCursor.skip(value)).to.equal(shellApiCursor);
        expect(spCursor.skip).to.have.been.calledWith(value);
      });
    });

    describe('#sort', function () {
      let spCursor: StubbedInstance<ServiceProviderCursor>;
      let shellApiCursor: Cursor;
      const value = { a: 1 };

      beforeEach(function () {
        spCursor = stubInterface<ServiceProviderCursor>();
        shellApiCursor = new Cursor(mongo, spCursor);
      });

      it('fluidly sets sort', function () {
        expect(shellApiCursor.sort(value)).to.equal(shellApiCursor);
        expect(spCursor.sort).to.have.been.calledWith(value);
      });
    });

    describe('#tailable', function () {
      let spCursor: StubbedInstance<ServiceProviderCursor>;
      let shellApiCursor: Cursor;

      beforeEach(function () {
        spCursor = stubInterface<ServiceProviderCursor>();
        shellApiCursor = new Cursor(mongo, spCursor);
      });

      it('fluidly adds the cursor flag', function () {
        expect(shellApiCursor.tailable()).to.equal(shellApiCursor);
        expect(spCursor.addCursorFlag).to.have.been.calledWith(
          'tailable',
          true
        );
      });

      it('fluidly adds the awaitData flag', function () {
        expect(shellApiCursor.tailable({ awaitData: true })).to.equal(
          shellApiCursor
        );
        expect(spCursor.addCursorFlag).to.have.been.calledWith(
          'tailable',
          true
        );
        expect(spCursor.addCursorFlag).to.have.been.calledWith(
          'awaitData',
          true
        );
      });
    });

    describe('#itcount', function () {
      let spCursor: StubbedInstance<ServiceProviderCursor>;
      let shellApiCursor: Cursor;

      beforeEach(function () {
        spCursor = stubInterface<ServiceProviderCursor>();
        shellApiCursor = new Cursor(mongo, spCursor);
      });

      it('returns the iteration count', async function () {
        spCursor.tryNext.onCall(0).resolves(true);
        spCursor.tryNext.onCall(1).resolves(true);
        spCursor.tryNext.onCall(2).resolves(null);

        expect(await shellApiCursor.itcount()).to.equal(2);
      });
    });

    describe('#explain', function () {
      let nativeCursorStub: StubbedInstance<ServiceProviderCursor>;
      let shellApiCursor: Cursor;

      beforeEach(function () {
        nativeCursorStub = stubInterface<ServiceProviderCursor>();
        shellApiCursor = new Cursor(mongo, nativeCursorStub);
      });

      it('calls explain on the cursor', async function () {
        nativeCursorStub.explain.resolves({
          queryPlanner: {},
          executionStats: {
            allPlansExecution: [],
          },
          serverInfo: {},
          ok: 1,
        });

        const explained = await shellApiCursor.explain();
        expect((await toShellResult(explained)).type).to.equal('ExplainOutput');
        expect(nativeCursorStub.explain).to.have.been.calledWith();
      });

      it('does not throw if executionStats is missing', async function () {
        nativeCursorStub.explain.resolves({
          queryPlanner: {},
          serverInfo: {},
          ok: 1,
        });

        await shellApiCursor.explain();
      });

      context('with empty verbosity', function () {
        it('filters out executionStats', async function () {
          nativeCursorStub.explain.resolves({
            queryPlanner: {},
            executionStats: {
              allPlansExecution: [],
            },
            serverInfo: {},
            ok: 1,
          });
          expect(await shellApiCursor.explain()).to.deep.equal({
            queryPlanner: {},
            serverInfo: {},
            ok: 1,
          });
        });
      });

      context('with verbosity = queryPlanner', function () {
        it('filters out executionStats', async function () {
          nativeCursorStub.explain.resolves({
            queryPlanner: {},
            executionStats: {
              allPlansExecution: [],
            },
            serverInfo: {},
            ok: 1,
          });
          expect(await shellApiCursor.explain('queryPlanner')).to.deep.equal({
            queryPlanner: {},
            serverInfo: {},
            ok: 1,
          });
        });
      });

      context('with verbosity = executionStats', function () {
        it('filters out allPlansExecution', async function () {
          nativeCursorStub.explain.resolves({
            queryPlanner: {},
            executionStats: {
              allPlansExecution: [],
            },
            serverInfo: {},
            ok: 1,
          });
          expect(await shellApiCursor.explain('executionStats')).to.deep.equal({
            queryPlanner: {},
            executionStats: {},
            serverInfo: {},
            ok: 1,
          });
        });
      });

      context('with verbosity = allPlansExecution', function () {
        it('returns everything', async function () {
          nativeCursorStub.explain.resolves({
            queryPlanner: {},
            executionStats: {
              allPlansExecution: [],
            },
            serverInfo: {},
            ok: 1,
          });
          expect(
            await shellApiCursor.explain('allPlansExecution')
          ).to.deep.equal({
            queryPlanner: {},
            executionStats: {
              allPlansExecution: [],
            },
            serverInfo: {},
            ok: 1,
          });
        });
      });
    });

    describe('#toJSON', function () {
      let spCursor: StubbedInstance<ServiceProviderCursor>;
      let shellApiCursor: Cursor;

      beforeEach(function () {
        spCursor = stubInterface<ServiceProviderCursor>();
        shellApiCursor = new Cursor(mongo, spCursor);
      });

      it('throws with the .toArray() suggestion', function () {
        try {
          JSON.stringify(shellApiCursor);
          expect.fail('expected error');
        } catch (e: any) {
          expect(e).to.be.instanceOf(MongoshInvalidInputError);
          expect(e.message).to.contain(
            'Cannot serialize a cursor to JSON. Did you mean to call .toArray() first?'
          );
          expect(e.code).to.equal(CommonErrors.InvalidArgument);
        }
      });
    });

    describe('#maxScan', function () {
      let spCursor: StubbedInstance<ServiceProviderCursor>;
      let shellApiCursor: Cursor;

      beforeEach(function () {
        spCursor = stubInterface<ServiceProviderCursor>();
        shellApiCursor = new Cursor(mongo, spCursor);
      });

      it('throws a helpful exception regarding its removal', function () {
        try {
          shellApiCursor.maxScan();
          expect.fail('expected error');
        } catch (e: any) {
          expect(e).to.be.instanceOf(MongoshDeprecatedError);
          expect(e.message).to.contain(
            '`maxScan()` was removed because it was deprecated in MongoDB 4.0'
          );
        }
      });
    });

    describe('toShellResult', function () {
      let shellApiCursor: Cursor;
      let i: number;

      beforeEach(function () {
        i = 0;
        // NOTE: Have to use proxy bc can't stub readonly inherited property
        const proxyCursor = new Proxy({} as ServiceProviderCursor, {
          get: (target, prop): any => {
            if (prop === 'closed') {
              return false;
            }
            if (prop === 'tryNext') {
              return () => Promise.resolve({ key: i++ });
            }
            if (prop === 'batchSize') {
              return () => {};
            }
            return (target as any)[prop];
          },
        });
        shellApiCursor = new Cursor(mongo, proxyCursor);
      });

      it('is idempotent unless iterated', async function () {
        const result1 = (await toShellResult(shellApiCursor)).printable;
        const result2 = (await toShellResult(shellApiCursor)).printable;
        expect(result1).to.deep.equal(result2);
        expect(i).to.equal(20);
        await shellApiCursor._it();
        const result3 = (await toShellResult(shellApiCursor)).printable;
        expect(result1).to.not.deep.equal(result3);
        expect(i).to.equal(40);
      });

      it('.batchSize() does not control the output length', async function () {
        shellApiCursor.batchSize(10);
        const result = (await toShellResult(shellApiCursor)).printable;
        expect(i).to.equal(20);
        expect(result).to.have.nested.property('documents.length', 20);
      });
    });

    describe('#toArray', function () {
      let spCursor: StubbedInstance<ServiceProviderCursor>;
      let shellApiCursor: Cursor;

      beforeEach(function () {
        spCursor = stubInterface<ServiceProviderCursor>();
        shellApiCursor = new Cursor(mongo, spCursor);
      });

      it('delegates to the underlying cursor if no transform method was specified', async function () {
        const docs = [{ a: 1 }, { a: 2 }, { a: 3 }];
        spCursor.toArray.resolves(docs);
        const result = await shellApiCursor.toArray();
        expect(result).to.deep.equal(docs);
        expect(spCursor.tryNext).to.not.have.been.called;
      });

      it('performs manual iteration if a transform method was specified', async function () {
        const docs = [{ a: 1 }, { a: 2 }, { a: 3 }, null];
        spCursor.tryNext.callsFake(() => Promise.resolve(docs.shift()));
        shellApiCursor.map(({ a }) => ({ b: a }));
        const result = await shellApiCursor.toArray();
        expect(result).to.deep.equal([{ b: 1 }, { b: 2 }, { b: 3 }]);
        expect(spCursor.toArray).to.not.have.been.called;
      });
    });

    describe('#async iteration', function () {
      let spCursor: StubbedInstance<ServiceProviderCursor>;
      let shellApiCursor: Cursor;

      beforeEach(function () {
        spCursor = stubInterface<ServiceProviderCursor>();
        shellApiCursor = new Cursor(mongo, spCursor);
      });

      it('delegates to the underlying cursor if no transform method was specified', async function () {
        const docs = [{ a: 1 }, { a: 2 }, { a: 3 }];
        // eslint-disable-next-line @typescript-eslint/require-await
        spCursor[Symbol.asyncIterator].callsFake(async function* () {
          yield* docs;
        });
        const result = await allItemsFromAsyncIterable(shellApiCursor);
        expect(result).to.deep.equal(docs);
        expect(spCursor.tryNext).to.not.have.been.called;
      });

      it('performs manual iteration if a transform method was specified', async function () {
        const docs = [{ a: 1 }, { a: 2 }, { a: 3 }, null];
        spCursor.tryNext.callsFake(() => Promise.resolve(docs.shift()));
        shellApiCursor.map(({ a }) => ({ b: a }));
        const result = await allItemsFromAsyncIterable(shellApiCursor);
        expect(result).to.deep.equal([{ b: 1 }, { b: 2 }, { b: 3 }]);
        expect(spCursor[Symbol.asyncIterator]).to.not.have.been.called;
      });
    });
  });
});
