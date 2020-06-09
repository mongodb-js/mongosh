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
import { ServerVersions } from './enums';
import { Cursor as ServiceProviderCursor, Document } from '@mongosh/service-provider-core';

@shellApiClassDefault
@hasAsyncChild
export default class Cursor extends ShellApiClass {
  mongo: Mongo;
  cursor: ServiceProviderCursor;
  constructor(mongo, cursor) {
    super();
    this.cursor = cursor;
    this.mongo = mongo;
  }

  async toReplString(): Promise<any> {
    return await this._it();
  }

  async _it(): Promise<any> {
    const results = new CursorIterationResult();

    if (this.isClosed()) {
      return results;
    }

    for (let i = 0; i < 20; i++) { // TODO: ensure that assigning cursor doesn't iterate
      if (!await this.hasNext()) {
        break;
      }

      results.push(await this.next());
    }

    return results;
  }

  @returnType('Cursor')
  @serverVersions([ServerVersions.earliest, '3.2.0'])
  addOption(option: number): Cursor {
    this.cursor.addOption(option);
    return this;
  }

  @returnType('Cursor')
  allowPartialResults(): Cursor {
    this.cursor.allowPartialResults();
    return this;
  }

  @returnType('Cursor')
  batchSize(size: number): Cursor {
    this.cursor.batchSize(size);
    return this;
  }

  @returnType('Cursor')
  clone(): Cursor {
    return new Cursor(this.mongo, this.cursor.clone());
  }

  @returnsPromise
  close(options: Document): Promise<void> {
    return this.cursor.close(options);
  }

  @returnType('Cursor')
  @serverVersions(['3.4.0', ServerVersions.latest])
  collation(spec: Document): Cursor {
    this.cursor.collation(spec);
    return this;
  }

  @returnType('Cursor')
  @serverVersions(['3.2.0', ServerVersions.latest])
  comment(cmt: string): Cursor {
    this.cursor.comment(cmt);
    return this;
  }

  @serverVersions([ServerVersions.earliest, ServerVersions.latest]) // TODO: this technically deprecated
  @returnsPromise
  count(): Promise<number> {
    return this.cursor.count();
  }

  @returnsPromise
  explain(verbosity: string): Promise<any> {
    return this.cursor.explain(verbosity);
  }

  @returnsPromise
  forEach(f): Promise<void> {
    return this.cursor.forEach(f);
  }

  @returnsPromise
  hasNext(): Promise<boolean> {
    return this.cursor.hasNext();
  }

  @returnType('Cursor')
  hint(index: string): Cursor {
    this.cursor.hint(index);
    return this;
  }

  isClosed(): boolean {
    return this.cursor.isClosed();
  }

  isExhausted(): Promise<boolean> {
    return this.cursor.isExhausted();
  }

  @returnsPromise
  itcount(): Promise<number> {
    return this.cursor.itcount();
  }

  @returnType('Cursor')
  limit(value: number): Cursor {
    this.cursor.limit(value);
    return this;
  }

  @returnType('Cursor')
  map(f): Cursor {
    this.cursor.map(f);
    return this;
  }

  @returnType('Cursor')
  max(indexBounds: Document): Cursor {
    this.cursor.max(indexBounds);
    return this;
  }

  @returnType('Cursor')
  maxTimeMS(value: number): Cursor {
    this.cursor.maxTimeMS(value);
    return this;
  }

  @returnType('Cursor')
  min(indexBounds: Document): Cursor {
    this.cursor.min(indexBounds);
    return this;
  }

  @returnsPromise
  next(): Promise<any> {
    return this.cursor.next();
  }

  @returnType('Cursor')
  noCursorTimeout(): Cursor {
    this.cursor.noCursorTimeout();
    return this;
  }

  @returnType('Cursor')
  oplogReplay(): Cursor {
    this.cursor.oplogReplay();
    return this;
  }

  @returnType('Cursor')
  projection(spec: Document): Cursor {
    this.cursor.projection(spec);
    return this;
  }

  @returnType('Cursor')
  readPref(preference: string): Cursor {
    this.cursor.readPref(preference);
    return this;
  }

  @returnType('Cursor')
  @serverVersions(['3.2.0', ServerVersions.latest])
  returnKey(enabled: boolean): Cursor {
    this.cursor.returnKey(enabled);
    return this;
  }

  @returnsPromise
  size(): Promise<number> {
    return this.cursor.size();
  }

  @returnType('Cursor')
  skip(value: number): Cursor {
    this.cursor.skip(value);
    return this;
  }

  @returnType('Cursor')
  sort(spec: Document): Cursor {
    this.cursor.sort(spec);
    return this;
  }

  @returnType('Cursor')
  @serverVersions(['3.2.0', ServerVersions.latest])
  tailable(): Cursor {
    this.cursor.tailable();
    return this;
  }

  @returnsPromise
  toArray(): Promise<Document[]> {
    return this.cursor.toArray();
  }
}
