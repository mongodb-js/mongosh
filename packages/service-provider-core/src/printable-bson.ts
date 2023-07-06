import { bson as BSON } from './index';
import { inspect } from 'util';
const inspectCustom = Symbol.for('nodejs.util.inspect.custom');

export const bsonStringifiers: Record<
  string,
  (this: any, depth: any, options: any) => string
> = {
  ObjectId: function (this: typeof BSON.ObjectId.prototype): string {
    return `ObjectId("${this.toHexString()}")`;
  },

  DBRef: function (
    this: typeof BSON.DBRef.prototype,
    depth: any,
    options: any
  ): string {
    return (
      `DBRef("${this.collection}", ` +
      inspect(this.oid, options) +
      (this.db ? `, "${this.db}"` : '') +
      ')'
    );
  },

  MaxKey: function (this: typeof BSON.MaxKey.prototype): string {
    return 'MaxKey()';
  },

  MinKey: function (this: typeof BSON.MinKey.prototype): string {
    return 'MinKey()';
  },

  Timestamp: function (this: typeof BSON.Timestamp.prototype): string {
    return `Timestamp({ t: ${this.getHighBits()}, i: ${this.getLowBits()} })`;
  },

  BSONSymbol: function (this: typeof BSON.BSONSymbol.prototype): string {
    return `BSONSymbol("${this.valueOf()}")`;
  },

  Code: function (this: typeof BSON.Code.prototype): string {
    const j = this.toJSON();
    return `Code("${j.code}"${j.scope ? `, ${JSON.stringify(j.scope)}` : ''})`;
  },

  Decimal128: function (this: typeof BSON.Decimal128.prototype): string {
    return `Decimal128("${this.toString()}")`;
  },

  Int32: function (this: typeof BSON.Int32.prototype): string {
    return `Int32(${this.valueOf()})`;
  },

  Long: function (this: typeof BSON.Long.prototype): string {
    return `Long("${this.toString()}"${this.unsigned ? ', true' : ''})`;
  },

  BSONRegExp: function (this: typeof BSON.BSONRegExp.prototype): string {
    return `BSONRegExp(${JSON.stringify(this.pattern)}, ${JSON.stringify(
      this.options
    )})`;
  },

  Binary: function (this: typeof BSON.Binary.prototype): string {
    const hexString = this.toString('hex');
    switch (this.sub_type) {
      case BSON.Binary.SUBTYPE_MD5:
        return `MD5("${hexString}")`;
      case BSON.Binary.SUBTYPE_UUID:
        if (hexString.length === 32) {
          // Format '0123456789abcdef0123456789abcdef' into
          // '01234567-89ab-cdef-0123-456789abcdef'.
          const asUUID = /^(.{8})(.{4})(.{4})(.{4})(.{12})$/
            .exec(hexString)!
            .slice(1, 6)
            .join('-');
          return `UUID("${asUUID}")`;
        }
      // In case somebody did something weird and used an UUID with a
      // non-standard length, fall through.
      default:
        return `Binary(Buffer.from("${hexString}", "hex"), ${this.sub_type})`;
    }
  },
};
bsonStringifiers.ObjectID = bsonStringifiers.ObjectId;

/**
 * This method modifies the BSON class passed in as argument. This is required so that
 * we can have the driver return our BSON classes without having to write our own serializer.
 * @param {Object} bson
 */
export default function (bson?: typeof BSON): void {
  if (!bson) {
    bson = BSON;
  }

  for (const [key, stringifier] of Object.entries(bsonStringifiers)) {
    if (!(key in bson)) {
      continue;
    }
    const cls = bson[key as keyof typeof BSON];
    for (const key of [inspectCustom, 'inspect']) {
      try {
        (cls as any).prototype[key] = stringifier;
      } catch {
        // This may fail because bson.ObjectId.prototype[toString] can exist as a
        // read-only property. https://github.com/mongodb/js-bson/pull/412 takes
        // care of this. In the CLI repl and Compass this still works fine, because
        // those are on bson@1.x.
      }
    }
  }
}
