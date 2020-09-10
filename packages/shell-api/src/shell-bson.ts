import { ALL_PLATFORMS, ALL_SERVER_VERSIONS, ALL_TOPOLOGIES, ServerVersions } from './enums';
import Help from './help';
import { bson as BSON } from '@mongosh/service-provider-core';
import { MongoshInternalError, MongoshInvalidInputError } from '@mongosh/errors';

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

function requireStringAsConstructorArgument(typeName, arg): void {
  const argumentType = typeof(arg);
  if (argumentType !== 'string') {
    throw new MongoshInvalidInputError(
      `${typeName} can only be constructed from a string, received: ${argumentType}. Please use ${typeName}(string).`
    );
  }
}

/**
 * This method modifies the BSON class passed in as argument. This is required so that
 * we can have help, serverVersions, and other metadata on the bson classes constructed by the user.
 * @param {Object} bson
 */
export default function constructShellBson(bson: any): any {
  // If the service provider doesn't provide a BSON version, use service-provider-core's BSON package (js-bson 4.x)
  if (bson === undefined) {
    bson = BSON;
  }
  const oldBSON = 'Symbol' in bson;
  const helps: any = {};
  [
    'Binary', 'Code', 'DBRef', 'Decimal128', 'Int32', 'Long', 'MaxKey', 'MinKey', 'ObjectId', 'Timestamp', 'Map'
  ].forEach((className) => {
    if (!(className in bson)) {
      throw new MongoshInternalError(`${className} does not exist in provided BSON package. This is an internal error, please file a ticket!`);
    }
    bson[className].prototype.serverVersions = ALL_SERVER_VERSIONS;
    bson[className].prototype.platforms = ALL_PLATFORMS;
    bson[className].prototype.topologies = ALL_TOPOLOGIES;

    const help = constructHelp(className);
    helps[className] = help;
    bson[className].prototype.help = (): Help => (help);
    Object.setPrototypeOf(bson[className].prototype.help, help);
  });
  const symbolName = oldBSON ? 'Symbol' : 'BSONSymbol';
  bson[symbolName].prototype.serverVersions = [ ServerVersions.earliest, '1.6.0' ];
  bson[symbolName].prototype.platforms = ALL_PLATFORMS;
  bson[symbolName].prototype.topologies = ALL_TOPOLOGIES;
  const help = constructHelp('Symbol');
  helps.Symbol = help;
  bson[symbolName].prototype.help = (): Help => (help);
  Object.setPrototypeOf(bson[symbolName].prototype.help, help);

  // Classes whose names differ from shell to driver
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

  const bsonPkg = {
    RegExp: RegExp,
    DBRef: function(...args): any {
      return new bson.DBRef(...args);
    },
    // DBPointer not available in the bson 1.x library, but depreciated since 1.6
    Map: bson.Map,
    bsonsize: function(object): any {
      return BSON.calculateObjectSize(object);
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
      if (oldBSON) {
        return new bson.Symbol(...args);
      }
      return new bson.BSONSymbol(...args);
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

      requireStringAsConstructorArgument('NumberDecimal', s);

      return bson.Decimal128.fromString(s.toString());
    },
    NumberInt: function(v): any {
      if (v === undefined) {
        v = 0;
      }

      return new bson.Int32(parseInt(v, 10));
    },
    NumberLong: function(s): any {
      if (s === undefined) {
        s = '0';
      }

      requireStringAsConstructorArgument('NumberLong', s);

      return bson.Long.fromString(s);
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
      // Strip any dashes, as they occur in the standard UUID formatting
      // (e.g. 01234567-89ab-cdef-0123-456789abcdef).
      const buffer = Buffer.from(hexstr.replace(/-/g, ''), 'hex');
      return new bson.Binary(buffer, bson.Binary.SUBTYPE_UUID);
    },
    MD5: function(hexstr): any {
      const buffer = Buffer.from(hexstr, 'hex');
      return new bson.Binary(buffer, bson.Binary.SUBTYPE_MD5);
    }
  };
  [ 'ObjectId', 'Code', 'DBRef', 'MaxKey', 'MinKey', 'Timestamp', 'Symbol', 'Map'].forEach((className) => {
    (bsonPkg[className] as any).help = (): Help => (helps[className]);
    Object.setPrototypeOf((bsonPkg[className] as any).help, helps[className]);
  });
  // Classes whose names differ from shell to driver
  (bsonPkg.NumberDecimal as any).help = (): Help => (helpDecimal);
  Object.setPrototypeOf((bsonPkg.NumberDecimal as any).help, helpDecimal);
  (bsonPkg.NumberInt as any).help = (): Help => (helpInt);
  Object.setPrototypeOf((bsonPkg.NumberInt as any).help, helpInt);
  (bsonPkg.NumberLong as any).help = (): Help => (helpLong);
  Object.setPrototypeOf((bsonPkg.NumberLong as any).help, helpLong);
  (bsonPkg.BinData as any).help = (): Help => (helpBinData);
  Object.setPrototypeOf((bsonPkg.BinData as any).help, helpBinData);
  return bsonPkg;
}
