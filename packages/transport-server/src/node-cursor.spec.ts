import NodeCursor, { Flag } from './node-cursor';
import { Cursor } from 'mongodb';
import { expect } from 'chai';
import sinon from 'sinon';

describe('NodeCursor', () => {
  describe('#addOption', () => {
    let cursor;
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
  });

  describe('#allowPartialResults', () => {
    let cursor;
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
    let cursor;
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
    let cursor;
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

    it('fluidly closes the cursor', () => {
      expect(nodeCursor.close(options)).to.equal(nodeCursor);
      mock.verify();
    });
  });

  describe('#collation', () => {
    let cursor;
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
    let cursor;
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
    let cursor;
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
    let cursor;
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
    let cursor;
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
    let cursor;
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
    let cursor;
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
    let cursor;
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
    let cursor;
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
    let cursor;
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

  describe('#noTimeout', () => {
    let cursor;
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
      expect(nodeCursor.noTimeout()).to.equal(nodeCursor);
      mock.verify();
    });
  });

  describe('#oplogReplay', () => {
    let cursor;
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
    let cursor;
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
    let cursor;
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
  });

  describe('#returnKey', () => {
    let cursor;
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

  describe('#showDiskLoc', () => {
    let cursor;
    let nodeCursor;
    let mock;

    beforeEach(() => {
      mock = sinon.mock().withArgs(true);
      cursor = sinon.createStubInstance(Cursor, {
        showRecordId: mock
      });
      nodeCursor = new NodeCursor(cursor);
    });

    it('fluidly sets the show disk location flag', () => {
      expect(nodeCursor.showDiskLoc()).to.equal(nodeCursor);
      mock.verify();
    });
  });

  describe('#showRecordId', () => {
    let cursor;
    let nodeCursor;
    let mock;
    const value = true;

    beforeEach(() => {
      mock = sinon.mock().withArgs(value);
      cursor = sinon.createStubInstance(Cursor, {
        showRecordId: mock
      });
      nodeCursor = new NodeCursor(cursor);
    });

    it('fluidly sets the show record id value', () => {
      expect(nodeCursor.showRecordId(value)).to.equal(nodeCursor);
      mock.verify();
    });
  });

  describe('#skip', () => {
    let cursor;
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
    let cursor;
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
    let cursor;
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
});
