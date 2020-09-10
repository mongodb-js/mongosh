import BSON from 'bson';
/**
 * This method modifies the BSON class passed in as argument. This is required so that
 * we can have the driver return our BSON classes without having to write our own serializer.
 * @param {Object} bson
 */
export default function(bson): void {
  if (!bson) {
    bson = BSON;
  }
  const toString = require('util').inspect.custom || 'inspect';

  bson.ObjectId.prototype[toString] = function(): string {
    return `ObjectId("${this.toHexString()}")`;
  };
  bson.ObjectId.prototype.asPrintable = bson.ObjectId.prototype[toString];

  bson.DBRef.prototype[toString] = function(): string {
    // NOTE: if OID is an ObjectId class it will just print the oid string.
    return `DBRef("${this.namespace}", "${this.oid.toString()}"${this.db ? `, "${this.db}"` : ''})`;
  };
  bson.DBRef.prototype.asPrintable = bson.DBRef.prototype[toString];

  bson.MaxKey.prototype[toString] = function(): string {
    return '{ "$maxKey" : 1 }';
  };
  bson.MaxKey.prototype.asPrintable = bson.MaxKey.prototype[toString];

  bson.MinKey.prototype[toString] = function(): string {
    return '{ "$minKey" : 1 }';
  };
  bson.MinKey.prototype.asPrintable = bson.MinKey.prototype[toString];

  bson.Timestamp.prototype[toString] = function(): string {
    return `Timestamp(${this.getLowBits().toString()}, ${this.getHighBits().toString()})`;
  };
  bson.Timestamp.prototype.asPrintable = bson.Timestamp.prototype[toString];

  // The old shell could not print Symbols so this was undefined behavior
  if ('Symbol' in bson) {
    bson.Symbol.prototype[toString] = function(): string {
      return `"${this.valueOf()}"`;
    };
  }
  if ('BSONSymbol' in bson) {
    bson.BSONSymbol.prototype[toString] = function(): string {
      return `"${this.valueOf()}"`;
    };
  }

  bson.Code.prototype[toString] = function(): string {
    const j = this.toJSON();
    return `{ "code" : "${j.code}"${j.scope ? `, "scope" : ${JSON.stringify(j.scope)}` : ''} }`;
  };
  bson.Code.prototype.asPrintable = bson.Code.prototype[toString];

  bson.Decimal128.prototype[toString] = function(): string {
    return `NumberDecimal("${this.toString()}")`;
  };
  bson.Decimal128.prototype.asPrintable = bson.Decimal128.prototype[toString];

  bson.Int32.prototype[toString] = function(): string {
    return `NumberInt(${this.valueOf()})`;
  };
  bson.Int32.prototype.asPrintable = bson.Int32.prototype[toString];

  bson.Long.prototype[toString] = function(): string {
    return `NumberLong("${this.toString()}")`;
  };
  bson.Long.prototype.asPrintable = bson.Long.prototype[toString];

  bson.Binary.prototype[toString] = function(): string {
    return `BinData(${this.sub_type}, "${this.value()}")`;
  };
  bson.Binary.prototype.asPrintable = bson.Binary.prototype[toString];
}
