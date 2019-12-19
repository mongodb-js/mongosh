import NodeCursor, { Flag } from './node-cursor';
import { Cursor } from 'mongodb';
import { expect } from 'chai';
import sinon from 'sinon';

describe('NodeCursor', () => {
  describe('#addOption', () => {
    let cursor;
    let nodeCursor;
    const mock = sinon.mock().withArgs(Flag.Tailable, true);

    beforeEach(() => {
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
});
