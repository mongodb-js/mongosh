import { expect } from 'chai';
import { bson } from './index';
import { inspect } from 'util';
import { makePrintableBson } from './';

describe('BSON printers', function() {
  before('make BSON objects printable', function() {
    makePrintableBson(bson);
  });

  // Enable after https://github.com/mongodb/js-bson/pull/412
  xit('formats ObjectIds correctly', function() {
    expect(inspect(new bson.ObjectId('5fa5694f88211043b23c7f11')))
      .to.equal('ObjectId("5fa5694f88211043b23c7f11")');
  });

  it('formats DBRefs correctly', function() {
    expect(inspect(new bson.DBRef('a', new bson.ObjectId('5f16b8bebe434dc98cdfc9cb'), 'db')))
      .to.equal('DBRef("a", "5f16b8bebe434dc98cdfc9cb", "db")');
  });

  it('formats MinKey and MaxKey correctly', function() {
    expect(inspect(new bson.MinKey())).to.equal('{ "$minKey" : 1 }');
    expect(inspect(new bson.MaxKey())).to.equal('{ "$maxKey" : 1 }');
  });

  it('formats NumberInt correctly', function() {
    expect(inspect(new bson.Int32(32))).to.equal('NumberInt(32)');
  });

  it('formats NumberLong correctly', function() {
    expect(inspect(bson.Long.fromString('64'))).to.equal('NumberLong("64")');
  });

  it('formats NumberDecimal correctly', function() {
    expect(inspect(bson.Decimal128.fromString('1'))).to.equal('NumberDecimal("1")');
  });

  it('formats Timestamp correctly', function() {
    expect(inspect(new bson.Timestamp(1, 100))).to.equal('Timestamp(1, 100)');
  });

  it('formats Symbol correctly', function() {
    expect(inspect(new bson.BSONSymbol('abc'))).to.equal('"abc"');
  });

  it('formats Code correctly', function() {
    expect(inspect(new bson.Code('abc'))).to.equal('{ "code" : "abc" }');
  });

  it('formats BinData correctly', function() {
    expect(inspect(new bson.Binary('abc'))).to.equal('BinData(0, "YWJj")');
  });

  it('formats UUIDs correctly', function() {
    expect(inspect(new bson.Binary(Buffer.from('0123456789abcdef0123456789abcdef', 'hex'), 4)))
      .to.equal('UUID("01234567-89ab-cdef-0123-456789abcdef")');
  });

  it('formats MD5s correctly', function() {
    expect(inspect(new bson.Binary(Buffer.from('0123456789abcdef0123456789abcdef', 'hex'), 5)))
      .to.equal('MD5("0123456789abcdef0123456789abcdef")');
  });
});
