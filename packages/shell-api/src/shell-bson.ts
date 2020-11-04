import { ALL_PLATFORMS, ALL_SERVER_VERSIONS, ALL_TOPOLOGIES, ServerVersions } from './enums';
import Help from './help';
import { bson as BSON } from '@mongosh/service-provider-core';
import { MongoshInternalError, MongoshInvalidInputError } from '@mongosh/errors';
import { assertArgsDefined, assertArgsType } from './helpers';

function constructHelp(className: string): Help {
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
    DBRef: function(namespace: string, oid: any, db?: string): any {
      assertArgsDefined(namespace, oid);
      assertArgsType([namespace, db], ['string', 'string']);
      return new bson.DBRef(namespace, oid, db);
    },
    // DBPointer not available in the bson 1.x library, but depreciated since 1.6
    Map: bson.Map,
    bsonsize: function(object: any): any {
      assertArgsDefined(object);
      assertArgsType([object], ['object']);
      return BSON.calculateObjectSize(object);
    },
    MaxKey: function(): any {
      return new bson.MaxKey();
    },
    MinKey: function(): any {
      return new bson.MinKey();
    },
    ObjectId: function(id?: string): any {
      assertArgsType([id], ['string']);
      return new bson.ObjectID(id);
    },
    Symbol: function(value = ''): any {
      if (oldBSON) {
        return new bson.Symbol(value);
      }
      return new bson.BSONSymbol(value);
    },
    Timestamp: function(low = 0, high = 0): any {
      assertArgsType([low, high], ['number', 'number']);
      return new bson.Timestamp(low, high);
    },
    Code: function(c: any = '', s?: any): any {
      assertArgsType([c, s], ['string', 'object']);
      return new bson.Code(c, s);
    },
    NumberDecimal: function(s = '0'): any {
      assertArgsType([s], ['string']);

      return bson.Decimal128.fromString(s.toString());
    },
    NumberInt: function(v = '0'): any {
      assertArgsType([v], ['string']);
      return new bson.Int32(parseInt(v, 10));
    },
    NumberLong: function(s = '0'): any {
      assertArgsType([s], ['string']);
      return bson.Long.fromString(s);
    },
    Date: function(...args: DateConstructorArguments): Date | string {
      const date = dateHelper(...args);
      if (new.target) {
        return date;
      }
      return date.toString();
    },
    ISODate: function(input?: string): Date {
      if (!input) input = new Date().toISOString();
      const isoDateRegex =
        /^(?<Y>\d{4})-?(?<M>\d{2})-?(?<D>\d{2})([T ](?<h>\d{2})(:?(?<m>\d{2})(:?((?<s>\d{2})(\.(?<ms>\d+))?))?)?(?<tz>Z|([+-])(\d{2}):?(\d{2})?)?)?$/;
      const match = input.match(isoDateRegex);
      if (match !== null && match.groups !== undefined) {
        // Normalize the representation because ISO-8601 accepts e.g.
        // '20201002T102950Z' without : and -, but `new Date()` does not.
        const { Y, M, D, h, m, s, ms, tz } = match.groups;
        const normalized =
          `${Y}-${M}-${D}T${h || '00'}:${m || '00'}:${s || '00'}.${ms || '000'}${tz || 'Z'}`;
        const date = new Date(normalized);
        // Make sur we're in the range 0000-01-01T00:00:00.000Z - 9999-12-31T23:59:59.999Z
        if (date.getTime() >= -62167219200000 && date.getTime() <= 253402300799999) {
          return date;
        }
      }
      throw new MongoshInvalidInputError(`${JSON.stringify(input)} is not a valid ISODate`);
    },
    BinData: function(subtype: number, b64string: string): BSON.Binary { // this from 'help misc' in old shell
      assertArgsDefined(subtype, b64string);
      assertArgsType([subtype, b64string], ['number', 'string']);
      const buffer = Buffer.from(b64string, 'base64');
      return new bson.Binary(buffer, subtype);
    },
    HexData: function(subtype: number, hexstr: string): BSON.Binary {
      assertArgsDefined(subtype, hexstr);
      assertArgsType([subtype, hexstr], ['number', 'string']);
      const buffer = Buffer.from(hexstr, 'hex');
      return new bson.Binary(buffer, subtype);
    },
    UUID: function(hexstr: string): BSON.Binary {
      assertArgsDefined(hexstr);
      assertArgsType([hexstr], ['string']);
      // Strip any dashes, as they occur in the standard UUID formatting
      // (e.g. 01234567-89ab-cdef-0123-456789abcdef).
      const buffer = Buffer.from(hexstr.replace(/-/g, ''), 'hex');
      return new bson.Binary(buffer, bson.Binary.SUBTYPE_UUID);
    },
    MD5: function(hexstr: string): BSON.Binary {
      assertArgsDefined(hexstr);
      assertArgsType([hexstr], ['string']);
      const buffer = Buffer.from(hexstr, 'hex');
      return new bson.Binary(buffer, bson.Binary.SUBTYPE_MD5);
    }
  };
  const keys: (keyof typeof bsonPkg)[] = [
    'ObjectId', 'Code', 'DBRef', 'MaxKey', 'MinKey', 'Timestamp', 'Symbol', 'Map'
  ];
  keys.forEach((className) => {
    bsonPkg[className].help = (): Help => (helps[className]);
    Object.setPrototypeOf(bsonPkg[className].help, helps[className]);
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
