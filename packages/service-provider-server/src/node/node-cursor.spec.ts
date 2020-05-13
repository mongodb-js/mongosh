import sinon, { SinonStubbedInstance } from 'sinon';
import chai from 'chai';
import sinonChai from 'sinon-chai';
chai.use(sinonChai);
const { expect } = chai;

import NodeCursor, { Flag } from './node-cursor';
import { Cursor } from 'mongodb';

describe('NodeCursor', () => {
  describe('#addOption', () => {
    let cursor: SinonStubbedInstance<Cursor>;
    let nodeCursor;
    let mock;

    beforeEach(() => {
      mock = sinon.mock().withArgs(Flag.Tailable, true);
      cursor = sinon.createStubInstance(Cursor, {
        addCursorFlag: mock
      });
      nodeCursor = new NodeCursor(cursor);
    });

    it('fluidly adds the cursor flag', () => {
      expect(nodeCursor.addOption(2)).to.equal(nodeCursor);
      mock.verify();
    });

    it('throws if a SlaveOk flag passed', () => {
      expect(() => nodeCursor.addOption(4)).to.throw('the slaveOk option is not yet supported.');
    });

    it('throws if an unknown flag passed', () => {
      expect(() => nodeCursor.addOption(123123)).to.throw('Unknown option flag number: 123123');
    });
  });

  describe('#allowPartialResults', () => {
    let cursor: SinonStubbedInstance<Cursor>;
    let nodeCursor;
    let mock;

    beforeEach(() => {
      mock = sinon.mock().withArgs(Flag.Partial, true);
      cursor = sinon.createStubInstance(Cursor, {
        addCursorFlag: mock
      });
      nodeCursor = new NodeCursor(cursor);
    });

    it('fluidly adds the cursor flag', () => {
      expect(nodeCursor.allowPartialResults()).to.equal(nodeCursor);
      mock.verify();
    });
  });

  describe('#batchSize', () => {
    let cursor: SinonStubbedInstance<Cursor>;
    let nodeCursor;
    let mock;

    beforeEach(() => {
      mock = sinon.mock().withArgs(5);
      cursor = sinon.createStubInstance(Cursor, {
        batchSize: mock
      });
      nodeCursor = new NodeCursor(cursor);
    });

    it('fluidly set the batch size', () => {
      expect(nodeCursor.batchSize(5)).to.equal(nodeCursor);
      mock.verify();
    });
  });

  describe('#close', () => {
    let cursor: SinonStubbedInstance<Cursor>;
    let nodeCursor;
    let mock;
    const options = { skipKillCursors: true };

    beforeEach(() => {
      mock = sinon.mock().withArgs(options);
      cursor = sinon.createStubInstance(Cursor, {
        close: mock
      });
      nodeCursor = new NodeCursor(cursor);
    });

    it('closes the cursor', () => {
      nodeCursor.close(options);
      mock.verify();
    });
  });

  describe('#collation', () => {
    let cursor: SinonStubbedInstance<Cursor>;
    let nodeCursor;
    let mock;
    const coll = { locale: 'en' };

    beforeEach(() => {
      mock = sinon.mock().withArgs(coll);
      cursor = sinon.createStubInstance(Cursor, {
        collation: mock
      });
      nodeCursor = new NodeCursor(cursor);
    });

    it('fluidly sets the collation', () => {
      expect(nodeCursor.collation(coll)).to.equal(nodeCursor);
      mock.verify();
    });
  });

  describe('#comment', () => {
    let cursor: SinonStubbedInstance<Cursor>;
    let nodeCursor;
    let mock;
    const cmt = 'hi';

    beforeEach(() => {
      mock = sinon.mock().withArgs(cmt);
      cursor = sinon.createStubInstance(Cursor, {
        comment: mock
      });
      nodeCursor = new NodeCursor(cursor);
    });

    it('fluidly sets the comment', () => {
      expect(nodeCursor.comment(cmt)).to.equal(nodeCursor);
      mock.verify();
    });
  });

  describe('#count', () => {
    let cursor: SinonStubbedInstance<Cursor>;
    let nodeCursor;
    let mock;

    beforeEach(() => {
      mock = sinon.mock().returns(Promise.resolve(5));
      cursor = sinon.createStubInstance(Cursor, {
        count: mock
      });
      nodeCursor = new NodeCursor(cursor);
    });

    it('fluidly sets the comment', async() => {
      expect(await nodeCursor.count()).to.equal(5);
      mock.verify();
    });
  });

  describe('#hasNext', () => {
    let cursor: SinonStubbedInstance<Cursor>;
    let nodeCursor;
    let mock;

    beforeEach(() => {
      mock = sinon.mock().returns(Promise.resolve(true));
      cursor = sinon.createStubInstance(Cursor, {
        hasNext: mock
      });
      nodeCursor = new NodeCursor(cursor);
    });

    it('returns the cursor hasNext value', async() => {
      expect(await nodeCursor.hasNext()).to.equal(true);
      mock.verify();
    });
  });

  describe('#isExhausted', () => {
    let cursor: SinonStubbedInstance<Cursor>;
    let nodeCursor: NodeCursor;
    let hasNextMock;
    let isClosedMock;

    beforeEach(() => {
      hasNextMock = sinon.mock();
      isClosedMock = sinon.mock();
      cursor = sinon.createStubInstance(Cursor, {
        hasNext: hasNextMock,
        isClosed: isClosedMock
      });
      nodeCursor = new NodeCursor(cursor);
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
          expect(await nodeCursor.isExhausted()).to.equal(expected);
        });
      });
    });
  });

  describe('#hint', () => {
    let cursor: SinonStubbedInstance<Cursor>;
    let nodeCursor;
    let mock;
    const index = 'a_1';

    beforeEach(() => {
      mock = sinon.mock().withArgs(index);
      cursor = sinon.createStubInstance(Cursor, {
        hint: mock
      });
      nodeCursor = new NodeCursor(cursor);
    });

    it('fluidly sets hint', () => {
      expect(nodeCursor.hint(index)).to.equal(nodeCursor);
      mock.verify();
    });
  });

  describe('#limit', () => {
    let cursor: SinonStubbedInstance<Cursor>;
    let nodeCursor;
    let mock;
    const value = 6;

    beforeEach(() => {
      mock = sinon.mock().withArgs(value);
      cursor = sinon.createStubInstance(Cursor, {
        limit: mock
      });
      nodeCursor = new NodeCursor(cursor);
    });

    it('fluidly sets limit', () => {
      expect(nodeCursor.limit(value)).to.equal(nodeCursor);
      mock.verify();
    });
  });

  describe('#max', () => {
    let cursor: SinonStubbedInstance<Cursor>;
    let nodeCursor;
    let mock;
    const value = { a: 1 };

    beforeEach(() => {
      mock = sinon.mock().withArgs(value);
      cursor = sinon.createStubInstance(Cursor, {
        max: mock
      });
      nodeCursor = new NodeCursor(cursor);
    });

    it('fluidly sets max', () => {
      expect(nodeCursor.max(value)).to.equal(nodeCursor);
      mock.verify();
    });
  });

  describe('#maxTimeMS', () => {
    let cursor: SinonStubbedInstance<Cursor>;
    let nodeCursor;
    let mock;
    const value = 5000;

    beforeEach(() => {
      mock = sinon.mock().withArgs(value);
      cursor = sinon.createStubInstance(Cursor, {
        maxTimeMS: mock
      });
      nodeCursor = new NodeCursor(cursor);
    });

    it('fluidly sets maxTimeMS', () => {
      expect(nodeCursor.maxTimeMS(value)).to.equal(nodeCursor);
      mock.verify();
    });
  });

  describe('#min', () => {
    let cursor: SinonStubbedInstance<Cursor>;
    let nodeCursor;
    let mock;
    const value = { a: 1 };

    beforeEach(() => {
      mock = sinon.mock().withArgs(value);
      cursor = sinon.createStubInstance(Cursor, {
        min: mock
      });
      nodeCursor = new NodeCursor(cursor);
    });

    it('fluidly sets min', () => {
      expect(nodeCursor.min(value)).to.equal(nodeCursor);
      mock.verify();
    });
  });

  describe('#noCursorTimeout', () => {
    let cursor: SinonStubbedInstance<Cursor>;
    let nodeCursor;
    let mock;

    beforeEach(() => {
      mock = sinon.mock().withArgs(Flag.NoTimeout, true);
      cursor = sinon.createStubInstance(Cursor, {
        addCursorFlag: mock
      });
      nodeCursor = new NodeCursor(cursor);
    });

    it('fluidly adds the cursor flag', () => {
      expect(nodeCursor.noCursorTimeout()).to.equal(nodeCursor);
      mock.verify();
    });
  });

  describe('#oplogReplay', () => {
    let cursor: SinonStubbedInstance<Cursor>;
    let nodeCursor;
    let mock;

    beforeEach(() => {
      mock = sinon.mock().withArgs(Flag.OplogReplay, true);
      cursor = sinon.createStubInstance(Cursor, {
        addCursorFlag: mock
      });
      nodeCursor = new NodeCursor(cursor);
    });

    it('fluidly adds the cursor flag', () => {
      expect(nodeCursor.oplogReplay()).to.equal(nodeCursor);
      mock.verify();
    });
  });

  describe('#projection', () => {
    let cursor: SinonStubbedInstance<Cursor>;
    let nodeCursor;
    let mock;
    const value = { a: 1 };

    beforeEach(() => {
      mock = sinon.mock().withArgs(value);
      cursor = sinon.createStubInstance(Cursor, {
        project: mock
      });
      nodeCursor = new NodeCursor(cursor);
    });

    it('fluidly sets projection', () => {
      expect(nodeCursor.projection(value)).to.equal(nodeCursor);
      mock.verify();
    });
  });

  describe('#readPref', () => {
    let cursor: SinonStubbedInstance<Cursor>;
    let nodeCursor;
    let mock;
    const value = 'primary';

    beforeEach(() => {
      mock = sinon.mock().withArgs(value);
      cursor = sinon.createStubInstance(Cursor, {
        setReadPreference: mock
      });
      nodeCursor = new NodeCursor(cursor);
    });

    it('fluidly sets the read preference', () => {
      expect(nodeCursor.readPref(value)).to.equal(nodeCursor);
      mock.verify();
    });

    it('throws MongoshUnimplementedError if tagset is passed', () => {
      expect(() => nodeCursor.readPref(value, [])).to.throw('the tagSet argument is not yet supported.');
    });
  });

  describe('#returnKey', () => {
    let cursor: SinonStubbedInstance<Cursor>;
    let nodeCursor;
    let mock;
    const value = true;

    beforeEach(() => {
      mock = sinon.mock().withArgs(value);
      cursor = sinon.createStubInstance(Cursor, {
        returnKey: mock
      });
      nodeCursor = new NodeCursor(cursor);
    });

    it('fluidly sets the return key value', () => {
      expect(nodeCursor.returnKey(value)).to.equal(nodeCursor);
      mock.verify();
    });
  });

  describe('#skip', () => {
    let cursor: SinonStubbedInstance<Cursor>;
    let nodeCursor;
    let mock;
    const value = 6;

    beforeEach(() => {
      mock = sinon.mock().withArgs(value);
      cursor = sinon.createStubInstance(Cursor, {
        skip: mock
      });
      nodeCursor = new NodeCursor(cursor);
    });

    it('fluidly sets skip', () => {
      expect(nodeCursor.skip(value)).to.equal(nodeCursor);
      mock.verify();
    });
  });

  describe('#sort', () => {
    let cursor: SinonStubbedInstance<Cursor>;
    let nodeCursor;
    let mock;
    const value = { a: 1 };

    beforeEach(() => {
      mock = sinon.mock().withArgs(value);
      cursor = sinon.createStubInstance(Cursor, {
        sort: mock
      });
      nodeCursor = new NodeCursor(cursor);
    });

    it('fluidly sets sort', () => {
      expect(nodeCursor.sort(value)).to.equal(nodeCursor);
      mock.verify();
    });
  });

  describe('#tailable', () => {
    let cursor: SinonStubbedInstance<Cursor>;
    let nodeCursor;
    let mock;

    beforeEach(() => {
      mock = sinon.mock().withArgs(Flag.Tailable, true);
      cursor = sinon.createStubInstance(Cursor, {
        addCursorFlag: mock
      });
      nodeCursor = new NodeCursor(cursor);
    });

    it('fluidly adds the cursor flag', () => {
      expect(nodeCursor.tailable()).to.equal(nodeCursor);
      mock.verify();
    });
  });

  describe('#itcount', () => {
    let cursor: SinonStubbedInstance<Cursor>;
    let nodeCursor;

    beforeEach(() => {
      cursor = sinon.createStubInstance(Cursor);
      nodeCursor = new NodeCursor(cursor);
    });

    it('returns the iteration count', async() => {
      cursor.hasNext.onCall(0).resolves(true);
      cursor.hasNext.onCall(1).resolves(true);
      cursor.hasNext.onCall(2).resolves(false);
      cursor.next.resolves({});

      expect(await nodeCursor.itcount()).to.equal(2);
    });
  });

  describe('#explain', () => {
    let nativeCursorStub;
    let nodeCursor;
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

      nativeCursorStub = sinon.createStubInstance(Cursor, {
        explain: mock
      });

      nodeCursor = new NodeCursor(nativeCursorStub);
    });

    it('calls explain on the native cursor', async() => {
      await nodeCursor.explain();
      mock.verify();
    });

    it('does not throw if executionStats is missing', async() => {
      mock.resolves({
        queryPlanner: { },
        serverInfo: { },
        ok: 1
      });

      await nodeCursor.explain();
    });

    context('with empty verbosity', () => {
      it('filters out executionStats', async() => {
        expect(await nodeCursor.explain()).to.deep.equal({
          queryPlanner: { },
          serverInfo: { },
          ok: 1
        });
      });
    });

    context('with verbosity = queryPlanner', () => {
      it('filters out executionStats', async() => {
        expect(await nodeCursor.explain('queryPlanner')).to.deep.equal({
          queryPlanner: { },
          serverInfo: { },
          ok: 1
        });
      });
    });

    context('with verbosity = executionStats', () => {
      it('filters out allPlansExecution', async() => {
        expect(await nodeCursor.explain('executionStats')).to.deep.equal({
          queryPlanner: { },
          executionStats: { },
          serverInfo: { },
          ok: 1
        });
      });
    });

    context('with verbosity = allPlansExecution', () => {
      it('returns everything', async() => {
        expect(await nodeCursor.explain('allPlansExecution')).to.deep.equal({
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
});
