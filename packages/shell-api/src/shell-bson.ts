import { ALL_PLATFORMS, ALL_SERVER_VERSIONS, ALL_TOPOLOGIES, ServerVersions } from './enums';
import Help from './help';
import { bson as BSON } from '@mongosh/service-provider-core';

function constructHelp(className): Help {
  const classHelpKeyPrefix = `shell-api.classes.${className}.help`;
  const classHelp = {
    help: `${classHelpKeyPrefix}.description`,
    docs: `${classHelpKeyPrefix}.link`,
    attr: []
  };
  return new Help(classHelp);
}

type DateConstructorArguments = [ any?, any?, ...any[] ];

function dateHelper(...args: DateConstructorArguments): Date {
  if (args.length === 0) {
    return new Date();
  }
  if (args.length === 1) {
    return new Date(args[0]);
  }
  return new Date(Date.UTC(...args));
}

/**
 * This method modifies the BSON class passed in as argument. This is required so that
 * we can have help, serverVersions, and other metadata on the bson classes constructed by the user.
 * @param {Object} bson
 */
export default function constructShellBson(bson: any) {
  if (bson === undefined) {
    bson = BSON;
  }
  [
    'Binary', 'Code', 'DBRef', 'Decimal128', 'Int32', 'Long',
    'MaxKey', 'MinKey', 'ObjectId', 'Timestamp', 'Symbol', 'Map'
  ].forEach((className) => {
    bson[className].prototype.serverVersions = ALL_SERVER_VERSIONS;
    bson[className].prototype.platforms = ALL_PLATFORMS;
    bson[className].prototype.topologies = ALL_TOPOLOGIES;

    const help = constructHelp(className);
    bson[className].prototype.help = (): Help => (help);
    Object.setPrototypeOf(bson[className].prototype.help, help);
    bson[className].help = (): Help => (help);
  });

  // Non-standard classes
  bson.Symbol.prototype.serverVersions = [ ServerVersions.earliest, '1.6.0' ];
  const helpDecimal = constructHelp('NumberDecimal');
  bson.Decimal128.prototype.help = (): Help => (helpDecimal);
  Object.setPrototypeOf(bson.Decimal128.prototype.help, helpDecimal);
  const helpInt = constructHelp('NumberInt');
  bson.Int32.prototype.help = (): Help => (helpInt);
  Object.setPrototypeOf(bson.Int32.prototype.help, helpInt);
  const helpLong = constructHelp('NumberLong');
  bson.Long.prototype.help = (): Help => (helpLong);
  Object.setPrototypeOf(bson.Long.prototype.help, helpLong);
  const helpBinData = constructHelp('BinData');
  bson.Binary.prototype.help = (): Help => (helpBinData);
  Object.setPrototypeOf(bson.Binary.prototype.help, helpBinData);

  const extbson = new BSON(); // NOTE: always uses BSON from SP-core for objsize
  return {
    RegExp: RegExp,
    DBRef: function(...args): any {
      return new bson.DBRef(...args);
    },
    // DBPointer not available in the bson 1.x library, but depreciated since 1.6
    Map: bson.Map,
    bsonsize: function(object): any {
      return extbson.calculateObjectSize(object);
    },
    MaxKey: function(...args): any {
      return new bson.MaxKey(...args);
    },
    MinKey: function(...args): any {
      return new bson.MinKey(...args);
    },
    ObjectId: function(...args): any {
      return new bson.ObjectID(...args);
    },
    Symbol: function(...args): any {
      return new bson.Symbol(...args);
    },
    Timestamp: function(...args): any {
      return new bson.Timestamp(...args);
    },
    Code: function(c, s): any {
      return new bson.Code(c, s);
    },
    NumberDecimal: function(s): any {
      if (s === undefined) {
        s = '0';
      }
      return bson.Decimal128.fromString(s.toString());
    },
    NumberInt: function(s): any {
      return new bson.Int32(parseInt(s, 10));
    },
    NumberLong: function(v): any {
      if (v === undefined) {
        v = 0;
      }
      return bson.Long.fromNumber(v);
    },
    Date: function(...args: DateConstructorArguments): Date | string {
      const date = dateHelper(...args);
      if (new.target) {
        return date;
      }
      return date.toString();
    },
    ISODate: function(...args: DateConstructorArguments): Date {
      return dateHelper(...args);
    },
    BinData: function(subtype, b64string): any { // this from 'help misc' in old shell
      const buffer = Buffer.from(b64string, 'base64');
      return new bson.Binary(buffer, subtype);
    },
    HexData: function(subtype, hexstr): any {
      const buffer = Buffer.from(hexstr, 'hex');
      return new bson.Binary(buffer, subtype);
    },
    UUID: function(hexstr): any {
      const buffer = Buffer.from(hexstr, 'hex');
      return new bson.Binary(buffer, bson.Binary.SUBTYPE_UUID);
    },
    MD5: function(hexstr): any {
      const buffer = Buffer.from(hexstr, 'hex');
      return new bson.Binary(buffer, bson.Binary.SUBTYPE_MD5);
    }
  };
}
