import { expect } from 'chai';
import type { StubbedInstance } from 'ts-sinon';
import { stubInterface } from 'ts-sinon';
import { signatures, toShellResult } from './index';
import AggregationCursor from './aggregation-cursor';
import {
  ALL_PLATFORMS,
  ALL_SERVER_VERSIONS,
  ALL_TOPOLOGIES,
  ALL_API_VERSIONS,
} from './enums';
import type {
  ServiceProviderAggregationCursor,
  AggregationCursor as SPAggregationCursor,
} from '@mongosh/service-provider-core';

describe('AggregationCursor', function () {
  describe('help', function () {
    const apiClass = new AggregationCursor(
      {
        _serviceProvider: { platform: 'CLI' },
      } as any,
      {} as SPAggregationCursor
    );
    it('calls help function', async function () {
      expect((await toShellResult(apiClass.help())).type).to.equal('Help');
      expect((await toShellResult(apiClass.help)).type).to.equal('Help');
    });
  });
  describe('signature', function () {
    it('signature for class correct', function () {
      expect(signatures.AggregationCursor.type).to.equal('AggregationCursor');
    });
    it('map signature', function () {
      expect(signatures.AggregationCursor.attributes?.map).to.deep.equal({
        type: 'function',
        returnsPromise: false,
        deprecated: false,
        inherited: true,
        returnType: 'AggregationCursor',
        platforms: ALL_PLATFORMS,
        topologies: ALL_TOPOLOGIES,
        apiVersions: ALL_API_VERSIONS,
        serverVersions: ALL_SERVER_VERSIONS,
        isDirectShellCommand: false,
        acceptsRawInput: false,
        shellCommandCompleter: undefined,
        newShellCommandCompleter: undefined,
      });
    });
  });
  describe('instance', function () {
    let wrappee: ServiceProviderAggregationCursor;
    let cursor: AggregationCursor;
    beforeEach(function () {
      wrappee = {
        closed: true,
        bufferedCount() {
          return 0;
        },
      } as ServiceProviderAggregationCursor;
      cursor = new AggregationCursor(
        {
          _serviceProvider: { platform: 'CLI' },
          _displayBatchSize: () => 20,
        } as any,
        wrappee
      );
    });

    it('sets dynamic properties', async function () {
      expect((await toShellResult(cursor)).type).to.equal('AggregationCursor');
      expect((await toShellResult(cursor._it())).type).to.equal(
        'CursorIterationResult'
      );
      expect((await toShellResult(cursor)).printable).to.deep.equal({
        documents: [],
        cursorHasMore: false,
      });
      expect((await toShellResult(cursor.help)).type).to.equal('Help');
    });

    it('returns the same cursor', function () {
      expect(cursor.map((doc) => doc)).to.equal(cursor);
    });
    it('pretty returns the same cursor', function () {
      expect(cursor.pretty()).to.equal(cursor);
    });
  });

  describe('Cursor Internals', function () {
    const mongo = {
      _displayBatchSize: () => 20,
    } as any;
    describe('#close', function () {
      let spCursor: StubbedInstance<SPAggregationCursor>;
      let shellApiCursor: AggregationCursor;

      beforeEach(function () {
        spCursor = stubInterface<SPAggregationCursor>();
        shellApiCursor = new AggregationCursor(mongo, spCursor);
      });

      it('closes the cursor', async function () {
        await shellApiCursor.close();
        expect(spCursor.close).to.have.been.called;
      });
    });

    describe('#hasNext', function () {
      let spCursor: StubbedInstance<SPAggregationCursor>;
      let shellApiCursor: AggregationCursor;

      beforeEach(function () {
        spCursor = stubInterface<SPAggregationCursor>();
        shellApiCursor = new AggregationCursor(mongo, spCursor);
        spCursor.hasNext.resolves(true);
      });

      it('returns the cursor hasNext value', async function () {
        expect(await shellApiCursor.hasNext()).to.equal(true);
        expect(spCursor.hasNext).to.have.been.calledWith();
      });
    });

    describe('#tryNext', function () {
      let spCursor: StubbedInstance<SPAggregationCursor>;
      let shellApiCursor: AggregationCursor;

      beforeEach(function () {
        spCursor = stubInterface<SPAggregationCursor>();
        shellApiCursor = new AggregationCursor(mongo, spCursor);
        spCursor.tryNext.resolves({ doc: 1 });
      });

      it('returns the cursor hasNext value', async function () {
        expect(await shellApiCursor.tryNext()).to.deep.equal({ doc: 1 });
        expect(spCursor.tryNext).to.have.been.calledWith();
      });
    });

    describe('#isExhausted', function () {
      let spCursor: any;
      let shellApiCursor: AggregationCursor;

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
              spCursor = new Proxy({} as SPAggregationCursor, {
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
              shellApiCursor = new AggregationCursor(mongo, spCursor);
            });

            it(`returns ${expected}`, function () {
              expect(shellApiCursor.isExhausted()).to.equal(expected);
            });
          }
        );
      });
    });

    describe('#objsLeftInBatch', function () {
      let spCursor: StubbedInstance<SPAggregationCursor>;
      let shellApiCursor: AggregationCursor;

      beforeEach(function () {
        spCursor = stubInterface<SPAggregationCursor>();
        spCursor.bufferedCount.returns(100);
        shellApiCursor = new AggregationCursor(mongo, spCursor);
      });

      it('returns the count', function () {
        expect(shellApiCursor.objsLeftInBatch()).to.equal(100);
        expect(spCursor.bufferedCount).to.have.been.calledWith();
      });
    });

    describe('#itcount', function () {
      let spCursor: StubbedInstance<SPAggregationCursor>;
      let shellApiCursor: AggregationCursor;

      beforeEach(function () {
        spCursor = stubInterface<SPAggregationCursor>();
        shellApiCursor = new AggregationCursor(mongo, spCursor);
      });

      it('returns the iteration count', async function () {
        spCursor.tryNext.onCall(0).resolves(true);
        spCursor.tryNext.onCall(1).resolves(true);
        spCursor.tryNext.onCall(2).resolves(null);

        expect(await shellApiCursor.itcount()).to.equal(2);
      });
    });

    describe('#explain', function () {
      let spCursor: StubbedInstance<SPAggregationCursor>;
      let shellApiCursor: AggregationCursor;

      beforeEach(function () {
        spCursor = stubInterface<SPAggregationCursor>();
        shellApiCursor = new AggregationCursor(mongo, spCursor);
        spCursor.explain.resolves({ ok: 1 });
      });

      it('returns an ExplainOutput object', async function () {
        const explained = await shellApiCursor.explain();
        expect(spCursor.explain).to.have.been.calledWith();
        expect((await toShellResult(explained)).type).to.equal('ExplainOutput');
        expect((await toShellResult(explained)).printable).to.deep.equal({
          ok: 1,
        });
      });
    });

    describe('toShellResult', function () {
      let shellApiCursor: AggregationCursor;
      let i: number;
      let batchSize: number | undefined;

      beforeEach(function () {
        i = 0;
        // NOTE: Have to use proxy bc can't stub readonly inherited property
        const proxyCursor = new Proxy({} as SPAggregationCursor, {
          get: (target, prop): any => {
            if (prop === 'closed') {
              return false;
            }
            if (prop === 'tryNext') {
              return () => Promise.resolve({ key: i++ });
            }
            if (prop === 'batchSize') {
              return (size: number) => {
                batchSize = size;
              };
            }
            return (target as any)[prop];
          },
        });
        shellApiCursor = new AggregationCursor(mongo, proxyCursor);
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
        expect(batchSize).to.equal(10);
        expect(result).to.have.nested.property('documents.length', 20);
      });
    });
  });
});
