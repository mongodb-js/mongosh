import sinon from 'sinon';
import { Cursor } from './shell-api';
import { expect } from 'chai';

describe('Cursor', () => {
  describe('fluent interface', () => {
    ['limit', 'skip'].forEach((method) => {
      describe(method, () => {
        let wrappee;
        let cursor;
        beforeEach(() => {
          wrappee = {
            [method]: sinon.spy()
          };

          cursor = new Cursor({}, wrappee);
        });

        it('returns the same cursor', () => {
          expect(cursor[method]()).to.equal(cursor);
        });

        it(`calls wrappee.${method} with arguments`, () => {
          const arg = {};
          cursor[method](arg);

          expect(wrappee[method].calledWith(arg)).to.equal(true);
        });
      });
    });
  });
});
