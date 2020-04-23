/* eslint prefer-rest-params: 0 */
import bson from 'bson';

export default {
  RegExp: RegExp,
  DBRef: bson.DBRef,
  Map: bson.Map,
  MaxKey: bson.MaxKey,
  MinKey: bson.MinKey,
  ObjectId: bson.ObjectID,
  BSONSymbol: bson.BSONSymbol,
  Timestamp: bson.Timestamp,
  Code: function(c, s) {
    return new bson.Code(c, s);
  },
  NumberDecimal: function(s) {
    if (s === undefined) {
      s = '0';
    }
    return bson.Decimal128.fromString(s.toString());
  },
  NumberInt: function(s) {
    return parseInt(s, 10);
  },
  NumberLong: function(v) {
    if (v === undefined) {
      v = 0;
    }
    return bson.Long.fromNumber(v);
  },
  ISODate: function(s) {
    return new Date(s);
  },
  Date: function(s) {
    const args = Array.from(arguments);

    if (args.length === 1) {
      return new Date(s);
    }

    return new Date(Date.UTC(...args));
  },
};
