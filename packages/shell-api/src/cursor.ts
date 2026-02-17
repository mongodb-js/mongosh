import {
  CommonErrors,
  MongoshDeprecatedError,
  MongoshInvalidInputError,
  MongoshUnimplementedError,
} from '@mongosh/errors';
import {
  returnsPromise,
  returnType,
  apiVersions,
  serverVersions,
  shellApiClassDefault,
  deprecated,
  cursorChainable,
} from './decorators';
import { ServerVersions, CURSOR_FLAGS } from './enums';
import type {
  ServiceProviderFindCursor,
  CursorFlag,
  Document,
  CollationOptions,
  ReadPreferenceLike,
  ReadConcernLevel,
  TagSet,
  HedgeOptions,
} from '@mongosh/service-provider-core';
import type Mongo from './mongo';
import { AggregateOrFindCursor } from './aggregate-or-find-cursor';
import type { CursorConstructionOptionsWithChains } from './abstract-cursor';

@shellApiClassDefault
export default class Cursor extends AggregateOrFindCursor<ServiceProviderFindCursor> {
  _tailable = false;

  constructor(
    mongo: Mongo,
    cursor: ServiceProviderFindCursor,
    constructionOptionsWithChains?: CursorConstructionOptionsWithChains
  ) {
    super(mongo, cursor, constructionOptionsWithChains);
  }

  /**
   * Throw a custom exception when a user attempts to serialize a cursor,
   * pointing to the fact that .toArray() needs to be called first.
   *
   * @param {CursorFlag} flag - The cursor flag.
   *
   * @returns {void}
   */
  toJSON(): void {
    throw new MongoshInvalidInputError(
      'Cannot serialize a cursor to JSON. Did you mean to call .toArray() first?',
      CommonErrors.InvalidArgument
    );
  }

  /**
   * Add a flag and return the cursor.
   *
   * @param {CursorFlag} flag - The cursor flag.
   *
   * @returns {void}
   */
  private _addFlag(flag: CursorFlag): void {
    this._cursor.addCursorFlag(flag, true);
  }

  @returnType('Cursor')
  @serverVersions([ServerVersions.earliest, '3.2.0'])
  @cursorChainable
  addOption(optionFlagNumber: number): this {
    if (optionFlagNumber === 4) {
      throw new MongoshUnimplementedError(
        'the slaveOk option is not supported.',
        CommonErrors.NotImplemented
      );
    }
    const optionFlag: CursorFlag | undefined = (CURSOR_FLAGS as any)[
      optionFlagNumber
    ];

    if (!optionFlag) {
      throw new MongoshInvalidInputError(
        `Unknown option flag number: ${optionFlagNumber}.`,
        CommonErrors.InvalidArgument
      );
    }

    this._cursor.addCursorFlag(optionFlag, true);
    return this;
  }

  @returnType('Cursor')
  @serverVersions(['4.4.0', ServerVersions.latest])
  @cursorChainable
  allowDiskUse(allow?: boolean): this {
    this._cursor.allowDiskUse(allow);
    return this;
  }

  @returnType('Cursor')
  @cursorChainable
  allowPartialResults(): this {
    this._addFlag('partial');
    return this;
  }

  @returnType('Cursor')
  @serverVersions(['3.4.0', ServerVersions.latest])
  @cursorChainable
  collation(spec: CollationOptions): this {
    this._cursor.collation(spec);
    return this;
  }

  @returnType('Cursor')
  @serverVersions(['3.2.0', ServerVersions.latest])
  @cursorChainable
  comment(cmt: string): this {
    this._cursor.comment(cmt);
    return this;
  }

  @serverVersions([ServerVersions.earliest, '4.0.0'])
  @returnsPromise
  @deprecated
  async count(): Promise<number> {
    return await this._cursor.count();
  }

  @returnsPromise
  async hasNext(): Promise<boolean> {
    if (this._tailable && !this._blockingWarningDisabled) {
      await this._instanceState.printWarning(
        'If this is a tailable cursor with awaitData, and there are no documents in the batch, this method ' +
          'will will block. Use tryNext if you want to check if there are any documents without waiting, or ' +
          'cursor.disableBlockWarnings() if you want to disable this warning.'
      );
    }
    return super.hasNext();
  }

  @returnType('Cursor')
  @cursorChainable
  hint(index: string): this {
    this._cursor.hint(index);
    return this;
  }

  @returnType('Cursor')
  @cursorChainable
  limit(value: number): this {
    this._cursor.limit(value);
    return this;
  }

  @returnType('Cursor')
  @cursorChainable
  max(indexBounds: Document): this {
    this._cursor.max(indexBounds);
    return this;
  }

  @returnType('Cursor')
  @serverVersions(['3.2.0', ServerVersions.latest])
  @cursorChainable
  maxAwaitTimeMS(value: number): this {
    this._cursor.maxAwaitTimeMS(value);
    return this;
  }

  @returnType('Cursor')
  @cursorChainable
  min(indexBounds: Document): this {
    this._cursor.min(indexBounds);
    return this;
  }

  @returnsPromise
  async next(): Promise<Document | null> {
    if (this._tailable && !this._blockingWarningDisabled) {
      await this._instanceState.printWarning(
        'If this is a tailable cursor with awaitData, and there are no documents in the batch, this' +
          ' method will will block. Use tryNext if you want to check if there are any documents without waiting,' +
          ' or cursor.disableBlockWarnings() if you want to disable this warning.'
      );
    }
    return super.next();
  }

  @returnType('Cursor')
  @cursorChainable
  noCursorTimeout(): this {
    this._addFlag('noCursorTimeout');
    return this;
  }

  @returnType('Cursor')
  @cursorChainable
  oplogReplay(): this {
    this._addFlag('oplogReplay');
    return this;
  }

  @returnType('Cursor')
  @cursorChainable
  readPref(
    mode: ReadPreferenceLike,
    tagSet?: TagSet[],
    hedgeOptions?: HedgeOptions
  ): this {
    let pref: ReadPreferenceLike;

    // Only conditionally use readPreferenceFromOptions, for java-shell compatibility.
    if (tagSet || hedgeOptions) {
      pref = this._mongo._serviceProvider.readPreferenceFromOptions({
        readPreference: mode,
        readPreferenceTags: tagSet,
        hedge: hedgeOptions,
      }) as ReadPreferenceLike;
    } else {
      pref = mode;
    }
    this._cursor = this._cursor.withReadPreference(pref);
    return this;
  }

  @returnType('Cursor')
  @serverVersions(['3.2.0', ServerVersions.latest])
  @cursorChainable
  returnKey(enabled: boolean): this {
    this._cursor.returnKey(enabled);
    return this;
  }

  @returnsPromise
  async size(): Promise<number> {
    return await this._cursor.count();
  }

  @returnType('Cursor')
  @serverVersions(['3.2.0', ServerVersions.latest])
  @apiVersions([])
  @cursorChainable
  tailable(opts = { awaitData: false }): this {
    this._tailable = true;
    this._addFlag('tailable');
    if (opts.awaitData) {
      this._addFlag('awaitData');
    }
    return this;
  }

  @deprecated
  @serverVersions([ServerVersions.earliest, '4.0.0'])
  @cursorChainable
  maxScan(): void {
    throw new MongoshDeprecatedError(
      '`maxScan()` was removed because it was deprecated in MongoDB 4.0'
    );
  }

  @returnType('Cursor')
  @serverVersions(['3.2.0', ServerVersions.latest])
  @cursorChainable
  showRecordId(): this {
    this._cursor.showRecordId(true);
    return this;
  }

  @returnType('Cursor')
  @cursorChainable
  readConcern(level: ReadConcernLevel): this {
    this._cursor = this._cursor.withReadConcern({ level });
    return this;
  }
}
