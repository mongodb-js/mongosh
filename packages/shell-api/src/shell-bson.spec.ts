/* eslint @typescript-eslint/camelcase: 0, new-cap: 0 */
import shellBson from './shell-bson';
import { expect } from 'chai';
import { ALL_SERVER_VERSIONS, asShellResult } from './enums';
import modifyBson from './modify-bson';
import bson from 'bson';
import { ReplPlatform } from '@mongosh/service-provider-core';

const hex_1234 = '31323334';
const b64_1234 = 'MTIzNA==';
const utf_1234 = '1234';

describe('Shell BSON', () => {
  before(() => {
    modifyBson(bson, ReplPlatform.CLI);
  });
  describe('DBRef', () => {
    it('without new', () => {
      const s = shellBson.DBRef('namespace', 'oid');
      expect(s._bsontype).to.equal('DBRef');
    });
    it('with new', () => {
      const s = new (shellBson.DBRef as any)('namespace', 'oid');
      expect(s._bsontype).to.equal('DBRef');
    });
    it('has help and other metadata', () => {
      const s = shellBson.DBRef('namespace', 'oid');
      expect(s.help[asShellResult]().type).to.equal('Help');
      expect(s.help()[asShellResult]().type).to.equal('Help');
      expect(s.serverVersions).to.deep.equal(ALL_SERVER_VERSIONS);
    });
  });
  describe('MaxKey', () => {
    it('without new', () => {
      const s = shellBson.MaxKey();
      expect(s._bsontype).to.equal('MaxKey');
    });
    it('with new', () => {
      const s = new (shellBson.MaxKey as any)();
      expect(s._bsontype).to.equal('MaxKey');
    });
    it('has help and other metadata', () => {
      const s = shellBson.MaxKey();
      expect(s.help[asShellResult]().type).to.equal('Help');
      expect(s.help()[asShellResult]().type).to.equal('Help');
      expect(s.serverVersions).to.deep.equal(ALL_SERVER_VERSIONS);
    });
  });
  describe('MinKey', () => {
    it('without new', () => {
      const s = shellBson.MinKey();
      expect(s._bsontype).to.equal('MinKey');
    });
    it('with new', () => {
      const s = new (shellBson.MinKey as any)();
      expect(s._bsontype).to.equal('MinKey');
    });
    it('has help and other metadata', () => {
      const s = shellBson.MinKey();
      expect(s.help[asShellResult]().type).to.equal('Help');
      expect(s.help()[asShellResult]().type).to.equal('Help');
      expect(s.serverVersions).to.deep.equal(ALL_SERVER_VERSIONS);
    });
  });
  describe('ObjectId', () => {
    it('without new', () => {
      const s = shellBson.ObjectId('5ebbe8e2905bb493d6981b6b');
      expect(s._bsontype).to.equal('ObjectID');
      expect(s.toHexString()).to.equal('5ebbe8e2905bb493d6981b6b');
    });
    it('with new', () => {
      const s = new (shellBson.ObjectId as any)('5ebbe8e2905bb493d6981b6b');
      expect(s._bsontype).to.equal('ObjectID');
      expect(s.toHexString()).to.equal('5ebbe8e2905bb493d6981b6b');
    });
    it('has help and other metadata', () => {
      const s = shellBson.ObjectId();
      expect(s.help[asShellResult]().type).to.equal('Help');
      expect(s.help()[asShellResult]().type).to.equal('Help');
      expect(s.serverVersions).to.deep.equal(ALL_SERVER_VERSIONS);
    });
  });
  describe('Symbol', () => {
    it('without new', () => {
      const s = shellBson.Symbol('5ebbe8e2905bb493d6981b6b');
      expect(s._bsontype).to.equal('Symbol');
      expect(s.toString()).to.equal('5ebbe8e2905bb493d6981b6b');
    });
    it('with new', () => {
      const s = new (shellBson.Symbol as any)('5ebbe8e2905bb493d6981b6b');
      expect(s._bsontype).to.equal('Symbol');
      expect(s.toString()).to.equal('5ebbe8e2905bb493d6981b6b');
    });
    it('has help and other metadata', () => {
      const s = shellBson.Symbol('5ebbe8e2905bb493d6981b6b');
      expect(s.help[asShellResult]().type).to.equal('Help');
      expect(s.help()[asShellResult]().type).to.equal('Help');
    });
  });
  describe('Timestamp', () => {
    it('without new', () => {
      const s = shellBson.Timestamp(0, 100);
      expect(s._bsontype).to.equal('Timestamp');
    });
    it('with new', () => {
      const s = new (shellBson.Timestamp as any)(0, 100);
      expect(s._bsontype).to.equal('Timestamp');
    });
    it('has help and other metadata', () => {
      const s = shellBson.Timestamp(0, 100);
      expect(s.help[asShellResult]().type).to.equal('Help');
      expect(s.help()[asShellResult]().type).to.equal('Help');
      expect(s.serverVersions).to.deep.equal(ALL_SERVER_VERSIONS);
    });
  });
  describe('Code', () => {
    it('expects arguments in order', () => {
      const code = shellBson.Code('code', { k: 'v' });
      expect(code.code).to.equal('code');
      expect(code.scope).to.deep.equal({ k: 'v' });
    });
    it('has help and other metadata', () => {
      const s = shellBson.Code('code', { k: 'v' });
      expect(s.help[asShellResult]().type).to.equal('Help');
      expect(s.help()[asShellResult]().type).to.equal('Help');
      expect(s.serverVersions).to.deep.equal(ALL_SERVER_VERSIONS);
    });
  });
  describe('Date', () => {
    it('returns string without new', () => {
      expect(shellBson.Date()).to.be.a('string');
    });
    it('accepts ISO args', () => {
      expect((new (shellBson.Date as any)(1) as Date).getTime()).to.equal(1);
      expect((new (shellBson.Date as any)(1, 2) as Date).getTime()).to.equal(-2172355200000);
      expect((new (shellBson.Date as any)(1, 2, 3, 4, 5) as Date).getTime()).to.equal(-2172167700000);
    });
    it('returns now object with new', () => {
      const date = new (shellBson.Date as any)();
      const cDate = new Date();
      expect(typeof date).to.equal('object');
      expect(date.getFullYear()).to.equal(cDate.getFullYear());
    });
  });
  describe('ISODate', () => {
    it('ISODate is always object', () => {
      const date = new (shellBson.ISODate as any)();
      expect(typeof date).to.equal('object');
      const date2 = shellBson.ISODate();
      expect(typeof date2).to.equal('object');
    });
    it('accepts ISO args', () => {
      expect((shellBson.ISODate(1) as Date).getTime()).to.equal(1);
      expect((shellBson.ISODate(1, 2) as Date).getTime()).to.equal(-2172355200000);
      expect((shellBson.ISODate(1, 2, 3, 4, 5) as Date).getTime()).to.equal(-2172167700000);
    });
  });
  describe('BinData', () => {
    const b = shellBson.BinData(128, b64_1234);
    it('expects strings as base 64', () => {
      expect(b.value()).to.equal(utf_1234);
    });
    it('has help and other metadata', () => {
      const s = shellBson.BinData(128, b64_1234);
      expect(s.help[asShellResult]().type).to.equal('Help');
      expect(s.help()[asShellResult]().type).to.equal('Help');
      expect(s.serverVersions).to.deep.equal(ALL_SERVER_VERSIONS);
    });
  });
  describe('HexData', () => {
    const b = shellBson.BinData(128, b64_1234);
    const h = shellBson.HexData(128, hex_1234);
    it('equals BinData', () => {
      expect(b.value()).to.equal(h.value());
      expect(b.sub_type).to.equal(h.sub_type);
    });
    it('equals 1234', () => {
      expect(h.value()).to.equal(utf_1234);
    });
    it('has subtype', () => {
      expect(h.sub_type).to.equal(128);
    });
    it('has help and other metadata', () => {
      expect(h.help[asShellResult]().type).to.equal('Help');
      expect(h.help()[asShellResult]().type).to.equal('Help');
      expect(h.serverVersions).to.deep.equal(ALL_SERVER_VERSIONS);
    });
  });
  describe('UUID', () => {
    const b = shellBson.BinData(4, b64_1234);
    const h = shellBson.UUID(hex_1234);
    it('equals BinData', () => {
      expect(b.value()).to.equal(h.value());
      expect(b.sub_type).to.equal(h.sub_type);
    });
    it('equals 1234', () => {
      expect(h.value()).to.equal(utf_1234);
    });
    it('has subtype', () => {
      expect(h.sub_type).to.equal(4);
    });
    it('has help and other metadata', () => {
      expect(h.help[asShellResult]().type).to.equal('Help');
      expect(h.help()[asShellResult]().type).to.equal('Help');
      expect(h.serverVersions).to.deep.equal(ALL_SERVER_VERSIONS);
    });
  });
  describe('MD5', () => {
    const b = shellBson.BinData(5, b64_1234);
    const h = shellBson.MD5(hex_1234);
    it('equals BinData', () => {
      expect(b.value()).to.equal(h.value());
      expect(b.sub_type).to.equal(h.sub_type);
    });
    it('equals 1234', () => {
      expect(h.value()).to.equal(utf_1234);
    });
    it('has subtype', () => {
      expect(h.sub_type).to.equal(5);
    });
    it('has help and other metadata', () => {
      expect(h.help[asShellResult]().type).to.equal('Help');
      expect(h.help()[asShellResult]().type).to.equal('Help');
      expect(h.serverVersions).to.deep.equal(ALL_SERVER_VERSIONS);
    });
  });
  // describe('bsonsize', () => {
  //   it('calculates empty doc size', () => {
  //     expect(shellBson.bsonsize({})).to.equal(5);
  //   });
  // });
});
