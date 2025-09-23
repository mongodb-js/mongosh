import { bson as BSON } from './bson-export';
import type { InspectOptionsStylized, CustomInspectFunction } from 'util';
import { inspect as utilInspect } from 'util';
const inspectCustom = Symbol.for('nodejs.util.inspect.custom');
type BSONClassKey = (typeof BSON)[Exclude<
  keyof typeof BSON,
  'EJSON' | 'calculateObjectSize'
>]['prototype']['_bsontype'];

// Turn e.g. 'new Double(...)' into 'Double(...)' but preserve possible leading whitespace
function removeNewFromInspectResult(str: string): string {
  return str.replace(/^(\s*)(new )/, '$1');
}

/** Typed array such as Int8Array have a format like 'Int8Array(3) [1, 2, 3]'
 *  and we want to remove the prefix and keep just the array contents. */
function removeTypedArrayPrefixFromInspectResult(str: string): string {
  return str.replace(/^\s*\S+\s*\(\d+\)\s*/, '');
}

// Create a Node.js-util-inspect() style custom inspect function that
// strips 'new ' from inspect results but otherwise uses the Node.js
// driver's bson library's inspect functions.
function makeClasslessInspect<K extends BSONClassKey>(
  className: K
): CustomInspectFunction {
  const originalInspect = BSON[className].prototype.inspect;
  return function (
    this: (typeof BSON)[typeof className]['prototype'],
    ...args: Parameters<typeof originalInspect>
  ) {
    return removeNewFromInspectResult(originalInspect.apply(this, args));
  } satisfies CustomInspectFunction;
}

const binaryInspect = makeClasslessInspect('Binary');

const binaryVectorInspect = function (
  this: typeof BSON.Binary.prototype,
  depth: number,
  options: InspectOptionsStylized
): string {
  switch (this.buffer[0]) {
    case BSON.Binary.VECTOR_TYPE.Int8:
      return `Binary.fromInt8Array(new Int8Array(${removeTypedArrayPrefixFromInspectResult(
        utilInspect(this.toInt8Array(), {
          depth,
          ...options,
          // These arrays can be very large, so would prefer to use the default options instead.
          maxArrayLength: utilInspect.defaultOptions.maxArrayLength,
        })
      )}))`;
    case BSON.Binary.VECTOR_TYPE.Float32:
      return `Binary.fromFloat32Array(new Float32Array(${removeTypedArrayPrefixFromInspectResult(
        utilInspect(this.toFloat32Array(), {
          depth,
          ...options,
          // These arrays can be very large, so would prefer to use the default options instead.
          maxArrayLength: utilInspect.defaultOptions.maxArrayLength,
        })
      )}))`;
    case BSON.Binary.VECTOR_TYPE.PackedBit: {
      const paddingInfo = this.buffer[1] === 0 ? '' : `, ${this.buffer[1]}`;
      return `Binary.fromPackedBits(new Uint8Array(${removeTypedArrayPrefixFromInspectResult(
        utilInspect(this.toPackedBits(), {
          depth,
          ...options,
          // These arrays can be very large, so would prefer to use the default options instead.
          maxArrayLength: utilInspect.defaultOptions.maxArrayLength,
        })
      )})${paddingInfo})`;
    }
    default:
      return binaryInspect.call(this, depth, options);
  }
} satisfies CustomInspectFunction;

export const bsonStringifiers: Record<
  BSONClassKey | 'ObjectID',
  CustomInspectFunction
> = {
  ObjectId: makeClasslessInspect('ObjectId'),
  ObjectID: makeClasslessInspect('ObjectId'),
  DBRef: makeClasslessInspect('DBRef'),
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
  Binary: function (
    this: typeof BSON.Binary.prototype,
    ...args: Parameters<CustomInspectFunction>
  ): string {
    const hexString = this.toString('hex');

    switch (this.sub_type) {
      case BSON.Binary.SUBTYPE_VECTOR:
        return binaryVectorInspect.apply(this, args);
      case BSON.Binary.SUBTYPE_MD5:
        return `MD5('${hexString}')`;
      case BSON.Binary.SUBTYPE_UUID:
        if (hexString.length === 32) {
          // Format '0123456789abcdef0123456789abcdef' into
          // '01234567-89ab-cdef-0123-456789abcdef'.
          const asUUID = /^(.{8})(.{4})(.{4})(.{4})(.{12})$/
            .exec(hexString)!
            .slice(1, 6)
            .join('-');
          return `UUID('${asUUID}')`;
        }
      // In case somebody did something weird and used an UUID with a
      // non-standard length, fall through.
      default:
        return binaryInspect.apply(this, args);
    }
  } satisfies CustomInspectFunction,
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
