import type { BSON, Long, Binary, ObjectId } from './bson-export';
import {
  CommonErrors,
  MongoshInternalError,
  MongoshInvalidInputError,
} from '@mongosh/errors';
import {
  assertArgsDefinedType,
  functionCtorWithoutProps,
  assignAll,
  pickWithExactKeyMatch,
} from './helpers';

type LongWithoutAccidentallyExposedMethods = Omit<
  typeof Long,
  'fromExtendedJSON'
>;
type BinaryType = Binary;
export interface ShellBsonBase<BSONLib extends BSON = BSON> {
  DBRef: BSONLib['DBRef'] &
    ((
      namespace: string,
      oid: any,
      db?: string,
      fields?: Document
    ) => BSONLib['DBRef']['prototype']);
  bsonsize: (object: any) => number;
  MaxKey: (() => BSONLib['MaxKey']['prototype']) & {
    toBSON: () => BSONLib['MaxKey']['prototype'];
  };
  MinKey: (() => BSONLib['MinKey']['prototype']) & {
    toBSON: () => BSONLib['MinKey']['prototype'];
  };
  ObjectId: BSONLib['ObjectId'] &
    ((
      id?: string | number | ObjectId | Buffer
    ) => BSONLib['ObjectId']['prototype']);
  Timestamp: BSONLib['Timestamp'] &
    ((
      t?: number | Long | { t: number; i: number },
      i?: number
    ) => BSONLib['Timestamp']['prototype']);
  Code: BSONLib['Code'] &
    ((c?: string | Function, s?: any) => BSONLib['Code']['prototype']);
  NumberDecimal: (s?: string) => BSONLib['Decimal128']['prototype'];
  NumberInt: (v?: string) => BSONLib['Int32']['prototype'];
  NumberLong: (s?: string | number) => BSONLib['Long']['prototype'];
  ISODate: (input?: string) => Date;
  BinData: (
    subtype: number,
    b64string: string
  ) => BSONLib['Binary']['prototype'];
  HexData: (subtype: number, hexstr: string) => BSONLib['Binary']['prototype'];
  UUID: (hexstr?: string) => BSONLib['Binary']['prototype'];
  MD5: (hexstr: string) => BSONLib['Binary']['prototype'];
  Decimal128: BSONLib['Decimal128'];
  BSONSymbol: BSONLib['BSONSymbol'];
  Int32: BSONLib['Int32'];
  Long: LongWithoutAccidentallyExposedMethods;
  Binary: BSONLib['Binary'];
  Double: BSONLib['Double'];
  EJSON: BSONLib['EJSON'];
  BSONRegExp: BSONLib['BSONRegExp'];
}

type WithHelp<T, Help> = {
  [prop in keyof T]: T[prop] & { help?: () => Help } & {
    prototype?: { help?: Help & (() => Help); _bsontype?: unknown };
  };
};

export type ShellBson<BSONLib extends BSON = BSON, Help = unknown> = WithHelp<
  ShellBsonBase<WithHelp<BSONLib, Help>>,
  Help
>;

export interface ShellBsonOptions<BSONLib extends BSON = BSON, Help = unknown> {
  bsonLibrary: BSONLib;
  printWarning: (msg: string) => void;
  assignMetadata?: (
    target: any,
    props: {
      minVersion?: string;
      maxVersion?: string;
      deprecated?: boolean;
      help?: Help;
    }
  ) => void;
  constructHelp?: (className: string) => Help;
}

/**
 * This method modifies the BSON class passed in as argument. This is required so that
 * we can have help, serverVersions, and other metadata on the bson classes constructed by the user.
 */
export function constructShellBson<
  BSONLib extends BSON = BSON,
  Help = unknown
>({
  bsonLibrary: bson,
  printWarning,
  assignMetadata,
  constructHelp,
}: ShellBsonOptions<BSONLib, Help>): ShellBson<BSONLib, Help> {
  const bsonNames: (keyof ShellBsonBase & keyof BSON)[] = [
    'Binary',
    'Code',
    'DBRef',
    'Decimal128',
    'Double',
    'Int32',
    'Long',
    'MaxKey',
    'MinKey',
    'ObjectId',
    'Timestamp',
    'BSONSymbol',
    'BSONRegExp',
  ]; // Statically set this so we can error if any are missing

  const helps: Partial<Record<keyof ShellBsonBase, Help>> = {};
  for (const className of bsonNames) {
    if (!(className in bson)) {
      throw new MongoshInternalError(
        `${className} does not exist in provided BSON package.`
      );
    }
    const help = constructHelp?.(className);
    helps[className] = help;
    if (!('prototype' in bson[className])) continue;
    assignMetadata?.(bson[className].prototype, {
      help: help,
      // Symbol is deprecated
      ...(className === 'BSONSymbol'
        ? { deprecated: true, maxVersion: '1.6.0' }
        : {}),
    });
  }

  const bsonPkg: ShellBson<BSONLib, Help> = {
    DBRef: assignAll(function DBRef(
      namespace: string,
      oid: any,
      db?: string,
      fields?: Document
    ): typeof bson.DBRef.prototype {
      assertArgsDefinedType(
        [namespace, oid, db],
        ['string', true, [undefined, 'string'], [undefined, 'object']],
        'DBRef'
      );
      return new bson.DBRef(namespace, oid, db, fields);
    },
    pickWithExactKeyMatch(bson.DBRef, ['prototype'])),
    // DBPointer not available in the bson 1.x library, but depreciated since 1.6
    bsonsize: function bsonsize(object: any): number {
      assertArgsDefinedType([object], ['object'], 'bsonsize');
      return bson.calculateObjectSize(object);
    },
    // See https://jira.mongodb.org/browse/MONGOSH-1024 for context on the toBSON additions
    MaxKey: assignAll(
      function MaxKey(): typeof bson.MaxKey.prototype {
        return new bson.MaxKey();
      },
      pickWithExactKeyMatch(bson.MaxKey, ['prototype']),
      { toBSON: () => new bson.MaxKey() }
    ),
    MinKey: assignAll(
      function MinKey(): typeof bson.MinKey.prototype {
        return new bson.MinKey();
      },
      pickWithExactKeyMatch(bson.MinKey, ['prototype']),
      { toBSON: () => new bson.MinKey() }
    ),
    ObjectId: assignAll(function ObjectId(
      id?: string | number | typeof bson.ObjectId.prototype | Buffer
    ): typeof bson.ObjectId.prototype {
      assertArgsDefinedType(
        [id],
        [[undefined, 'string', 'number', 'object']],
        'ObjectId'
      );
      if (typeof id === 'number') return bson.ObjectId.createFromTime(id);
      return new bson.ObjectId(id);
    },
    pickWithExactKeyMatch(bson.ObjectId, ['prototype', 'cacheHexString', 'generate', 'createFromTime', 'createFromHexString', 'createFromBase64', 'isValid'])),
    Timestamp: assignAll(function Timestamp(
      t?: number | typeof bson.Long.prototype | { t: number; i: number },
      i?: number
    ): typeof bson.Timestamp.prototype {
      assertArgsDefinedType(
        [t, i],
        [
          ['number', 'object', undefined],
          [undefined, 'number'],
        ],
        'Timestamp'
      );
      // Order of Timestamp() arguments is reversed in mongo/mongosh and the driver:
      // https://jira.mongodb.org/browse/MONGOSH-930
      // TODO(maybe at some point...): Drop support for the two-argument variant of Timestamp().
      if (typeof t === 'object' && t !== null && 't' in t && 'i' in t) {
        return new bson.Timestamp(t);
      } else if (i !== undefined || typeof t === 'number') {
        return new bson.Timestamp({ t: t as number, i: i ?? (0 as number) });
      }
      return new bson.Timestamp(t as typeof bson.Long.prototype);
    },
    pickWithExactKeyMatch(bson.Timestamp, ['prototype', 'fromInt', 'fromNumber', 'fromBits', 'fromString', 'MAX_VALUE'])),
    Code: assignAll(function Code(
      c: string | Function = '',
      s?: any
    ): typeof bson.Code.prototype {
      assertArgsDefinedType(
        [c, s],
        [
          [undefined, 'string', 'function'],
          [undefined, 'object'],
        ],
        'Code'
      );
      return new bson.Code(c, s);
    },
    pickWithExactKeyMatch(bson.Code, ['prototype'])),
    NumberDecimal: assignAll(
      function NumberDecimal(s = '0'): typeof bson.Decimal128.prototype {
        assertArgsDefinedType(
          [s],
          [['string', 'number', 'bson:Long', 'bson:Int32', 'bson:Decimal128']],
          'NumberDecimal'
        );
        if (typeof s === 'number') {
          printWarning(
            'NumberDecimal: specifying a number as argument is deprecated and may lead to loss of precision, pass a string instead'
          );
        }
        return bson.Decimal128.fromString(`${s}`);
      },
      { prototype: bson.Decimal128.prototype }
    ),
    NumberInt: assignAll(
      function NumberInt(v = '0'): typeof bson.Int32.prototype {
        v ??= '0';
        assertArgsDefinedType(
          [v],
          [['string', 'number', 'bson:Long', 'bson:Int32']],
          'NumberInt'
        );
        return new bson.Int32(parseInt(`${v}`, 10));
      },
      { prototype: bson.Int32.prototype }
    ),
    NumberLong: assignAll(
      function NumberLong(
        s: string | number = '0'
      ): typeof bson.Long.prototype {
        s ??= '0';
        assertArgsDefinedType(
          [s],
          [['string', 'number', 'bson:Long', 'bson:Int32']],
          'NumberLong'
        );
        if (typeof s === 'number') {
          printWarning(
            'NumberLong: specifying a number as argument is deprecated and may lead to loss of precision, pass a string instead'
          );
          return bson.Long.fromNumber(s);
        }
        return bson.Long.fromString(`${s}`);
      },
      { prototype: bson.Long.prototype }
    ),
    ISODate: function ISODate(
      input?: string | number | Date | undefined
    ): Date {
      if (input === undefined) return new Date();
      if (typeof input !== 'string') return new Date(input);
      const isoDateRegex =
        /^(?<Y>\d{4})-?(?<M>\d{2})-?(?<D>\d{2})([T ](?<h>\d{2})(:?(?<m>\d{2})(:?((?<s>\d{2})(\.(?<ms>\d+))?))?)?(?<tz>Z|([+-])(\d{2}):?(\d{2})?)?)?$/;
      const match = isoDateRegex.exec(input);
      if (match !== null && match.groups !== undefined) {
        // Normalize the representation because ISO-8601 accepts e.g.
        // '20201002T102950Z' without : and -, but `new Date()` does not.
        const { Y, M, D, h, m, s, ms, tz } = match.groups;
        const normalized = `${Y}-${M}-${D}T${h || '00'}:${m || '00'}:${
          s || '00'
        }.${ms || '000'}${tz || 'Z'}`;
        const date = new Date(normalized);
        // Make sur we're in the range 0000-01-01T00:00:00.000Z - 9999-12-31T23:59:59.999Z
        if (
          date.getTime() >= -62167219200000 &&
          date.getTime() <= 253402300799999
        ) {
          return date;
        }
      }
      throw new MongoshInvalidInputError(
        `${JSON.stringify(input)} is not a valid ISODate`,
        CommonErrors.InvalidArgument
      );
    },
    BinData: assignAll(
      function BinData(subtype: number, b64string: string): BinaryType {
        // this from 'help misc' in old shell
        assertArgsDefinedType(
          [subtype, b64string],
          ['number', 'string'],
          'BinData'
        );
        const buffer = Buffer.from(b64string, 'base64');
        return new bson.Binary(buffer, subtype);
      },
      { prototype: bson.Binary.prototype }
    ),
    HexData: assignAll(
      function HexData(subtype: number, hexstr: string): BinaryType {
        assertArgsDefinedType(
          [subtype, hexstr],
          ['number', 'string'],
          'HexData'
        );
        const buffer = Buffer.from(hexstr, 'hex');
        return new bson.Binary(buffer, subtype);
      },
      { prototype: bson.Binary.prototype }
    ),
    UUID: assignAll(
      function UUID(hexstr?: string): BinaryType {
        if (hexstr === undefined) {
          // TODO(MONGOSH-2710): Actually use UUID instances from `bson`
          // (but then also be consistent about that when we e.g. receive
          // them from the server).
          hexstr = new bson.UUID().toString();
        }
        assertArgsDefinedType([hexstr], ['string'], 'UUID');
        // Strip any dashes, as they occur in the standard UUID formatting
        // (e.g. 01234567-89ab-cdef-0123-456789abcdef).
        const buffer = Buffer.from((hexstr as string).replace(/-/g, ''), 'hex');
        return new bson.Binary(buffer, bson.Binary.SUBTYPE_UUID);
      },
      { prototype: bson.Binary.prototype }
    ),
    MD5: assignAll(
      function MD5(hexstr: string): BinaryType {
        assertArgsDefinedType([hexstr], ['string'], 'MD5');
        const buffer = Buffer.from(hexstr, 'hex');
        return new bson.Binary(buffer, bson.Binary.SUBTYPE_MD5);
      },
      { prototype: bson.Binary.prototype }
    ),
    // Add the driver types to bsonPkg so we can deprecate the shell ones later
    Decimal128: assignAll(
      functionCtorWithoutProps(bson.Decimal128),
      pickWithExactKeyMatch(bson.Decimal128, [
        'prototype',
        'fromString',
        'fromStringWithRounding',
      ])
    ),
    BSONSymbol: assignAll(
      functionCtorWithoutProps(bson.BSONSymbol),
      pickWithExactKeyMatch(bson.BSONSymbol, ['prototype'])
    ),
    Int32: assignAll(
      functionCtorWithoutProps(bson.Int32),
      pickWithExactKeyMatch(bson.Int32, ['prototype', 'fromString'])
    ),
    Long: assignAll(
      functionCtorWithoutProps(bson.Long),
      pickWithExactKeyMatch(
        bson.Long as LongWithoutAccidentallyExposedMethods,
        [
          'prototype',
          'fromValue',
          'isLong',
          'fromBytesBE',
          'fromBytesLE',
          'fromBytes',
          'fromString',
          'fromStringStrict',
          'fromBigInt',
          'fromNumber',
          'fromInt',
          'fromBits',
          'MIN_VALUE',
          'MAX_VALUE',
          'NEG_ONE',
          'UONE',
          'ONE',
          'UZERO',
          'ZERO',
          'MAX_UNSIGNED_VALUE',
          'TWO_PWR_24',
        ]
      )
    ),
    Binary: assignAll(
      functionCtorWithoutProps(bson.Binary),
      pickWithExactKeyMatch(bson.Binary, [
        'prototype',
        'createFromBase64',
        'createFromHexString',
        'fromInt8Array',
        'fromFloat32Array',
        'fromPackedBits',
        'fromBits',
        'BUFFER_SIZE',
        'SUBTYPE_DEFAULT',
        'SUBTYPE_FUNCTION',
        'SUBTYPE_BYTE_ARRAY',
        'SUBTYPE_UUID_OLD',
        'SUBTYPE_UUID',
        'SUBTYPE_MD5',
        'SUBTYPE_ENCRYPTED',
        'SUBTYPE_COLUMN',
        'SUBTYPE_SENSITIVE',
        'SUBTYPE_VECTOR',
        'SUBTYPE_USER_DEFINED',
        'VECTOR_TYPE',
      ])
    ),
    Double: assignAll(
      functionCtorWithoutProps(bson.Double),
      pickWithExactKeyMatch(bson.Double, ['prototype', 'fromString'])
    ),
    BSONRegExp: assignAll(
      functionCtorWithoutProps(bson.BSONRegExp),
      pickWithExactKeyMatch(bson.BSONRegExp, ['prototype', 'parseOptions'])
    ),
    // Clone EJSON here so that it's not a frozen object in the shell
    EJSON: pickWithExactKeyMatch(bson.EJSON, [
      'parse',
      'serialize',
      'stringify',
      'deserialize',
    ]),
  };

  for (const className of Object.keys(bsonPkg) as (keyof ShellBson)[]) {
    const help = helps[className] ?? constructHelp?.(className);
    if (!help) continue;
    bsonPkg[className].help = (): Help => help;
    Object.setPrototypeOf(bsonPkg[className].help, help);
  }
  return bsonPkg;
}
