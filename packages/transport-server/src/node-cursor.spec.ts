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
