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

    it.skip('inspects Symbol', () => {
      expect(
        inspect(Symbol('123'))
      ).to.equal('Symbol(123)');
    });

    it.skip('inspects BigInt', () => {
      expect(
        // eslint-disable-next-line no-undef
        inspect(BigInt(1))
      ).to.equal('1n');
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
          inspect({x: 1, y: 2})
        ).to.equal('{ x: 1, y: 2 }');
      });
    });

    context('when expanded', () => {
      it.skip('formats objects on multiple lines', () => {
        expect(
          inspect({x: 1, y: 2}, { expanded: true })
        ).to.equal('{\n  x: 1,\n  y: 2\n}');
      });
    });
  });
});
