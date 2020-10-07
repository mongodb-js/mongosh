import Mongo from './mongo';
import { CursorIterationResult } from './result';
import {
  hasAsyncChild,
  returnsPromise,
  returnType,
  serverVersions,
  ShellApiClass,
  shellApiClassDefault
} from './decorators';
import {
  ServerVersions,
  asPrintable,
  usesRawValueInsteadOfPrintableForJavaShell
} from './enums';
import {
  Cursor as ServiceProviderCursor,
  CursorFlag,
  CURSOR_FLAGS,
  Document
} from '@mongosh/service-provider-core';
import { MongoshInvalidInputError, MongoshUnimplementedError } from '@mongosh/errors';

@shellApiClassDefault
@hasAsyncChild
export default class Cursor extends ShellApiClass {
  _mongo: Mongo;
  _cursor: ServiceProviderCursor;
  constructor(mongo, cursor) {
    super();
    this._cursor = cursor;
    this._mongo = mongo;
  }

  /// @deprecated toShellResult() returns both the raw value and the printable version now.
  get [usesRawValueInsteadOfPrintableForJavaShell](): boolean { return true; }

  /**
   * Internal method to determine what is printed for this class.
   */
  async [asPrintable](): Promise<CursorIterationResult> {
    return await this._it();
  }

  async _it(): Promise<CursorIterationResult> {
    const results = new CursorIterationResult();

    if (this.isClosed()) {
      return results;
    }

    for (let i = 0; i < 20; i++) {
      if (!await this.hasNext()) {
        break;
      }

      results.push(await this.next());
    }

    return results;
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
    const optionFlag = CURSOR_FLAGS[optionFlagNumber];

    if (!optionFlag) {
      throw new MongoshInvalidInputError(`Unknown option flag number: ${optionFlagNumber}.`);
    }

    if (optionFlag === CursorFlag.SlaveOk) {
      throw new MongoshUnimplementedError('the slaveOk option is not yet supported.');
    }

    this._cursor.addCursorFlag(optionFlag, true);
    return this;
  }

  @returnType('Cursor')
  allowPartialResults(): Cursor {
    this._addFlag(CursorFlag.Partial);
    return this;
  }

  @returnType('Cursor')
  batchSize(size: number): Cursor {
    this._cursor.batchSize(size);
    return this;
  }

  @returnType('Cursor')
  clone(): Cursor {
    return new Cursor(this._mongo, this._cursor.clone());
  }

  @returnsPromise
  async close(options: Document): Promise<void> {
    return await this._cursor.close(options as any);
  }

  @returnType('Cursor')
  @serverVersions(['3.4.0', ServerVersions.latest])
  collation(spec: Document): Cursor {
    this._cursor.collation(spec);
    return this;
  }

  @returnType('Cursor')
  @serverVersions(['3.2.0', ServerVersions.latest])
  comment(cmt: string): Cursor {
    this._cursor.comment(cmt);
    return this;
  }

  @serverVersions([ServerVersions.earliest, ServerVersions.latest]) // TODO: this technically deprecated
  @returnsPromise
  count(): Promise<number> {
    return this._cursor.count();
  }

  @returnsPromise
  async explain(verbosity: string): Promise<any> {
    // TODO: @maurizio we should probably move this in the Explain class?
    // NOTE: the node driver always returns the full explain plan
    // for Cursor and the queryPlanner explain for AggregationCursor.

    const fullExplain: any = await this._cursor.explain(verbosity); // use default. TODO: internal state track verbosity?

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
  forEach(f): Promise<void> {
    return this._cursor.forEach(f);
  }

  @returnsPromise
  hasNext(): Promise<boolean> {
    return this._cursor.hasNext();
  }

  @returnType('Cursor')
  hint(index: string): Cursor {
    this._cursor.hint(index);
    return this;
  }

  isClosed(): boolean {
    return this._cursor.isClosed();
  }

  async isExhausted(): Promise<boolean> {
    return this._cursor.isClosed() && !await this._cursor.hasNext();
  }

  @returnsPromise
  async itcount(): Promise<number> {
    let count = 0;

    while (await this.hasNext()) {
      await this.next();
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
  map(f): Cursor {
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
  next(): Promise<any> {
    return this._cursor.next();
  }

  @returnType('Cursor')
  noCursorTimeout(): Cursor {
    this._addFlag(CursorFlag.NoTimeout);
    return this;
  }

  @returnType('Cursor')
  oplogReplay(): Cursor {
    this._addFlag(CursorFlag.OplogReplay);
    return this;
  }

  @returnType('Cursor')
  projection(spec: Document): Cursor {
    this._cursor.project(spec);
    return this;
  }

  @returnType('Cursor')
  readPref(mode: string, tagSet?: Document[]): Cursor {
    if (tagSet) {
      throw new MongoshUnimplementedError('the tagSet argument is not yet supported.');
    }

    this._cursor.setReadPreference(mode as any);

    return this;
  }

  @returnType('Cursor')
  @serverVersions(['3.2.0', ServerVersions.latest])
  returnKey(enabled: boolean): Cursor {
    this._cursor.returnKey(enabled as any);
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
  tailable(): Cursor {
    this._addFlag(CursorFlag.Tailable);
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

  maxScan(): void {
    throw new MongoshUnimplementedError(
      '`maxScan()` was removed because it was deprecated in MongoDB 4.0');
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

  readConcern(): Cursor {
    throw new MongoshUnimplementedError('Setting readConcern on the cursor is not currently supported. See NODE-2806');
  }
}
