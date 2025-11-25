import { CommonErrors, MongoshInvalidInputError } from '@mongosh/errors';
import * as bson from 'bson';
import {
  serialize as bsonSerialize,
  deserialize as bsonDeserialize,
} from 'bson';
import * as chai from 'chai';
import { expect } from 'chai';
import sinonChai from 'sinon-chai';
import sinon from 'sinon';
import type { BSON, ShellBson } from './';
import { constructShellBson } from './';
chai.use(sinonChai);

const hex_1234 = '31323334';
const b64_1234 = 'MTIzNA==';
const utf_1234 = '1234';

interface TestHelp {
  testHelpName: string;
  type: 'Help';
}
const ALL_SERVER_VERSIONS = ['1.0'];

describe('Shell BSON', function () {
  let shellBson: ShellBson<BSON, TestHelp>;
  let printWarning: (msg: string) => void;
  let constructHelp: (name: string) => TestHelp;

  before(function () {
    printWarning = sinon.stub();
    constructHelp = sinon.stub().callsFake((name: string): TestHelp => {
      return { testHelpName: name, type: 'Help' };
    });
    shellBson = constructShellBson({
      bsonLibrary: bson,
      printWarning,
      constructHelp,
      assignMetadata(target, { help }) {
        target.serverVersions = ALL_SERVER_VERSIONS;
        if (help) {
          target.help = (): TestHelp => help;
          Object.setPrototypeOf(target.help, help);
        }
      },
    });
  });

  describe('DBRef', function () {
    it('without new', function () {
      const s = shellBson.DBRef('namespace', 'oid');
      expect(s._bsontype).to.equal('DBRef');
    });
    it('with new', function () {
      const s = new (shellBson.DBRef as any)('namespace', 'oid');
      expect(s._bsontype).to.equal('DBRef');
    });
    it('has help and other metadata', function () {
      const s = shellBson.DBRef('namespace', 'oid');
      expect(s.help?.type).to.equal('Help');
      expect(s.help?.().type).to.equal('Help');
      expect((s as any).serverVersions).to.deep.equal(ALL_SERVER_VERSIONS);
    });
    it('errors for missing arg 1', function () {
      try {
        (shellBson.DBRef as any)();
      } catch (e: any) {
        return expect(e.message).to.contain('Missing required argument');
      }
      expect.fail('Expecting error, nothing thrown');
    });
    it('errors for missing arg 2', function () {
      try {
        (shellBson.DBRef as any)('ns');
      } catch (e: any) {
        return expect(e.message).to.contain('Missing required argument');
      }
      expect.fail('Expecting error, nothing thrown');
    });
    it('errors for wrong type of arg 1', function () {
      try {
        (shellBson.DBRef as any)(1, 'oid');
      } catch (e: any) {
        return expect(e.message).to.contain('string, got number');
      }
      expect.fail('Expecting error, nothing thrown');
    });
    it('errors for wrong type of arg 3', function () {
      try {
        (shellBson.DBRef as any)('ns', 'oid', 1);
      } catch (e: any) {
        return expect(e.message).to.contain('string, got number');
      }
      expect.fail('Expecting error, nothing thrown');
    });
  });
  describe('MaxKey', function () {
    it('without new', function () {
      const s = shellBson.MaxKey();
      expect(s._bsontype).to.equal('MaxKey');
    });
    it('with new', function () {
      const s = new (shellBson.MaxKey as any)();
      expect(s._bsontype).to.equal('MaxKey');
    });
    it('using toBSON', function () {
      const s = (shellBson.MaxKey as any).toBSON();
      expect(s._bsontype).to.equal('MaxKey');
    });
    it('has help and other metadata', function () {
      const s = shellBson.MaxKey();
      expect(s.help?.type).to.equal('Help');
      expect(s.help?.().type).to.equal('Help');
      expect((s as any).serverVersions).to.deep.equal(ALL_SERVER_VERSIONS);
    });
  });
  describe('MinKey', function () {
    it('without new', function () {
      const s = shellBson.MinKey();
      expect(s._bsontype).to.equal('MinKey');
    });
    it('with new', function () {
      const s = new (shellBson.MinKey as any)();
      expect(s._bsontype).to.equal('MinKey');
    });
    it('using toBSON', function () {
      const s = (shellBson.MinKey as any).toBSON();
      expect(s._bsontype).to.equal('MinKey');
    });
    it('has help and other metadata', function () {
      const s = shellBson.MinKey();
      expect(s.help?.type).to.equal('Help');
      expect(s.help?.().type).to.equal('Help');
      expect((s as any).serverVersions).to.deep.equal(ALL_SERVER_VERSIONS);
    });
  });
  describe('MinKey & MaxKey constructor special handling', function () {
    it('round-trips through bson as expected', function () {
      const { MinKey, MaxKey } = shellBson;
      const expected = { a: { $minKey: 1 }, b: { $maxKey: 1 } };
      function roundtrip(value: any): any {
        return bson.EJSON.serialize(bsonDeserialize(bsonSerialize(value)));
      }

      expect(
        roundtrip({ a: new (MinKey as any)(), b: new (MaxKey as any)() })
      ).to.deep.equal(expected);
      expect(roundtrip({ a: MinKey(), b: MaxKey() })).to.deep.equal(expected);
      expect(
        roundtrip({ a: MinKey.toBSON(), b: MaxKey.toBSON() })
      ).to.deep.equal(expected);
      expect(roundtrip({ a: MinKey, b: MaxKey })).to.deep.equal(expected);
    });
  });
  describe('ObjectId', function () {
    it('without new', function () {
      const s = shellBson.ObjectId('5ebbe8e2905bb493d6981b6b');
      expect(s._bsontype).to.equal('ObjectId');
      expect(s.toHexString()).to.equal('5ebbe8e2905bb493d6981b6b');
    });
    it('with new', function () {
      const s = new (shellBson.ObjectId as any)('5ebbe8e2905bb493d6981b6b');
      expect(s._bsontype).to.equal('ObjectId');
      expect(s.toHexString()).to.equal('5ebbe8e2905bb493d6981b6b');
    });
    it('works with an integer argument', function () {
      const s = new (shellBson.ObjectId as any)(0x12345678);
      expect(s._bsontype).to.equal('ObjectId');
      expect(s.toHexString().slice(0, 8)).to.equal('12345678');
    });
    it('can be created through createFromTime', function () {
      const s = (shellBson.ObjectId as any).createFromTime(0x12345678);
      expect(s._bsontype).to.equal('ObjectId');
      expect(s.toHexString().slice(0, 8)).to.equal('12345678');
    });
    it('can be created using createFromHexString', function () {
      const s = shellBson.ObjectId.createFromHexString(
        '64c122afaf44ca299136bbc3'
      );
      expect(s._bsontype).to.equal('ObjectId');
      expect(s.toHexString()).to.equal('64c122afaf44ca299136bbc3');
    });
    it('has help and other metadata', function () {
      const s = shellBson.ObjectId();
      expect(s.help?.type).to.equal('Help');
      expect(s.help?.().type).to.equal('Help');
      expect((s as any).serverVersions).to.deep.equal(ALL_SERVER_VERSIONS);
    });
    it('errors for wrong type of arg 1', function () {
      try {
        (shellBson.ObjectId as any)(Symbol('foo'));
      } catch (e: any) {
        return expect(e.message).to.contain('object, got symbol');
      }
      expect.fail('Expecting error, nothing thrown');
    });
  });
  describe('BSONSymbol', function () {
    it('without new', function () {
      const s = (shellBson.BSONSymbol as any)('5ebbe8e2905bb493d6981b6b');
      expect(s._bsontype).to.equal('BSONSymbol');
      expect(s.toString()).to.equal('5ebbe8e2905bb493d6981b6b');
    });
    it('with new', function () {
      const s = new (shellBson.BSONSymbol as any)('5ebbe8e2905bb493d6981b6b');
      expect(s._bsontype).to.equal('BSONSymbol');
      expect(s.toString()).to.equal('5ebbe8e2905bb493d6981b6b');
    });
    it('has help and other metadata', function () {
      const s = (shellBson.BSONSymbol as any)('5ebbe8e2905bb493d6981b6b');
      expect(s.help?.type).to.equal('Help');
      expect(s.help?.().type).to.equal('Help');
    });
  });
  describe('Timestamp', function () {
    it('without new', function () {
      const s = shellBson.Timestamp(0, 100);
      expect(s._bsontype).to.equal('Timestamp');
    });
    it('with new', function () {
      const s = new (shellBson.Timestamp as any)(0, 100);
      expect(s._bsontype).to.equal('Timestamp');
    });
    it('with a long argument', function () {
      const s = shellBson.Timestamp((shellBson.Long as any)(1, 2));
      expect(s._bsontype).to.equal('Timestamp');
      expect((s as any).toExtendedJSON()).to.deep.equal({
        $timestamp: { t: 2, i: 1 },
      });
    });
    it('has help and other metadata', function () {
      const s = shellBson.Timestamp(0, 100);
      expect(s.help?.type).to.equal('Help');
      expect(s.help?.().type).to.equal('Help');
      expect((s as any).serverVersions).to.deep.equal(ALL_SERVER_VERSIONS);
    });
    it('errors for wrong type of arg 1', function () {
      try {
        (shellBson.Timestamp as any)('1');
      } catch (e: any) {
        return expect(e.message).to.contain('object, got string');
      }
      expect.fail('Expecting error, nothing thrown');
    });
    it('errors for wrong type of arg 2', function () {
      try {
        (shellBson.Timestamp as any)(1, '2');
      } catch (e: any) {
        return expect(e.message).to.contain('number, got string');
      }
      expect.fail('Expecting error, nothing thrown');
    });
    it('errors for out-of-range argument', function () {
      try {
        (shellBson.Timestamp as any)(2 ** 32);
      } catch (e: any) {
        return expect(e.message).to.contain('equal or less than uint32 max');
      }
      expect.fail('Expecting error, nothing thrown');
    });
    it('constructs with default args', function () {
      const s = shellBson.Timestamp();
      expect(s.low).to.equal(0);
      expect(s.high).to.equal(0);
    });
    it('constructs with default args 1', function () {
      const s = shellBson.Timestamp(1);
      expect(s.low).to.equal(0);
      expect(s.high).to.equal(1);
    });
    it('constructs with { t, i } signature', function () {
      const s = shellBson.Timestamp({ t: 10, i: 20 });
      expect(s.low).to.equal(20);
      expect(s.high).to.equal(10);
      expect((s as any).toExtendedJSON()).to.deep.equal({
        $timestamp: { t: 10, i: 20 },
      });
    });
  });
  describe('Code', function () {
    it('expects arguments in order', function () {
      const code = shellBson.Code('code', { k: 'v' });
      expect(code.code).to.equal('code');
      expect(code.scope).to.deep.equal({ k: 'v' });
    });
    it('works with a function argument', function () {
      const fn = function () {
        expect.fail();
      };
      const code = shellBson.Code(fn, { k: 'v' });
      expect(code.code).to.equal(fn.toString());
      expect(code.scope).to.deep.equal({ k: 'v' });
    });
    it('has help and other metadata', function () {
      const s = shellBson.Code('code', { k: 'v' });
      expect(s.help?.type).to.equal('Help');
      expect(s.help?.().type).to.equal('Help');
      expect((s as any).serverVersions).to.deep.equal(ALL_SERVER_VERSIONS);
    });
    it('errors for wrong type of arg 1', function () {
      try {
        (shellBson.Code as any)(1);
      } catch (e: any) {
        return expect(e.message).to.contain('function, got number');
      }
      expect.fail('Expecting error, nothing thrown');
    });
    it('errors for wrong type of arg 2', function () {
      try {
        (shellBson.Code as any)('code', 1);
      } catch (e: any) {
        return expect(e.message).to.contain('object, got number');
      }
      expect.fail('Expecting error, nothing thrown');
    });
    it('constructs with default args 1', function () {
      const s = shellBson.Code();
      expect(s.code).to.equal('');
    });
  });
  describe('ISODate', function () {
    it('ISODate is always object', function () {
      const date = new (shellBson.ISODate as any)();
      expect(typeof date).to.equal('object');
      const date2 = shellBson.ISODate();
      expect(typeof date2).to.equal('object');
    });
    it('accepts ISO args', function () {
      expect(shellBson.ISODate('2020-10-02').getTime()).to.equal(1601596800000);
      expect(shellBson.ISODate('2020-10-02T10:29:50+00:00').getTime()).to.equal(
        1601634590000
      );
      expect(shellBson.ISODate('2020-10-02T10:29:50+02:00').getTime()).to.equal(
        1601627390000
      );
      expect(shellBson.ISODate('2020-10-02T10:29:50-02:00').getTime()).to.equal(
        1601641790000
      );
      expect(shellBson.ISODate('2020-10-02T10:29:50Z').getTime()).to.equal(
        1601634590000
      );
      expect(shellBson.ISODate('2020-10-02T10:29:50').getTime()).to.equal(
        1601634590000
      );
      expect(shellBson.ISODate('2020-10-02T10:29:50.124Z').getTime()).to.equal(
        1601634590124
      );
      expect(shellBson.ISODate('20201002T102950Z').getTime()).to.equal(
        1601634590000
      );
      expect(shellBson.ISODate('20201002T102950').getTime()).to.equal(
        1601634590000
      );
      expect(shellBson.ISODate('20201002T102950+0000').getTime()).to.equal(
        1601634590000
      );
      expect(shellBson.ISODate('20201002T102950-0000').getTime()).to.equal(
        1601634590000
      );
      expect(shellBson.ISODate('20201002T102950+0200').getTime()).to.equal(
        1601627390000
      );
      expect(shellBson.ISODate('20201002T102950-0200').getTime()).to.equal(
        1601641790000
      );
      expect(shellBson.ISODate('20201002 102950Z').getTime()).to.equal(
        1601634590000
      );
      expect(shellBson.ISODate('20201002 102950+0000').getTime()).to.equal(
        1601634590000
      );
      expect(shellBson.ISODate('20201002 102950+0200').getTime()).to.equal(
        1601627390000
      );
      expect(shellBson.ISODate('20201002 102950-0200').getTime()).to.equal(
        1601641790000
      );
      expect(shellBson.ISODate('20201002 102950').getTime()).to.equal(
        1601634590000
      );
      expect(shellBson.ISODate('20201002 102950.842').getTime()).to.equal(
        1601634590842
      );
    });
    it('rejects non-ISO args', function () {
      expect(() => shellBson.ISODate('1/4/1977')).to.throw(
        '"1/4/1977" is not a valid ISODate'
      );
      expect(() => shellBson.ISODate('1-4-1977')).to.throw(
        '"1-4-1977" is not a valid ISODate'
      );
      expect(() => shellBson.ISODate('9999-12-31T23:99:59.999Z')).to.throw(
        '"9999-12-31T23:99:59.999Z" is not a valid ISODate'
      );
      expect(() => shellBson.ISODate('bah')).to.throw(
        '"bah" is not a valid ISODate'
      );

      try {
        shellBson.ISODate('"');
      } catch (e: any) {
        expect(e).to.be.instanceOf(MongoshInvalidInputError);
        expect(e.message).to.contain('"\\"" is not a valid ISODate');
        expect(e.code).to.equal(CommonErrors.InvalidArgument);
        return;
      }
      expect.fail('expected error');
    });
    it('passes through non-string args to `new Date()`', function () {
      expect(shellBson.ISODate()).to.be.an.instanceOf(Date);
      expect((shellBson.ISODate as any)(0).getTime()).to.equal(0);
      expect((shellBson.ISODate as any)(null).getTime()).to.equal(0);
      expect((shellBson.ISODate as any)(1234).getTime()).to.equal(1234);
      expect(
        (shellBson.ISODate as any)((shellBson.ISODate as any)(1234)).getTime()
      ).to.equal(1234);
    });
  });
  describe('BinData', function () {
    it('expects strings as base 64', function () {
      const b = shellBson.BinData(128, b64_1234);
      expect(b.toString()).to.equal(utf_1234);
    });
    it('has help and other metadata', function () {
      const s = shellBson.BinData(128, b64_1234);
      expect(s.help?.type).to.equal('Help');
      expect(s.help?.().type).to.equal('Help');
      expect((s as any).serverVersions).to.deep.equal(ALL_SERVER_VERSIONS);
    });
    it('errors for missing arg 1', function () {
      try {
        (shellBson.BinData as any)();
      } catch (e: any) {
        return expect(e.message).to.contain('Missing required argument');
      }
      expect.fail('Expecting error, nothing thrown');
    });
    it('errors for missing arg 2', function () {
      try {
        (shellBson.BinData as any)(0);
      } catch (e: any) {
        return expect(e.message).to.contain('Missing required argument');
      }
      expect.fail('Expecting error, nothing thrown');
    });
    it('errors for wrong type of arg 1', function () {
      try {
        (shellBson.BinData as any)('1', 'abc');
      } catch (e: any) {
        return expect(e.message).to.contain('number, got string');
      }
      expect.fail('Expecting error, nothing thrown');
    });
    it('errors for wrong type of arg 2', function () {
      try {
        (shellBson.BinData as any)(0, 1);
      } catch (e: any) {
        return expect(e.message).to.contain('string, got number');
      }
      expect.fail('Expecting error, nothing thrown');
    });
  });
  describe('HexData', function () {
    let b: any;
    let h: any;
    before(function () {
      b = shellBson.BinData(128, b64_1234);
      h = shellBson.HexData(128, hex_1234);
    });

    it('equals BinData', function () {
      expect(b.value()).to.deep.equal(h.value());
      expect(b.sub_type).to.equal(h.sub_type);
    });
    it('equals 1234', function () {
      expect(h.toString()).to.equal(utf_1234);
    });
    it('has subtype', function () {
      expect(h.sub_type).to.equal(128);
    });
    it('has help and other metadata', function () {
      expect(h.help.type).to.equal('Help');
      expect(h.help().type).to.equal('Help');
      expect(h.serverVersions).to.deep.equal(ALL_SERVER_VERSIONS);
    });
    it('errors for missing arg 1', function () {
      try {
        (shellBson.HexData as any)();
      } catch (e: any) {
        return expect(e.message).to.contain('Missing required argument');
      }
      expect.fail('Expecting error, nothing thrown');
    });
    it('errors for missing arg 2', function () {
      try {
        (shellBson.HexData as any)(0);
      } catch (e: any) {
        return expect(e.message).to.contain('Missing required argument');
      }
      expect.fail('Expecting error, nothing thrown');
    });
    it('errors for wrong type of arg 1', function () {
      try {
        (shellBson.HexData as any)('1', 'abc');
      } catch (e: any) {
        return expect(e.message).to.contain('number, got string');
      }
      expect.fail('Expecting error, nothing thrown');
    });
    it('errors for wrong type of arg 2', function () {
      try {
        (shellBson.HexData as any)(0, 1);
      } catch (e: any) {
        return expect(e.message).to.contain('string, got number');
      }
      expect.fail('Expecting error, nothing thrown');
    });
  });
  describe('UUID', function () {
    let b: any;
    let h: any;
    before(function () {
      b = shellBson.BinData(4, b64_1234);
      h = shellBson.UUID(hex_1234);
    });
    it('equals BinData', function () {
      expect(b.value()).to.deep.equal(h.value());
      expect(b.sub_type).to.equal(h.sub_type);
    });
    it('equals 1234', function () {
      expect(h.toString()).to.equal(utf_1234);
    });
    it('has subtype', function () {
      expect(h.sub_type).to.equal(4);
    });
    it('has help and other metadata', function () {
      expect(h.help.type).to.equal('Help');
      expect(h.help().type).to.equal('Help');
      expect(h.serverVersions).to.deep.equal(ALL_SERVER_VERSIONS);
    });
    it('strips dashes from input', function () {
      expect(
        shellBson.UUID('01234567-89ab-cdef-0123-456789abcdef').value()
      ).to.deep.equal(
        shellBson.UUID('0123456789abcdef0123456789abcdef').value()
      );
    });
    it('generates a random UUID when no arguments are passed', function () {
      // https://en.wikipedia.org/wiki/Universally_unique_identifier#Format
      expect(shellBson.UUID().toString('hex')).to.match(
        /^[a-z0-9]{12}4[a-z0-9]{3}[89ab][a-z0-9]{15}$/
      );
    });
    it('errors for wrong type of arg 1', function () {
      try {
        (shellBson.UUID as any)(1);
      } catch (e: any) {
        return expect(e.message).to.contain('string, got number');
      }
      expect.fail('Expecting error, nothing thrown');
    });
  });
  describe('MD5', function () {
    let b: any;
    let h: any;
    before(function () {
      b = shellBson.BinData(5, b64_1234);
      h = shellBson.MD5(hex_1234);
    });
    it('equals BinData', function () {
      expect(b.value()).to.deep.equal(h.value());
      expect(b.sub_type).to.equal(h.sub_type);
    });
    it('equals 1234', function () {
      expect(h.toString()).to.equal(utf_1234);
    });
    it('has subtype', function () {
      expect(h.sub_type).to.equal(5);
    });
    it('has help and other metadata', function () {
      expect(h.help.type).to.equal('Help');
      expect(h.help().type).to.equal('Help');
      expect(h.serverVersions).to.deep.equal(ALL_SERVER_VERSIONS);
    });
    it('errors for missing arg 1', function () {
      try {
        (shellBson.MD5 as any)();
      } catch (e: any) {
        return expect(e.message).to.contain('Missing required argument');
      }
      expect.fail('Expecting error, nothing thrown');
    });
    it('errors for wrong type of arg 1', function () {
      try {
        (shellBson.MD5 as any)(1);
      } catch (e: any) {
        return expect(e.message).to.contain('string, got number');
      }
      expect.fail('Expecting error, nothing thrown');
    });
  });
  describe('bsonsize', function () {
    it('calculates empty doc size', function () {
      expect(shellBson.bsonsize({})).to.equal(5);
    });
    it('errors for missing arg', function () {
      try {
        (shellBson.bsonsize as any)();
      } catch (e: any) {
        return expect(e.message).to.contain('Missing required argument');
      }
      expect.fail('Expecting error, nothing thrown');
    });
    it('errors for wrong type of arg 1', function () {
      try {
        (shellBson.bsonsize as any)(1);
      } catch (e: any) {
        return expect(e.message).to.contain('object, got number');
      }
      expect.fail('Expecting error, nothing thrown');
    });
  });

  describe('NumberLong', function () {
    it('creates a bson.Long', function () {
      const n = shellBson.NumberLong('123');
      expect(n).to.be.instanceOf(bson.Long);
      expect(bson.Long.fromString('123').eq(n)).to.be.true;
    });

    it('constructs 0 if the argument is not provided', function () {
      expect(bson.Long.fromString('0').eq(shellBson.NumberLong())).to.be.true;
    });

    it('correctly constructs numbers > MAX_SAFE_INTEGER', function () {
      expect(shellBson.NumberLong('345678654321234552').toString()).to.equal(
        '345678654321234552'
      );
    });

    it('correctly constructs large numbers < MAX_SAFE_INTEGER from their JS number value', function () {
      expect(shellBson.NumberLong(68719476736).toString()).to.equal(
        '68719476736'
      );
    });

    it('creates a bson.Long for unrecommended integer and prints warning', function () {
      const n = shellBson.NumberLong(123.5);
      expect(n).to.be.instanceOf(bson.Long);
      expect(bson.Long.fromString('123').eq(n)).to.be.true;
      expect(printWarning).to.have.been.calledWith(
        'NumberLong: specifying a number as argument is deprecated and may lead to loss of precision, pass a string instead'
      );
    });

    it('errors for wrong type of arg 1', function () {
      try {
        (shellBson.NumberLong as any)({});
      } catch (e: any) {
        return expect(e.message).to.match(
          /string or number or Long or Int32, got object.+\(NumberLong\)/
        );
      }
      expect.fail('Expecting error, nothing thrown');
    });
  });

  describe('NumberDecimal', function () {
    it('creates a bson.Decimal128', function () {
      const n = shellBson.NumberDecimal('123.1');
      expect(n).to.be.instanceOf(bson.Decimal128);
      expect(n.toString()).to.equal('123.1');
    });

    it('constructs 0 if the argument is not provided', function () {
      expect(shellBson.NumberDecimal().toString()).to.equal('0');
    });

    it('correctly constructs numbers > MAX_SAFE_INTEGER', function () {
      expect(
        shellBson.NumberDecimal('345678654321234552.0').toString()
      ).to.equal('345678654321234552.0');
    });

    it('creates a bson.Decimal128 for unrecommended integer and prints warning', function () {
      const n = (shellBson.NumberDecimal as any)(123);
      expect(n).to.be.instanceOf(bson.Decimal128);
      expect(bson.Decimal128.fromString('123').toString()).to.equal(
        n.toString()
      );
      expect(printWarning).to.have.been.calledWith(
        'NumberDecimal: specifying a number as argument is deprecated and may lead to loss of precision, pass a string instead'
      );
    });

    it('errors for wrong type of arg 1', function () {
      try {
        (shellBson.NumberDecimal as any)({});
      } catch (e: any) {
        return expect(e.message).to.match(
          /string or number or Long or Int32 or Decimal128, got object.+\(NumberDecimal\)/
        );
      }
      expect.fail('Expecting error, nothing thrown');
    });
  });

  describe('NumberInt', function () {
    it('creates a bson.Int32 from string', function () {
      const n = shellBson.NumberInt('1');
      expect(n).to.be.instanceOf(bson.Int32);
      expect(n.value).to.equal(1);
    });

    it('creates a bson.Int32 from number', function () {
      const n = (shellBson.NumberInt as any)(123);
      expect(n).to.be.instanceOf(bson.Int32);
      expect(new bson.Int32(123).value).to.equal(n.value);
    });

    it('creates a bson.Int32 from non-integer number', function () {
      const n = (shellBson.NumberInt as any)(123.5);
      expect(n).to.be.instanceOf(bson.Int32);
      expect(new bson.Int32(123).value).to.equal(n.value);
    });

    it('constructs 0 if the argument is not provided', function () {
      expect(shellBson.NumberInt().value).to.equal(0);
    });

    it('errors for wrong type of arg 1', function () {
      try {
        (shellBson.NumberInt as any)({});
      } catch (e: any) {
        return expect(e.message).to.match(
          /string or number or Long or Int32, got object.+\(NumberInt\)/
        );
      }
      expect.fail('Expecting error, nothing thrown');
    });
  });

  describe('Binary', function () {
    it('creates a Binary value using createFromBase64', function () {
      const n = shellBson.Binary.createFromBase64('SGVsbG8sIFdvcmxkIQo=');
      expect(n).to.be.instanceOf(bson.Binary);
      expect(n.toString()).to.equal('Hello, World!\n');
    });
  });

  describe('Number type cross-construction', function () {
    it('matches the legacy shell', function () {
      const { NumberInt, NumberLong, NumberDecimal } = shellBson as any;
      expect(NumberInt(null).toString()).to.equal('0');
      expect(NumberLong(null).toString()).to.equal('0');

      expect(NumberInt(NumberInt(1234)).toString()).to.equal('1234');
      expect(NumberInt(NumberLong(1234)).toString()).to.equal('1234');
      expect(NumberInt(NumberLong(1234)).toString()).to.equal('1234');
      expect(NumberLong(NumberInt(1234)).toString()).to.equal('1234');
      expect(NumberLong(NumberLong(1234)).toString()).to.equal('1234');
      expect(NumberDecimal(NumberInt(1234)).toString()).to.equal('1234');
      expect(NumberDecimal(NumberLong(1234)).toString()).to.equal('1234');
      expect(NumberDecimal(NumberDecimal(1234)).toString()).to.equal('1234');
    });
  });

  describe('EJSON', function () {
    it('serializes and de-serializes data', function () {
      const input = { a: new Date() };
      const output = shellBson.EJSON.parse(shellBson.EJSON.stringify(input));
      expect(input).to.deep.equal(output);
    });
  });

  describe('BSON constructor properties', function () {
    for (const key of Object.keys(bson) as (keyof typeof bson &
      keyof ShellBson)[]) {
      it(`matches original BSON constructor properties (${key})`, function () {
        if (!(key in shellBson) || bson[key] === shellBson[key]) {
          return;
        }

        if (key === 'UUID') {
          // TODO(MONGOSH-2710): Special case, we still need to make these match,
          // they currently do not because our UUID helper predates the addition
          // the driver helper.
          return;
        }

        const bsonProperties = Object.getOwnPropertyDescriptors(bson[key]);
        const shellProperties = Object.getOwnPropertyDescriptors(
          shellBson[key]
        );
        delete shellProperties.help; // Not expected from the original BSON.
        delete shellProperties.length; // Function length can vary depending on the specific arguments in TS.
        delete bsonProperties.length;
        delete bsonProperties.index; // ObjectId.index is a random number
        delete (shellProperties as any).toBSON; // toBSON is something we add for MaxKey/MinKey as a shell-specific extension
        delete shellProperties.prototype?.writable; // We don't want to care about writable vs non-writable prototypes
        delete bsonProperties.prototype?.writable;

        // Non-public methods:
        delete (bsonProperties as any).fromExtendedJSON; // Long.fromExtendedJSON was not made public on purpose
        delete bsonProperties.BSON_BINARY_SUBTYPE_DEFAULT; // private
        delete bsonProperties.createPk; // @internal
        delete bsonProperties.getInc; // private
        delete bsonProperties.is; // private
        delete bsonProperties._fromString; // private
        delete bsonProperties.validateHexString; // private

        try {
          expect(shellProperties).to.deep.equal(bsonProperties);
        } catch (err: any) {
          err.message += ` (${key})`;
          throw err;
        }
      });
    }
  });
});
