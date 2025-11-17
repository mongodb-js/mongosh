import type { BSON } from './';
import type {
  InspectOptionsStylized,
  CustomInspectFunction,
  InspectOptions,
} from 'util';
const inspectCustom = Symbol.for('nodejs.util.inspect.custom');
type BSONClassKey = BSON[Exclude<
  keyof BSON,
  'EJSON' | 'calculateObjectSize'
>]['prototype']['_bsontype'];

let coreUtilInspect: ((obj: any, options: InspectOptions) => string) & {
  defaultOptions: InspectOptions;
};
function inspectTypedArray(
  obj: Iterable<number>,
  options: InspectOptions
): string {
  try {
    coreUtilInspect ??= require('util').inspect;
    return coreUtilInspect(obj, {
      ...options,
      // These arrays can be very large, so would prefer to use the default options instead.
      maxArrayLength: coreUtilInspect.defaultOptions.maxArrayLength,
    });
  } catch {
    const arr = Array.from(obj);
    if (arr.length > 100) {
      return `[${arr.slice(0, 100).join(', ')}, ... ${
        arr.length - 100
      } more items]`;
    }
    return `[${arr.join(', ')}]`;
  }
}

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
  cls: BSON[K]
): CustomInspectFunction {
  const originalInspect = cls.prototype.inspect;
  return function (
    this: BSON[K]['prototype'],
    ...args: Parameters<typeof originalInspect>
  ) {
    return removeNewFromInspectResult(originalInspect.apply(this, args));
  } satisfies CustomInspectFunction;
}

const makeBinaryVectorInspect = (bsonLibrary: BSON): CustomInspectFunction => {
  return function (
    this: BSON['Binary']['prototype'],
    depth: number,
    options: InspectOptionsStylized
  ): string {
    const binaryInspect = makeClasslessInspect(bsonLibrary.Binary);
    switch (this.buffer[0]) {
      case bsonLibrary.Binary.VECTOR_TYPE.Int8:
        return `Binary.fromInt8Array(new Int8Array(${removeTypedArrayPrefixFromInspectResult(
          inspectTypedArray(this.toInt8Array(), {
            depth,
            ...options,
          })
        )}))`;
      case bsonLibrary.Binary.VECTOR_TYPE.Float32:
        return `Binary.fromFloat32Array(new Float32Array(${removeTypedArrayPrefixFromInspectResult(
          inspectTypedArray(this.toFloat32Array(), {
            depth,
            ...options,
          })
        )}))`;
      case bsonLibrary.Binary.VECTOR_TYPE.PackedBit: {
        const paddingInfo = this.buffer[1] === 0 ? '' : `, ${this.buffer[1]}`;
        return `Binary.fromPackedBits(new Uint8Array(${removeTypedArrayPrefixFromInspectResult(
          inspectTypedArray(this.toPackedBits(), {
            depth,
            ...options,
          })
        )})${paddingInfo})`;
      }
      default:
        return binaryInspect.call(this, depth, options);
    }
  } satisfies CustomInspectFunction;
};

export const makeBsonStringifiers: (
  bsonLibrary: BSON
) => Record<BSONClassKey | 'ObjectID', CustomInspectFunction> = (
  bsonLibrary
) => {
  const binaryVectorInspect = makeBinaryVectorInspect(bsonLibrary);
  const binaryInspect = makeClasslessInspect(bsonLibrary.Binary);
  return {
    ObjectId: makeClasslessInspect(bsonLibrary.ObjectId),
    ObjectID: makeClasslessInspect(bsonLibrary.ObjectId),
    DBRef: makeClasslessInspect(bsonLibrary.DBRef),
    MaxKey: makeClasslessInspect(bsonLibrary.MaxKey),
    MinKey: makeClasslessInspect(bsonLibrary.MinKey),
    Timestamp: makeClasslessInspect(bsonLibrary.Timestamp),
    BSONSymbol: makeClasslessInspect(bsonLibrary.BSONSymbol),
    Code: makeClasslessInspect(bsonLibrary.Code),
    Decimal128: makeClasslessInspect(bsonLibrary.Decimal128),
    Int32: makeClasslessInspect(bsonLibrary.Int32),
    Long: makeClasslessInspect(bsonLibrary.Long),
    Double: makeClasslessInspect(bsonLibrary.Double),
    BSONRegExp: makeClasslessInspect(bsonLibrary.BSONRegExp),
    Binary: function (
      this: BSON['Binary']['prototype'],
      ...args: Parameters<CustomInspectFunction>
    ): string {
      const hexString = this.toString('hex');

      switch (this.sub_type) {
        case bsonLibrary.Binary.SUBTYPE_VECTOR:
          return binaryVectorInspect.apply(this, args);
        case bsonLibrary.Binary.SUBTYPE_MD5:
          return `MD5('${hexString}')`;
        case bsonLibrary.Binary.SUBTYPE_UUID:
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
};

/**
 * This method modifies the BSON class passed in as argument. This is required so that
 * we can have the driver return our BSON classes without having to write our own serializer.
 * @param {Object} bson
 */
export function makePrintableBson(bsonLibrary: BSON): void {
  for (const [key, stringifier] of Object.entries(
    makeBsonStringifiers(bsonLibrary)
  )) {
    if (!(key in bsonLibrary)) {
      continue;
    }
    const cls = bsonLibrary[key as keyof BSON];
    for (const key of [inspectCustom, 'inspect']) {
      (cls as any).prototype[key] = stringifier;
    }
  }
}
