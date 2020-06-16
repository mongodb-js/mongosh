import { ObjectId } from 'bson';
import { expect } from 'chai';
import { inspect } from './inspect';

describe('inspect', () => {
  context('with simple types', () => {
    it('inspects numbers', () => {
      expect(
        inspect(1)
      ).to.equal('1');
    });

    it('inspects strings', () => {
      expect(
        inspect('123')
      ).to.equal('\'123\'');
    });

    it('inspects booleans', () => {
      expect(
        inspect(true)
      ).to.equal('true');

      expect(
        inspect(false)
      ).to.equal('false');
    });

    it('inspects null', () => {
      expect(
        inspect(null)
      ).to.equal('null');
    });

    it('inspects undefined', () => {
      expect(
        inspect(undefined)
      ).to.equal('undefined');
    });
  });

  context('with BSON types', () => {
    it('inspects ObjectId', () => {
      expect(
        inspect(new ObjectId('0000007b3db627730e26fd0b'))
      ).to.equal('ObjectID("0000007b3db627730e26fd0b")');
    });
  });

  context('with objects', () => {
    context('when collapsed', () => {
      it('formats objects on one line', () => {
        expect(
          inspect({ x: 1, y: 2 })
        ).to.equal('{ x: 1, y: 2 }');
      });
    });
  });
});
