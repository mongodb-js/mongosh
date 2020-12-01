import { bson as BSON } from './index';
const inspectCustom = Symbol.for('nodejs.util.inspect.custom');

export const bsonStringifiers: Record<string, (this: any) => string> = {
  ObjectId: function(): string {
    return `ObjectId("${this.toHexString()}")`;
  },

  DBRef: function(): string {
    // NOTE: if OID is an ObjectId class it will just print the oid string.
    return `DBRef("${this.namespace}", "${
      this.oid === undefined || this.oid.toString === undefined ?
        this.oid :
        this.oid.toString()
    }"${this.db ? `, "${this.db}"` : ''})`;
  },

  MaxKey: function(): string {
    return '{ "$maxKey" : 1 }';
  },

  MinKey: function(): string {
    return '{ "$minKey" : 1 }';
  },

  Timestamp: function(): string {
    return `Timestamp(${this.getLowBits().toString()}, ${this.getHighBits().toString()})`;
  },

  BSONSymbol: function(): string {
    return `"${this.valueOf()}"`;
  },

  Code: function(): string {
    const j = this.toJSON();
    return `{ "code" : "${j.code}"${j.scope ? `, "scope" : ${JSON.stringify(j.scope)}` : ''} }`;
  },

  Decimal128: function(): string {
    return `NumberDecimal("${this.toString()}")`;
  },

  Int32: function(): string {
    return `NumberInt(${this.valueOf()})`;
  },

  Long: function(): string {
    return `NumberLong("${this.toString()}")`;
  },

  Binary: function(): string {
    const asBuffer = this.value(true);
    switch (this.sub_type) {
      case BSON.Binary.SUBTYPE_MD5:
        return `MD5("${asBuffer.toString('hex')}")`;
      case BSON.Binary.SUBTYPE_UUID:
        if (asBuffer.length === 16) {
          // Format '0123456789abcdef0123456789abcdef' into
          // '01234567-89ab-cdef-0123-456789abcdef'.
          const hex = asBuffer.toString('hex');
          const asUUID = hex.match(/^(.{8})(.{4})(.{4})(.{4})(.{12})$/)
            .slice(1, 6).join('-');
          return `UUID("${asUUID}")`;
        }
        // Fall through in case somebody did something weird and used an UUID
        // with a non-standard length.
        // eslint-disable-next-line no-fallthrough
      default:
        return `BinData(${this.sub_type}, "${asBuffer.toString('base64')}")`;
    }
  },
};

/**
 * This method modifies the BSON class passed in as argument. This is required so that
 * we can have the driver return our BSON classes without having to write our own serializer.
 * @param {Object} bson
 */
export default function(bson?: any): void {
  if (!bson) {
    bson = BSON;
  }

  for (const [ key, stringifier ] of Object.entries(bsonStringifiers)) {
    if (!(key in bson)) {
      continue;
    }
    const cls = bson[key];
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
