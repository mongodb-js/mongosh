import { expect } from 'chai';
import * as bson from 'bson';
import { inspect } from 'util';
import { makePrintableBson } from './printable-bson';

describe('BSON printers', function () {
  before('make BSON objects printable', function () {
    makePrintableBson(bson);
  });

  it('formats ObjectIds correctly', function () {
    expect(inspect(new bson.ObjectId('5fa5694f88211043b23c7f11'))).to.equal(
      "ObjectId('5fa5694f88211043b23c7f11')"
    );
  });

  it('formats DBRefs correctly', function () {
    expect(
      inspect(
        new bson.DBRef('a', new bson.ObjectId('5f16b8bebe434dc98cdfc9cb'), 'db')
      )
    ).to.equal("DBRef('a', ObjectId('5f16b8bebe434dc98cdfc9cb'), 'db')");
    expect(inspect(new bson.DBRef('a', 'foo' as any, 'db'))).to.equal(
      "DBRef('a', 'foo', 'db')"
    );
    expect(inspect(new bson.DBRef('a', { x: 1 } as any, 'db'))).to.equal(
      "DBRef('a', { x: 1 }, 'db')"
    );
  });

  it('formats MinKey and MaxKey correctly', function () {
    expect(inspect(new bson.MinKey())).to.equal('MinKey()');
    expect(inspect(new bson.MaxKey())).to.equal('MaxKey()');
  });

  it('formats NumberInt correctly', function () {
    expect(inspect(new bson.Int32(32))).to.equal('Int32(32)');
  });

  it('formats NumberLong correctly', function () {
    expect(inspect(bson.Long.fromString('64'))).to.equal("Long('64')");
  });

  it('formats unsigned NumberLong correctly', function () {
    expect(inspect(bson.Long.fromString('64', true))).to.equal(
      "Long('64', true)"
    );
  });

  it('formats NumberDecimal correctly', function () {
    expect(inspect(bson.Decimal128.fromString('1'))).to.equal(
      "Decimal128('1')"
    );
  });

  it('formats Timestamp correctly', function () {
    expect(inspect(new bson.Timestamp(new bson.Long(100, 1)))).to.equal(
      'Timestamp({ t: 1, i: 100 })'
    );
  });

  it('formats Symbol correctly', function () {
    expect(inspect(new bson.BSONSymbol('abc'))).to.equal("BSONSymbol('abc')");
  });

  it('formats Code correctly', function () {
    expect(inspect(new bson.Code('abc'))).to.equal("Code('abc')");
  });

  it('formats BSONRegExp correctly', function () {
    expect(inspect(new bson.BSONRegExp('(?-i)AA_', 'im'))).to.equal(
      "BSONRegExp('(?-i)AA_', 'im')"
    );
  });

  it('formats UUIDs correctly', function () {
    expect(
      inspect(
        new bson.Binary(
          Buffer.from('0123456789abcdef0123456789abcdef', 'hex'),
          4
        )
      )
    ).to.equal("UUID('01234567-89ab-cdef-0123-456789abcdef')");
  });

  it('formats MD5s correctly', function () {
    expect(
      inspect(
        new bson.Binary(
          Buffer.from('0123456789abcdef0123456789abcdef', 'hex'),
          5
        )
      )
    ).to.equal("MD5('0123456789abcdef0123456789abcdef')");
  });

  describe('with Vector types', function () {
    it('formats Int8Array correctly', function () {
      expect(
        inspect(bson.Binary.fromInt8Array(new Int8Array([1, 2, 3])))
      ).to.equal('Binary.fromInt8Array(new Int8Array([ 1, 2, 3 ]))');
    });

    it('formats PackedBits correctly', function () {
      expect(
        inspect(bson.Binary.fromPackedBits(new Uint8Array([1, 2, 3])))
      ).to.equal('Binary.fromPackedBits(new Uint8Array([ 1, 2, 3 ]))');
    });

    it('formats PackedBits correctly with padding', function () {
      expect(
        inspect(bson.Binary.fromPackedBits(new Uint8Array([1, 2, 3]), 7))
      ).to.equal('Binary.fromPackedBits(new Uint8Array([ 1, 2, 3 ]), 7)');
    });

    it('formats Float32Array correctly', function () {
      expect(
        inspect(
          bson.Binary.fromFloat32Array(
            new Float32Array([1.1111, 2.2222, 3.3333])
          ),
          { compact: true }
        )
      ).matches(
        // Precision is lost because of float handling, so we use regex to match
        /Binary.fromFloat32Array\(new Float32Array\(\[ 1\.1\d*, 2\.2\d*, 3\.3\d* \]\)\)/
      );
    });
  });

  it('formats any other value with the new format using createfromBase64', function () {
    expect(
      inspect(bson.Binary.createFromBase64('SGVsbG8sIFdvcmxkIQo='))
    ).to.equal("Binary.createFromBase64('SGVsbG8sIFdvcmxkIQo=', 0)");
  });
});
