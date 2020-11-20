import {
  classPlatforms,
  classReturnsPromise,
  hasAsyncChild,
  returnsPromise,
  ShellApiClass,
  shellApiClassDefault
} from './decorators';
import { Document, ReplPlatform, ServiceProviderSession, SessionOptions, TransactionOptions } from '@mongosh/service-provider-core';
import { asPrintable } from './enums';
import Mongo from './mongo';
import Database from './database';
import { MongoshInvalidInputError, MongoshUnimplementedError } from '@mongosh/errors';
import { assertArgsDefined, assertArgsType } from './helpers';

@shellApiClassDefault
@hasAsyncChild
@classReturnsPromise
@classPlatforms([ ReplPlatform.CLI ] )
export default class Session extends ShellApiClass {
  public id: Document;
  public _session: ServiceProviderSession;
  public _options: SessionOptions;
  private _mongo: Mongo;
  private _databases: Record<string, Database>;

  constructor(mongo: Mongo, options: SessionOptions, session: ServiceProviderSession) {
    super();
    this._session = session;
    this._options = options;
    this._mongo = mongo;
    this._databases = {};
    this.id = session.id;
  }

  /**
   * Internal method to determine what is printed for this class.
   */
  [asPrintable](): Document {
    return this._session.id;
  }

  getDatabase(name: string): Database {
    assertArgsDefined(name);
    assertArgsType([name], ['string']);

    if (!name.trim()) {
      throw new MongoshInvalidInputError('Database name cannot be empty.');
    }

    if (!(name in this._databases)) {
      this._databases[name] = new Database(this._mongo, name, this);
    }
    return this._databases[name];
  }

  advanceOperationTime(ts: any): void {
    this._session.advanceOperationTime(ts);
  }

  advanceClusterTime(): void {
    throw new MongoshUnimplementedError('Calling advanceClusterTime is not currently supported due it not being supported in the driver, see NODE-2843.');
  }

  @returnsPromise
  async endSession(): Promise<void> {
    return await this._session.endSession();
  }

  hasEnded(): boolean | undefined {
    return this._session.hasEnded;
  }

  getClusterTime(): any {
    return this._session.clusterTime;
  }

  getOperationTime(): any {
    return this._session.operationTime;
  }

  getOptions(): SessionOptions {
    return this._options;
  }

  startTransaction(options: TransactionOptions = {}): void {
    return this._session.startTransaction(options);
  }

  @returnsPromise
  async commitTransaction(): Promise<void> {
    return await this._session.commitTransaction();
  }

  @returnsPromise
  async abortTransaction(): Promise<void> {
    return await this._session.abortTransaction();
  }
}
