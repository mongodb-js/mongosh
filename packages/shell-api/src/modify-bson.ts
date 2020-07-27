import { toStringMethods } from './enums';
/**
 * This method modifies the BSON class passed in as argument. This is required so that
 * we can have the driver return our BSON classes without having to write our own serializer.
 * @param {Object} bson
 */
export default function(bson, platform): void {
  const toString = toStringMethods[platform];
  bson.Binary.prototype[toString] = function(): string {
    return `BinData(${this.value()})`;
  };

  bson.Code.prototype[toString] = function(): string {
    return this.toJSON();
  };

  bson.DBRef.prototype[toString] = function(): string {
    return `DBRef(${this.toJSON()})`;
  };

  bson.Decimal128.prototype[toString] = function(): string {
    return `NumberDecimal('${this.toString()}')`;
  };

  bson.Double.prototype[toString] = function(): string {
    return this.valueOf();
  };

  bson.Int32.prototype[toString] = function(): string {
    return this.valueOf();
  };

  bson.Long.prototype[toString] = function(): string {
    return `NumberLong(${this.toNumber()})`;
  };

  bson.MaxKey.prototype[toString] = function(): string {
    return '{ "$maxKey" : 1 }';
  };

  bson.MinKey.prototype[toString] = function(): string {
    return '{ "$minKey" : 1 }';
  };

  bson.ObjectId.prototype[toString] = function(): string {
    return `ObjectID('${this.toHexString()}')`;
  };

  bson.Symbol.prototype[toString] = function(): string {
    return `'${this.valueOf()}'`;
  };

  bson.Timestamp.prototype[toString] = function(): string {
    // TODO: use this.high and this.low to display timestamp instead of toString()
    return `Timestamp(${this.toString()})`;
  };
}
