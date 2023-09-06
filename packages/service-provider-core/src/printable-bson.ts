import { bson as BSON } from './bson-export';
import { inspect } from 'util';
const inspectCustom = Symbol.for('nodejs.util.inspect.custom');
type BSONClassKey = (typeof BSON)[Exclude<
  keyof typeof BSON,
  'EJSON' | 'calculateObjectSize'
>]['prototype']['_bsontype'];

// Turn e.g. 'new Double(...)' into 'Double(...)' but preserve possible leading whitespace
function removeNewFromInspectResult(str: string): string {
  return String(str).replace(/^(\s*)(new )/, '$1');
}

// Create a Node.js-util-inspect() style custom inspect function that
// strips 'new ' from inspect results but otherwise uses the Node.js
// driver's bson library's inspect functions.
function makeClasslessInspect<K extends BSONClassKey>(className: K) {
  const originalInspect = BSON[className].prototype.inspect;
  return function (
    this: (typeof BSON)[typeof className]['prototype'],
    ...args: any
  ) {
    return removeNewFromInspectResult(originalInspect.apply(this, args as any));
  };
}

export const bsonStringifiers: Record<
  BSONClassKey | 'ObjectID',
  (this: any, depth: any, options: any) => string
> = {
  ObjectId: makeClasslessInspect('ObjectId'),
  ObjectID: makeClasslessInspect('ObjectId'),
  DBRef: function (
    this: typeof BSON.DBRef.prototype,
    depth: any,
    options: any
  ): string {
    return (
      `DBRef("${this.collection}", ` +
      inspect(this.oid, options) + // The driver's inspect() does not account for non-ObjectID oid values
      (this.db ? `, ${inspect(this.db, options)}` : '') +
      ')'
    );
  },
  MaxKey: makeClasslessInspect('MaxKey'),
  MinKey: makeClasslessInspect('MinKey'),
  Timestamp: makeClasslessInspect('Timestamp'),
  BSONSymbol: makeClasslessInspect('BSONSymbol'),
  Code: makeClasslessInspect('Code'),
  Decimal128: makeClasslessInspect('Decimal128'),
  Int32: makeClasslessInspect('Int32'),
  Long: makeClasslessInspect('Long'),
  Double: makeClasslessInspect('Double'),
  BSONRegExp: makeClasslessInspect('BSONRegExp'),
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
        return `Binary.createFromBase64("${this.toString('base64')}", ${
          this.sub_type
        })`;
    }
  },
};

/**
 * This method modifies the BSON class passed in as argument. This is required so that
 * we can have the driver return our BSON classes without having to write our own serializer.
 * @param {Object} bson
 */
export function makePrintableBson(bson?: typeof BSON): void {
  if (!bson) {
    bson = BSON;
  }

  for (const [key, stringifier] of Object.entries(bsonStringifiers)) {
    if (!(key in bson)) {
      continue;
    }
    const cls = bson[key as keyof typeof BSON];
    for (const key of [inspectCustom, 'inspect']) {
      (cls as any).prototype[key] = stringifier;
    }
  }
}
