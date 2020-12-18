import { CommonErrors, MongoshDeprecatedError, MongoshInvalidInputError, MongoshUnimplementedError } from '@mongosh/errors';
import {
  hasAsyncChild,
  returnsPromise,
  returnType,
  serverVersions,
  ShellApiClass,
  shellApiClassDefault,
  toShellResult
} from './decorators';
import {
  ServerVersions,
  asPrintable,
  CURSOR_FLAGS
} from './enums';
import {
  FindCursor as ServiceProviderCursor,
  CursorFlag,
  Document,
  CollationOptions,
  ExplainVerbosityLike,
  ReadPreferenceLike,
  ReadConcernLevelId
} from '@mongosh/service-provider-core';
import { blockedByDriverMetadata } from './error-codes';
import { iterate, validateExplainableVerbosity } from './helpers';
import Mongo from './mongo';
import { CursorIterationResult } from './result';
import { printWarning } from './deprecation-warning';

@shellApiClassDefault
@hasAsyncChild
export default class Cursor extends ShellApiClass {
  _mongo: Mongo;
  _cursor: ServiceProviderCursor;
  _currentIterationResult: CursorIterationResult | null = null;
  _tailable = false;

  constructor(mongo: Mongo, cursor: ServiceProviderCursor) {
    super();
    this._cursor = cursor;
    this._mongo = mongo;
  }

  /**
   * Internal method to determine what is printed for this class.
   */
  async [asPrintable](): Promise<CursorIterationResult> {
    return (await toShellResult(this._currentIterationResult ?? await this._it())).printable;
  }

  async _it(): Promise<CursorIterationResult> {
    const results = this._currentIterationResult = new CursorIterationResult();
    return iterate(results, this._cursor);
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
  addOption(optionFlagNumber: number): Cursor {
    if (optionFlagNumber === 4) {
      throw new MongoshUnimplementedError('the slaveOk option is not supported.', CommonErrors.NotImplemented);
    }

    const optionFlag: CursorFlag | undefined = (CURSOR_FLAGS as any)[optionFlagNumber];

    if (!optionFlag) {
      throw new MongoshInvalidInputError(`Unknown option flag number: ${optionFlagNumber}.`, CommonErrors.InvalidArgument);
    }

    this._cursor.addCursorFlag(optionFlag, true);
    return this;
  }

  @returnType('Cursor')
  allowPartialResults(): Cursor {
    this._addFlag('partial' as CursorFlag);
    return this;
  }

  @returnType('Cursor')
  batchSize(size: number): Cursor {
    this._cursor.batchSize(size);
    return this;
  }

  @returnsPromise
  async close(options: Document): Promise<void> {
    await this._cursor.close(options);
  }

  @returnType('Cursor')
  @serverVersions(['3.4.0', ServerVersions.latest])
  collation(spec: CollationOptions): Cursor {
    this._cursor.collation(spec);
    return this;
  }

  @returnType('Cursor')
  @serverVersions(['3.2.0', ServerVersions.latest])
  comment(cmt: string): Cursor {
    this._cursor.comment(cmt);
    return this;
  }

  @serverVersions([ServerVersions.earliest, '4.0.0'])
  @returnsPromise
  count(): Promise<number> {
    return this._cursor.count();
  }

  @returnsPromise
  async explain(verbosity?: ExplainVerbosityLike): Promise<any> {
    // TODO: @maurizio we should probably move this in the Explain class?
    // NOTE: the node driver always returns the full explain plan
    // for Cursor and the queryPlanner explain for AggregationCursor.
    if (verbosity !== undefined) {
      verbosity = validateExplainableVerbosity(verbosity);
    }
    const fullExplain: any = await this._cursor.explain(verbosity);

    const explain: any = {
      ...fullExplain
    };

    if (
      verbosity !== 'executionStats' &&
      verbosity !== 'allPlansExecution' &&
      explain.executionStats
    ) {
      delete explain.executionStats;
    }

    if (verbosity === 'executionStats' &&
      explain.executionStats &&
      explain.executionStats.allPlansExecution) {
      delete explain.executionStats.allPlansExecution;
    }

    return explain;
  }

  @returnsPromise
  forEach(f: (doc: Document) => void): Promise<void> {
    return this._cursor.forEach(f);
  }

  @returnsPromise
  hasNext(): Promise<boolean> {
    if (this._tailable) {
      printWarning(
        'If this is a tailable cursor with awaitData, and there are no documents in the batch, this method ' +
        'will will block. Use tryNext if you want to check if there are any documents without waiting.',
        this._mongo._internalState.context.print
      );
    }
    return this._cursor.hasNext();
  }

  @returnsPromise
  tryNext(): Promise<Document | null> {
    return this._cursor.tryNext();
  }

  async* [Symbol.asyncIterator]() {
    let doc;
    while ((doc = await this.tryNext()) !== null) {
      yield doc;
    }
  }

  @returnType('Cursor')
  hint(index: string): Cursor {
    this._cursor.hint(index);
    return this;
  }

  isClosed(): boolean {
    return this._cursor.closed;
  }

  isExhausted(): boolean {
    return this.isClosed() && this.objsLeftInBatch() === 0;
  }

  @returnsPromise
  async itcount(): Promise<number> {
    let count = 0;
    while (await this.tryNext()) {
      count++;
    }
    return count;
  }

  @returnType('Cursor')
  limit(value: number): Cursor {
    this._cursor.limit(value);
    return this;
  }

  @returnType('Cursor')
  map(f: (doc: Document) => Document): Cursor {
    this._cursor.map(f);
    return this;
  }

  @returnType('Cursor')
  max(indexBounds: Document): Cursor {
    this._cursor.max(indexBounds);
    return this;
  }

  @returnType('Cursor')
  maxTimeMS(value: number): Cursor {
    this._cursor.maxTimeMS(value);
    return this;
  }

  @returnType('Cursor')
  @serverVersions(['3.2.0', ServerVersions.latest])
  maxAwaitTimeMS(value: number): Cursor {
    this._cursor.maxAwaitTimeMS(value);
    return this;
  }

  @returnType('Cursor')
  min(indexBounds: Document): Cursor {
    this._cursor.min(indexBounds);
    return this;
  }

  @returnsPromise
  next(): Promise<Document | null> {
    if (this._tailable) {
      printWarning(
        'If this is a tailable cursor with awaitData, and there are no documents in the batch, this' +
        ' method will will block. Use tryNext if you want to check if there are any documents without waiting.',
        this._mongo._internalState.context.print
      );
    }
    return this._cursor.next();
  }

  @returnType('Cursor')
  noCursorTimeout(): Cursor {
    this._addFlag('noCursorTimeout' as CursorFlag);
    return this;
  }

  @returnType('Cursor')
  oplogReplay(): Cursor {
    this._addFlag('oplogReplay' as CursorFlag);
    return this;
  }

  @returnType('Cursor')
  projection(spec: Document): Cursor {
    this._cursor.project(spec);
    return this;
  }

  @returnType('Cursor')
  readPref(mode: ReadPreferenceLike, tagSet?: Document[]): Cursor {
    if (tagSet) {
      throw new MongoshUnimplementedError(
        'the tagSet argument is not yet supported.',
        CommonErrors.NotImplemented,
        blockedByDriverMetadata('Cursor.readPref#tagSet')
      );
    }

    this._cursor = this._cursor.withReadPreference(mode);
    return this;
  }

  @returnType('Cursor')
  @serverVersions(['3.2.0', ServerVersions.latest])
  returnKey(enabled: boolean): Cursor {
    this._cursor.returnKey(enabled);
    return this;
  }

  @returnsPromise
  size(): Promise<number> {
    return this._cursor.count();
  }

  @returnType('Cursor')
  skip(value: number): Cursor {
    this._cursor.skip(value);
    return this;
  }

  @returnType('Cursor')
  sort(spec: Document): Cursor {
    this._cursor.sort(spec);
    return this;
  }

  @returnType('Cursor')
  @serverVersions(['3.2.0', ServerVersions.latest])
  tailable(opts = { awaitData: false }): Cursor {
    this._tailable = true;
    this._addFlag('tailable' as CursorFlag);
    if (opts.awaitData) {
      this._addFlag('awaitData' as CursorFlag);
    }
    return this;
  }

  @returnsPromise
  toArray(): Promise<Document[]> {
    return this._cursor.toArray();
  }

  @returnType('Cursor')
  pretty(): Cursor {
    return this;
  }

  @serverVersions([ServerVersions.earliest, '4.0.0'])
  maxScan(): void {
    throw new MongoshDeprecatedError(
      '`maxScan()` was removed because it was deprecated in MongoDB 4.0'
    );
  }

  @returnType('Cursor')
  @serverVersions(['3.2.0', ServerVersions.latest])
  showRecordId(): Cursor {
    this._cursor.showRecordId(true);
    return this;
  }

  objsLeftInBatch(): number {
    return this._cursor.bufferedCount();
  }

  @returnType('Cursor')
  readConcern(level: ReadConcernLevelId): Cursor {
    this._cursor = this._cursor.withReadConcern({ level });
    return this;
  }
}
