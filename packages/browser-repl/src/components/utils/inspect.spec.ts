import * as bson from 'bson';
import { expect } from 'chai';
import { inspect } from './inspect';

describe('inspect', function () {
  context('with simple types', function () {
    it('inspects numbers', function () {
      expect(inspect(1)).to.equal('1');
    });

    it('inspects strings', function () {
      expect(inspect('123')).to.equal("'123'");
    });

    it('inspects booleans', function () {
      expect(inspect(true)).to.equal('true');

      expect(inspect(false)).to.equal('false');
    });

    it('inspects null', function () {
      expect(inspect(null)).to.equal('null');
    });

    it('inspects undefined', function () {
      expect(inspect(undefined)).to.equal('undefined');
    });

    it('inspects Dates', function () {
      expect(inspect(new Date('2020-11-06T14:26:29.131Z'))).to.equal(
        '2020-11-06T14:26:29.131Z'
      );
    });
  });

  context('with BSON types', function () {
    it('inspects ObjectId', function () {
      expect(inspect(new bson.ObjectId('0000007b3db627730e26fd0b'))).to.equal(
        'ObjectId("0000007b3db627730e26fd0b")'
      );
    });

    it('inspects UUID', function () {
      expect(
        inspect(bson.Binary.createFromBase64('YWJjZGVmZ2hpa2xtbm9wcQ==', 4))
      ).to.equal("UUID('61626364-6566-6768-696b-6c6d6e6f7071')");
    });

    it('inspects nested ObjectId', function () {
      expect(
        inspect({ p: new bson.ObjectId('0000007b3db627730e26fd0b') })
      ).to.equal('{ p: ObjectId("0000007b3db627730e26fd0b") }');
    });

    it('inspects nested UUID', function () {
      expect(
        inspect({
          p: bson.Binary.createFromBase64('YWJjZGVmZ2hpa2xtbm9wcQ==', 4),
        })
      ).to.equal("{ p: UUID('61626364-6566-6768-696b-6c6d6e6f7071') }");
    });

    it('does not require BSON types to be instances of the current bson library', function () {
      expect(
        inspect({
          _bsontype: 'ObjectID',
          toHexString() {
            return '0000007b3db627730e26fd0b';
          },
        })
      ).to.equal('ObjectId("0000007b3db627730e26fd0b")');
    });
  });

  context('with objects', function () {
    context('when collapsed', function () {
      it('formats objects on one line', function () {
        expect(inspect({ x: 1, y: 2 })).to.equal('{ x: 1, y: 2 }');
      });
    });
  });

  context('with frozen objects with _bsontype properties', function () {
    expect(() =>
      inspect(
        Object.freeze({
          _bsontype: 'ObjectID',
          toHexString() {
            return '0000007b3db627730e26fd0b';
          },
        })
      )
    ).not.to.throw;
  });
});
