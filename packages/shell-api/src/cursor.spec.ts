import { signatures, toShellResult } from './index';
import Cursor from './cursor';
import { Cursor as ServiceProviderCursor } from 'mongodb';
import { CursorFlag, ReplPlatform } from '@mongosh/service-provider-core';
import { ALL_PLATFORMS, ALL_SERVER_VERSIONS, ALL_TOPOLOGIES, ServerVersions } from './enums';
import sinon, { SinonStubbedInstance } from 'sinon';
import chai from 'chai';
import sinonChai from 'sinon-chai';
chai.use(sinonChai);
const { expect } = chai;

describe('Cursor', () => {
  describe('help', () => {
    const apiClass = new Cursor({
      _serviceProvider: { platform: ReplPlatform.CLI }
    } as any, {} as any);
    it('calls help function', async() => {
      expect((await toShellResult(apiClass.help())).type).to.equal('Help');
      expect((await toShellResult(apiClass.help)).type).to.equal('Help');
    });
  });
  describe('signature', () => {
    it('signature for class correct', () => {
      expect(signatures.Cursor.type).to.equal('Cursor');
      expect(signatures.Cursor.hasAsyncChild).to.equal(true);
    });
    it('map signature', () => {
      expect(signatures.Cursor.attributes.map).to.deep.equal({
        type: 'function',
        returnsPromise: false,
        returnType: 'Cursor',
        platforms: ALL_PLATFORMS,
        topologies: ALL_TOPOLOGIES,
        serverVersions: ALL_SERVER_VERSIONS
      });
    });
  });
  describe('instance', () => {
    let wrappee;
    let cursor;
    beforeEach(() => {
      wrappee = {
        map: sinon.spy(),
        isClosed: (): boolean => true
      };
      cursor = new Cursor({
        _serviceProvider: { platform: ReplPlatform.CLI }
      } as any, wrappee);
    });

    it('sets dynamic properties', async() => {
      expect((await toShellResult(cursor)).type).to.equal('Cursor');
      expect((await toShellResult(cursor._it())).type).to.equal('CursorIterationResult');
      expect((await toShellResult(cursor)).printable).to.deep.equal([]);
      expect((await toShellResult(cursor.help)).type).to.equal('Help');
    });

    it('map() returns a new cursor', () => {
      expect(cursor.map()).to.equal(cursor);
    });
    it('pretty returns the same cursor', () => {
      expect(cursor.pretty()).to.equal(cursor);
    });

    it('calls wrappee.map with arguments', () => {
      const arg = {};
      cursor.map(arg);
      expect(wrappee.map.calledWith(arg)).to.equal(true);
    });

    it('has the correct metadata', () => {
      expect(cursor.collation.serverVersions).to.deep.equal(['3.4.0', ServerVersions.latest]);
    });
  });
  describe('Cursor Internals', () => {
    const mongo = {} as any;
    describe('#addOption', () => {
      let spCursor: SinonStubbedInstance<ServiceProviderCursor>;
      let shellApiCursor;
      let mock;

      beforeEach(() => {
        mock = sinon.mock().withArgs(CursorFlag.Tailable, true);
        spCursor = sinon.createStubInstance(ServiceProviderCursor, {
          addCursorFlag: mock
        });
        shellApiCursor = new Cursor(mongo, spCursor);
      });

      it('fluidly adds the cursor flag', () => {
        expect(shellApiCursor.addOption(2)).to.equal(shellApiCursor);
        mock.verify();
      });

      it('throws if a SlaveOk flag passed', () => {
        expect(() => shellApiCursor.addOption(4)).to.throw('the slaveOk option is not yet supported.');
      });

      it('throws if an unknown flag passed', () => {
        expect(() => shellApiCursor.addOption(123123)).to.throw('Unknown option flag number: 123123');
      });
    });

    describe('#allowPartialResults', () => {
      let spCursor: SinonStubbedInstance<ServiceProviderCursor>;
      let shellApiCursor;
      let mock;

      beforeEach(() => {
        mock = sinon.mock().withArgs(CursorFlag.Partial, true);
        spCursor = sinon.createStubInstance(ServiceProviderCursor, {
          addCursorFlag: mock
        });
        shellApiCursor = new Cursor(mongo, spCursor);
      });

      it('fluidly adds the cursor flag', () => {
        expect(shellApiCursor.allowPartialResults()).to.equal(shellApiCursor);
        mock.verify();
      });
    });

    describe('#batchSize', () => {
      let spCursor: SinonStubbedInstance<ServiceProviderCursor>;
      let shellApiCursor;
      let mock;

      beforeEach(() => {
        mock = sinon.mock().withArgs(5);
        spCursor = sinon.createStubInstance(ServiceProviderCursor, {
          batchSize: mock
        });
        shellApiCursor = new Cursor(mongo, spCursor);
      });

      it('fluidly set the batch size', () => {
        expect(shellApiCursor.batchSize(5)).to.equal(shellApiCursor);
        mock.verify();
      });
    });

    describe('#close', () => {
      let spCursor: SinonStubbedInstance<ServiceProviderCursor>;
      let shellApiCursor;
      let mock;
      const options = { skipKillCursors: true };

      beforeEach(() => {
        mock = sinon.mock().withArgs(options);
        spCursor = sinon.createStubInstance(ServiceProviderCursor, {
          close: mock
        });
        shellApiCursor = new Cursor(mongo, spCursor);
      });

      it('closes the cursor', () => {
        shellApiCursor.close(options);
        mock.verify();
      });
    });

    describe('#collation', () => {
      let spCursor: SinonStubbedInstance<ServiceProviderCursor>;
      let shellApiCursor;
      let mock;
      const coll = { locale: 'en' };

      beforeEach(() => {
        mock = sinon.mock().withArgs(coll);
        spCursor = sinon.createStubInstance(ServiceProviderCursor, {
          collation: mock
        });
        shellApiCursor = new Cursor(mongo, spCursor);
      });

      it('fluidly sets the collation', () => {
        expect(shellApiCursor.collation(coll)).to.equal(shellApiCursor);
        mock.verify();
      });
    });

    describe('#comment', () => {
      let spCursor: SinonStubbedInstance<ServiceProviderCursor>;
      let shellApiCursor;
      let mock;
      const cmt = 'hi';

      beforeEach(() => {
        mock = sinon.mock().withArgs(cmt);
        spCursor = sinon.createStubInstance(ServiceProviderCursor, {
          comment: mock
        });
        shellApiCursor = new Cursor(mongo, spCursor);
      });

      it('fluidly sets the comment', () => {
        expect(shellApiCursor.comment(cmt)).to.equal(shellApiCursor);
        mock.verify();
      });
    });

    describe('#count', () => {
      let spCursor: SinonStubbedInstance<ServiceProviderCursor>;
      let shellApiCursor;
      let mock;

      beforeEach(() => {
        mock = sinon.mock().returns(Promise.resolve(5));
        spCursor = sinon.createStubInstance(ServiceProviderCursor, {
          count: mock
        });
        shellApiCursor = new Cursor(mongo, spCursor);
      });

      it('fluidly sets the comment', async() => {
        expect(await shellApiCursor.count()).to.equal(5);
        mock.verify();
      });
    });

    describe('#hasNext', () => {
      let spCursor: SinonStubbedInstance<ServiceProviderCursor>;
      let shellApiCursor;
      let mock;

      beforeEach(() => {
        mock = sinon.mock().returns(Promise.resolve(true));
        spCursor = sinon.createStubInstance(ServiceProviderCursor, {
          hasNext: mock
        });
        shellApiCursor = new Cursor(mongo, spCursor);
      });

      it('returns the cursor hasNext value', async() => {
        expect(await shellApiCursor.hasNext()).to.equal(true);
        mock.verify();
      });
    });

    describe('#isExhausted', () => {
      let spCursor: SinonStubbedInstance<ServiceProviderCursor>;
      let shellApiCursor: Cursor;
      let hasNextMock;
      let isClosedMock;

      beforeEach(() => {
        hasNextMock = sinon.mock();
        isClosedMock = sinon.mock();
        spCursor = sinon.createStubInstance(ServiceProviderCursor, {
          hasNext: hasNextMock,
          isClosed: isClosedMock
        });
        shellApiCursor = new Cursor(mongo, spCursor);
      });

      [ // hasNext, isClosed, expected
        [true, true, false],
        [true, false, false],
        [false, true, true],
        [false, false, false]
      ].forEach(([hasNext, isClosed, expected]) => {
        context(`when cursor.hasNext is ${hasNext} and cursor.isClosed is ${isClosed}`, () => {
          beforeEach(() => {
            hasNextMock.returns(Promise.resolve(hasNext));
            isClosedMock.returns(isClosed);
          });

          it(`returns ${expected}`, async() => {
            expect(await shellApiCursor.isExhausted()).to.equal(expected);
          });
        });
      });
    });

    describe('#hint', () => {
      let spCursor: SinonStubbedInstance<ServiceProviderCursor>;
      let shellApiCursor;
      let mock;
      const index = 'a_1';

      beforeEach(() => {
        mock = sinon.mock().withArgs(index);
        spCursor = sinon.createStubInstance(ServiceProviderCursor, {
          hint: mock
        });
        shellApiCursor = new Cursor(mongo, spCursor);
      });

      it('fluidly sets hint', () => {
        expect(shellApiCursor.hint(index)).to.equal(shellApiCursor);
        mock.verify();
      });
    });

    describe('#limit', () => {
      let spCursor: SinonStubbedInstance<ServiceProviderCursor>;
      let shellApiCursor;
      let mock;
      const value = 6;

      beforeEach(() => {
        mock = sinon.mock().withArgs(value);
        spCursor = sinon.createStubInstance(ServiceProviderCursor, {
          limit: mock
        });
        shellApiCursor = new Cursor(mongo, spCursor);
      });

      it('fluidly sets limit', () => {
        expect(shellApiCursor.limit(value)).to.equal(shellApiCursor);
        mock.verify();
      });
    });

    describe('#max', () => {
      let spCursor: SinonStubbedInstance<ServiceProviderCursor>;
      let shellApiCursor;
      let mock;
      const value = { a: 1 };

      beforeEach(() => {
        mock = sinon.mock().withArgs(value);
        spCursor = sinon.createStubInstance(ServiceProviderCursor, {
          max: mock
        });
        shellApiCursor = new Cursor(mongo, spCursor);
      });

      it('fluidly sets max', () => {
        expect(shellApiCursor.max(value)).to.equal(shellApiCursor);
        mock.verify();
      });
    });

    describe('#maxTimeMS', () => {
      let spCursor: SinonStubbedInstance<ServiceProviderCursor>;
      let shellApiCursor;
      let mock;
      const value = 5000;

      beforeEach(() => {
        mock = sinon.mock().withArgs(value);
        spCursor = sinon.createStubInstance(ServiceProviderCursor, {
          maxTimeMS: mock
        });
        shellApiCursor = new Cursor(mongo, spCursor);
      });

      it('fluidly sets maxTimeMS', () => {
        expect(shellApiCursor.maxTimeMS(value)).to.equal(shellApiCursor);
        mock.verify();
      });
    });

    describe('#maxAwaitTimeMS', () => {
      let spCursor: SinonStubbedInstance<ServiceProviderCursor>;
      let shellApiCursor;
      let mock;
      const value = 5000;

      beforeEach(() => {
        mock = sinon.mock().withArgs(value);
        spCursor = sinon.createStubInstance(ServiceProviderCursor, {
          maxAwaitTimeMS: mock
        });
        shellApiCursor = new Cursor(mongo, spCursor);
      });

      it('fluidly sets maxAwaitTimeMS', () => {
        expect(shellApiCursor.maxAwaitTimeMS(value)).to.equal(shellApiCursor);
        mock.verify();
      });
    });

    describe('#min', () => {
      let spCursor: SinonStubbedInstance<ServiceProviderCursor>;
      let shellApiCursor;
      let mock;
      const value = { a: 1 };

      beforeEach(() => {
        mock = sinon.mock().withArgs(value);
        spCursor = sinon.createStubInstance(ServiceProviderCursor, {
          min: mock
        });
        shellApiCursor = new Cursor(mongo, spCursor);
      });

      it('fluidly sets min', () => {
        expect(shellApiCursor.min(value)).to.equal(shellApiCursor);
        mock.verify();
      });
    });

    describe('#noCursorTimeout', () => {
      let spCursor: SinonStubbedInstance<ServiceProviderCursor>;
      let shellApiCursor;
      let mock;

      beforeEach(() => {
        mock = sinon.mock().withArgs(CursorFlag.NoTimeout, true);
        spCursor = sinon.createStubInstance(ServiceProviderCursor, {
          addCursorFlag: mock
        });
        shellApiCursor = new Cursor(mongo, spCursor);
      });

      it('fluidly adds the cursor flag', () => {
        expect(shellApiCursor.noCursorTimeout()).to.equal(shellApiCursor);
        mock.verify();
      });
    });

    describe('#oplogReplay', () => {
      let spCursor: SinonStubbedInstance<ServiceProviderCursor>;
      let shellApiCursor;
      let mock;

      beforeEach(() => {
        mock = sinon.mock().withArgs(CursorFlag.OplogReplay, true);
        spCursor = sinon.createStubInstance(ServiceProviderCursor, {
          addCursorFlag: mock
        });
        shellApiCursor = new Cursor(mongo, spCursor);
      });

      it('fluidly adds the cursor flag', () => {
        expect(shellApiCursor.oplogReplay()).to.equal(shellApiCursor);
        mock.verify();
      });
    });

    describe('#projection', () => {
      let spCursor: SinonStubbedInstance<ServiceProviderCursor>;
      let shellApiCursor;
      let mock;
      const value = { a: 1 };

      beforeEach(() => {
        mock = sinon.mock().withArgs(value);
        spCursor = sinon.createStubInstance(ServiceProviderCursor, {
          project: mock
        });
        shellApiCursor = new Cursor(mongo, spCursor);
      });

      it('fluidly sets projection', () => {
        expect(shellApiCursor.projection(value)).to.equal(shellApiCursor);
        mock.verify();
      });
    });

    describe('#readPref', () => {
      let spCursor: SinonStubbedInstance<ServiceProviderCursor>;
      let shellApiCursor;
      let mock;
      const value = 'primary';

      beforeEach(() => {
        mock = sinon.mock().withArgs(value);
        spCursor = sinon.createStubInstance(ServiceProviderCursor, {
          setReadPreference: mock
        });
        shellApiCursor = new Cursor(mongo, spCursor);
      });

      it('fluidly sets the read preference', () => {
        expect(shellApiCursor.readPref(value)).to.equal(shellApiCursor);
        mock.verify();
      });

      it('throws MongoshUnimplementedError if tagset is passed', () => {
        expect(() => shellApiCursor.readPref(value, [])).to.throw('the tagSet argument is not yet supported.');
      });
    });

    describe('#returnKey', () => {
      let spCursor: SinonStubbedInstance<ServiceProviderCursor>;
      let shellApiCursor;
      let mock;
      const value = true;

      beforeEach(() => {
        mock = sinon.mock().withArgs(value);
        spCursor = sinon.createStubInstance(ServiceProviderCursor, {
          returnKey: mock
        });
        shellApiCursor = new Cursor(mongo, spCursor);
      });

      it('fluidly sets the return key value', () => {
        expect(shellApiCursor.returnKey(value)).to.equal(shellApiCursor);
        mock.verify();
      });
    });

    describe('#showRecordId', () => {
      let spCursor: SinonStubbedInstance<ServiceProviderCursor>;
      let shellApiCursor;
      let mock;
      const value = true;

      beforeEach(() => {
        mock = sinon.mock().withArgs(value);
        spCursor = sinon.createStubInstance(ServiceProviderCursor, {
          showRecordId: mock
        });
        shellApiCursor = new Cursor(mongo, spCursor);
      });

      it('fluidly sets the return key value', () => {
        expect(shellApiCursor.showRecordId()).to.equal(shellApiCursor);
        mock.verify();
      });
    });

    describe('#objsLeftInBatch', () => {
      let spCursor: SinonStubbedInstance<ServiceProviderCursor>;
      let shellApiCursor;

      beforeEach(() => {
        spCursor = sinon.createStubInstance(ServiceProviderCursor, {
          bufferedCount: 100
        });
        shellApiCursor = new Cursor(mongo, spCursor);
      });

      it('returns the count', () => {
        expect(shellApiCursor.objsLeftInBatch()).to.equal(100);
      });
    });

    describe('#skip', () => {
      let spCursor: SinonStubbedInstance<ServiceProviderCursor>;
      let shellApiCursor;
      let mock;
      const value = 6;

      beforeEach(() => {
        mock = sinon.mock().withArgs(value);
        spCursor = sinon.createStubInstance(ServiceProviderCursor, {
          skip: mock
        });
        shellApiCursor = new Cursor(mongo, spCursor);
      });

      it('fluidly sets skip', () => {
        expect(shellApiCursor.skip(value)).to.equal(shellApiCursor);
        mock.verify();
      });
    });

    describe('#sort', () => {
      let spCursor: SinonStubbedInstance<ServiceProviderCursor>;
      let shellApiCursor;
      let mock;
      const value = { a: 1 };

      beforeEach(() => {
        mock = sinon.mock().withArgs(value);
        spCursor = sinon.createStubInstance(ServiceProviderCursor, {
          sort: mock
        });
        shellApiCursor = new Cursor(mongo, spCursor);
      });

      it('fluidly sets sort', () => {
        expect(shellApiCursor.sort(value)).to.equal(shellApiCursor);
        mock.verify();
      });
    });

    describe('#tailable', () => {
      let spCursor: SinonStubbedInstance<ServiceProviderCursor>;
      let shellApiCursor;
      let mock;

      beforeEach(() => {
        mock = sinon.mock().withArgs(CursorFlag.Tailable, true);
        spCursor = sinon.createStubInstance(ServiceProviderCursor, {
          addCursorFlag: mock
        });
        shellApiCursor = new Cursor(mongo, spCursor);
      });

      it('fluidly adds the cursor flag', () => {
        expect(shellApiCursor.tailable()).to.equal(shellApiCursor);
        mock.verify();
      });
    });

    describe('#itcount', () => {
      let spCursor: SinonStubbedInstance<ServiceProviderCursor>;
      let shellApiCursor;

      beforeEach(() => {
        spCursor = sinon.createStubInstance(ServiceProviderCursor);
        shellApiCursor = new Cursor(mongo, spCursor);
      });

      it('returns the iteration count', async() => {
        spCursor.hasNext.onCall(0).resolves(true);
        spCursor.hasNext.onCall(1).resolves(true);
        spCursor.hasNext.onCall(2).resolves(false);
        spCursor.next.resolves({});

        expect(await shellApiCursor.itcount()).to.equal(2);
      });
    });

    describe('#explain', () => {
      let nativeCursorStub;
      let shellApiCursor;
      let mock;

      beforeEach(() => {
        mock = sinon.mock().resolves({
          queryPlanner: { },
          executionStats: {
            allPlansExecution: [ ]
          },
          serverInfo: { },
          ok: 1
        });

        nativeCursorStub = sinon.createStubInstance(ServiceProviderCursor, {
          explain: mock
        });

        shellApiCursor = new Cursor(mongo, nativeCursorStub);
      });

      it('calls explain on the cursor', async() => {
        await shellApiCursor.explain();
        mock.verify();
      });

      it('does not throw if executionStats is missing', async() => {
        mock.resolves({
          queryPlanner: { },
          serverInfo: { },
          ok: 1
        });

        await shellApiCursor.explain();
      });

      context('with empty verbosity', () => {
        it('filters out executionStats', async() => {
          expect(await shellApiCursor.explain()).to.deep.equal({
            queryPlanner: { },
            serverInfo: { },
            ok: 1
          });
        });
      });

      context('with verbosity = queryPlanner', () => {
        it('filters out executionStats', async() => {
          expect(await shellApiCursor.explain('queryPlanner')).to.deep.equal({
            queryPlanner: { },
            serverInfo: { },
            ok: 1
          });
        });
      });

      context('with verbosity = executionStats', () => {
        it('filters out allPlansExecution', async() => {
          expect(await shellApiCursor.explain('executionStats')).to.deep.equal({
            queryPlanner: { },
            executionStats: { },
            serverInfo: { },
            ok: 1
          });
        });
      });

      context('with verbosity = allPlansExecution', () => {
        it('returns everything', async() => {
          expect(await shellApiCursor.explain('allPlansExecution')).to.deep.equal({
            queryPlanner: { },
            executionStats: {
              allPlansExecution: [ ]
            },
            serverInfo: { },
            ok: 1
          });
        });
      });
    });

    describe('#maxScan', () => {
      let spCursor: SinonStubbedInstance<ServiceProviderCursor>;
      let shellApiCursor;

      beforeEach(() => {
        spCursor = sinon.createStubInstance(ServiceProviderCursor);
        shellApiCursor = new Cursor(mongo, spCursor);
      });

      it('throws a helpful exception regarding its removal', () => {
        expect(() => shellApiCursor.maxScan()).to.throw(
          '`maxScan()` was removed because it was deprecated in MongoDB 4.0');
      });
    });

    describe('toShellResult', () => {
      let spCursor: SinonStubbedInstance<ServiceProviderCursor>;
      let shellApiCursor;

      beforeEach(() => {
        let i = 0;
        spCursor = sinon.createStubInstance(ServiceProviderCursor, {
          hasNext: sinon.stub().resolves(true),
          next: sinon.stub().callsFake(async() => ({ key: i++ })),
          isClosed: sinon.stub().returns(false)
        });
        shellApiCursor = new Cursor(mongo, spCursor);
      });

      it('is idempotent unless iterated', async() => {
        const result1 = (await toShellResult(shellApiCursor)).printable;
        const result2 = (await toShellResult(shellApiCursor)).printable;
        expect(result1).to.deep.equal(result2);
        await shellApiCursor._it();
        const result3 = (await toShellResult(shellApiCursor)).printable;
        expect(result1).to.not.deep.equal(result3);
      });
    });
  });
});
