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
});
