import bson from 'bson';

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
export default {
  RegExp: RegExp,
  DBRef: bson.DBRef,
  DBPointer: bson.DBPointer,
  Map: bson.Map,
  MaxKey: bson.MaxKey,
  MinKey: bson.MinKey,
  ObjectId: bson.ObjectID,
  BSONSymbol: bson.BSONSymbol,
  Timestamp: bson.Timestamp,
  Code: function(c, s): bson.Code {
    return new bson.Code(c, s);
  },
  NumberDecimal: function(s): bson.Decimal128 {
    if (s === undefined) {
      s = '0';
    }
    return bson.Decimal128.fromString(s.toString());
  },
  NumberInt: function(s): any {
    return parseInt(s, 10);
  },
  NumberLong: function(v): bson.Long {
    if (v === undefined) {
      v = 0;
    }
    return bson.Long.fromNumber(v);
  },
  Date: function(...args: DateConstructorArguments): Date|string {
    const date = dateHelper(...args);
    if (new.target) {
      return date;
    }
    return date.toString();
  },
  ISODate: function(...args: DateConstructorArguments): Date {
    return dateHelper(...args);
  },
  BinData: function(subtype, b64string): bson.Binary { // this from 'help misc' in old shell
    const buffer = Buffer.from(b64string, 'base64');
    return new bson.Binary(buffer, subtype);
  },
  HexData: function(subtype, hexstr): bson.Binary {
    const buffer = Buffer.from(hexstr, 'hex');
    return new bson.Binary(buffer, subtype);
  },
  UUID: function(hexstr): bson.Binary {
    const buffer = Buffer.from(hexstr, 'hex');
    return new bson.Binary(buffer, bson.Binary.SUBTYPE_UUID);
  },
  MD5: function(hexstr): bson.Binary {
    const buffer = Buffer.from(hexstr, 'hex');
    return new bson.Binary(buffer, bson.Binary.SUBTYPE_MD5);
  },
  bsonsize: function(object): any {
    return bson.calculateObjectSize(object);
  }
};
