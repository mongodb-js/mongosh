import type {
  ObjectId,
  DBRef,
  MaxKey,
  MinKey,
  Timestamp,
  BSONSymbol,
  Code,
  Decimal128,
  Int32,
  Long,
  Binary,
  calculateObjectSize,
  Double,
  EJSON,
  UUID,
  BSONRegExp,
} from 'bson';
export type {
  ObjectId,
  DBRef,
  MaxKey,
  MinKey,
  Timestamp,
  BSONSymbol,
  Code,
  Decimal128,
  Int32,
  Long,
  Binary,
  Double,
  EJSON,
  UUID,
  BSONRegExp,
  calculateObjectSize,
};
export type BSON = {
  ObjectId: typeof ObjectId;
  DBRef: typeof DBRef;
  MaxKey: typeof MaxKey;
  MinKey: typeof MinKey;
  Timestamp: typeof Timestamp;
  Code: typeof Code;
  Decimal128: typeof Decimal128;
  Int32: typeof Int32;
  Long: typeof Long;
  Binary: typeof Binary;
  Double: typeof Double;
  EJSON: typeof EJSON;
  UUID: typeof UUID;
  BSONRegExp: typeof BSONRegExp;
  BSONSymbol: typeof BSONSymbol;
  calculateObjectSize: typeof calculateObjectSize;
};
