/* eslint @typescript-eslint/camelcase: 0, new-cap: 0 */
import ShellInternalState from './shell-internal-state';
import ShellApi from './shell-api';
import { signatures } from './index';
import { expect } from 'chai';
const sinon = require('sinon');

const hex_1234 = '31323334';
const b64_1234 = 'MTIzNA==';
const utf_1234 = '1234';

describe('ShellApi', () => {
  let shellApi;
  let useSpy;
  let showSpy;
  let itSpy;
  describe('methods', () => {
    before(() => {
      useSpy = sinon.spy();
      showSpy = sinon.spy();
      itSpy = sinon.spy();
      const internalState = {
        currentDb: {
          mongo: { use: useSpy, show: showSpy }
        },
        currentCursor: {
          _it: itSpy
        }
      };
      shellApi = new ShellApi(internalState);
    });
    it('use calls mongo use', () => {
      shellApi.use('testdb');
      expect(useSpy.calledOnceWithExactly('testdb'));
    });
    it('use calls mongo show', () => {
      shellApi.show('dbs');
      expect(showSpy.calledOnceWithExactly('dbs'));
    });
    it('it calls cursor _it', () => {
      shellApi.it();
      expect(itSpy.calledOnce);
    });
  });
  describe('BSON', () => {
    let context;
    let bin;
    let sub;
    before(() => {
      const internalState = new ShellInternalState(sinon.spy());
      context = {} as any;
      internalState.setCtx(context);
    });
    describe('DBRef', () => {
      it('without new', () => {
        const s = context.DBRef('namespace', 'oid');
        expect(s._bsontype).to.equal('DBRef');
      });
      it('with new', () => {
        const s = new (context.DBRef as any)('namespace', 'oid');
        expect(s._bsontype).to.equal('DBRef');
      });
    });
    describe('MaxKey', () => {
      it('without new', () => {
        const s = context.MaxKey();
        expect(s._bsontype).to.equal('MaxKey');
      });
      it('with new', () => {
        const s = new (context.MaxKey as any)();
        expect(s._bsontype).to.equal('MaxKey');
      });
    });
    describe('MinKey', () => {
      it('without new', () => {
        const s = context.MinKey();
        expect(s._bsontype).to.equal('MinKey');
      });
      it('with new', () => {
        const s = new (context.MinKey as any)();
        expect(s._bsontype).to.equal('MinKey');
      });
    });
    describe('ObjectId', () => {
      it('without new', () => {
        const s = context.ObjectId('5ebbe8e2905bb493d6981b6b');
        expect(s._bsontype).to.equal('ObjectID');
        expect(s.toHexString()).to.equal('5ebbe8e2905bb493d6981b6b');
      });
      it('with new', () => {
        const s = new (context.ObjectId as any)('5ebbe8e2905bb493d6981b6b');
        expect(s._bsontype).to.equal('ObjectID');
        expect(s.toHexString()).to.equal('5ebbe8e2905bb493d6981b6b');
      });
    });
    describe('Symbol', () => {
      it('without new', () => {
        const s = context.Symbol('5ebbe8e2905bb493d6981b6b');
        expect(s._bsontype).to.equal('Symbol');
        expect(s.toString()).to.equal('5ebbe8e2905bb493d6981b6b');
      });
      it('with new', () => {
        const s = new (context.Symbol as any)('5ebbe8e2905bb493d6981b6b');
        expect(s._bsontype).to.equal('Symbol');
        expect(s.toString()).to.equal('5ebbe8e2905bb493d6981b6b');
      });
    });
    describe('Timestamp', () => {
      it('without new', () => {
        const s = context.Timestamp(0, 100);
        expect(s._bsontype).to.equal('Timestamp');
      });
      it('with new', () => {
        const s = new (context.Timestamp as any)(0, 100);
        expect(s._bsontype).to.equal('Timestamp');
      });
    });
    describe('Code', () => {
      it('expects arguments in order', () => {
        const code = context.Code('code', { k: 'v' });
        expect(code.code).to.equal('code');
        expect(code.scope).to.deep.equal({ k: 'v' });
      });
    });
    describe('RegExp', () => {
      it('expects RegExp to keep args', () => {
        const reg = context.RegExp('abc', 'i');
        expect(reg.flags).to.equal('i');
        expect(reg.source).to.equal('abc');
      });
    });
    describe('Date', () => {
      it('returns string without new', () => {
        expect(context.Date()).to.be.a('string');
      });
      it('accepts ISO args', () => {
        expect((new (context.Date as any)(1) as Date).getTime()).to.equal(1);
        expect((new (context.Date as any)(1, 2) as Date).getTime()).to.equal(-2172355200000);
        expect((new (context.Date as any)(1, 2, 3, 4, 5) as Date).getTime()).to.equal(-2172167700000);
      });
      it('returns now object with new', () => {
        const date = new (context.Date as any)();
        const cDate = new Date();
        expect(typeof date).to.equal('object');
        expect(date.getFullYear()).to.equal(cDate.getFullYear());
      });
    });
    describe('ISODate', () => {
      it('ISODate is always object', () => {
        const date = new (context.ISODate as any)();
        expect(typeof date).to.equal('object');
        const date2 = context.ISODate();
        expect(typeof date2).to.equal('object');
      });
      it('accepts ISO args', () => {
        expect((context.ISODate(1) as Date).getTime()).to.equal(1);
        expect((context.ISODate(1, 2) as Date).getTime()).to.equal(-2172355200000);
        expect((context.ISODate(1, 2, 3, 4, 5) as Date).getTime()).to.equal(-2172167700000);
      });
    });
    describe('BinData', () => {
      it('expects strings as base 64', () => {
        bin = context.BinData(128, b64_1234);
        expect(bin.value()).to.equal(utf_1234);
      });
    });
    describe('HexData', () => {
      before(() => {
        bin = context.BinData(128, b64_1234);
        sub = context.HexData(128, hex_1234);
      });
      it('equals BinData', () => {
        expect(bin.value()).to.equal(sub.value());
        expect(bin.sub_type).to.equal(sub.sub_type);
      });
      it('equals 1234', () => {
        expect(sub.value()).to.equal(utf_1234);
      });
      it('has subtype', () => {
        expect(sub.sub_type).to.equal(128);
      });
    });
    describe('UUID', () => {
      before(() => {
        bin = context.BinData(4, b64_1234);
        sub = context.UUID(hex_1234);
      });
      it('equals BinData', () => {
        expect(bin.value()).to.equal(sub.value());
        expect(bin.sub_type).to.equal(sub.sub_type);
      });
      it('equals 1234', () => {
        expect(sub.value()).to.equal(utf_1234);
      });
      it('has subtype', () => {
        expect(sub.sub_type).to.equal(4);
      });
    });
    describe('MD5', () => {
      before(() => {
        bin = context.BinData(5, b64_1234);
        sub = context.MD5(hex_1234);
      });
      it('equals BinData', () => {
        expect(bin.value()).to.equal(sub.value());
        expect(bin.sub_type).to.equal(sub.sub_type);
      });
      it('equals 1234', () => {
        expect(sub.value()).to.equal(utf_1234);
      });
      it('has subtype', () => {
        expect(sub.sub_type).to.equal(5);
      });
    });
    describe('bsonsize', () => {
      it('calculates empty doc size', () => {
        expect(context.bsonsize({})).to.equal(5);
      });
    });
  });
  describe('signature', () => {
    it('use', () => {
      expect(signatures.ShellApi.attributes.use.type).to.equal('function');
    });
    it('show', () => {
      expect(signatures.ShellApi.attributes.show.type).to.equal('function');
    });
    it('it', () => {
      expect(signatures.ShellApi.attributes.it.type).to.equal('function');
    });
    it('contains ISODate BSON', () => {
      expect(signatures.ShellApi.attributes.ISODate.type).to.equal('function');
    });
    it('contains RegExp BSON', () => {
      expect(signatures.ShellApi.attributes.RegExp.type).to.equal('function');
    });
  });
});
