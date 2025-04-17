import {
  classPlatforms,
  returnsPromise,
  shellApiClassDefault,
  ShellApiWithMongoClass,
} from './decorators';
import type {
  ClientSessionOptions,
  ClientSession,
  TransactionOptions,
  ClusterTime,
  TimestampType,
  ServerSessionId,
} from '@mongosh/service-provider-core';
import { asPrintable } from './enums';
import type Mongo from './mongo';
import type Database from './database';
import { DatabaseImpl } from './database';
import { CommonErrors, MongoshInvalidInputError } from '@mongosh/errors';
import type { GenericServerSideSchema, StringKey } from './helpers';
import { assertArgsDefinedType, isValidDatabaseName } from './helpers';

@shellApiClassDefault
@classPlatforms(['CLI'])
export default class Session<
  M extends GenericServerSideSchema = GenericServerSideSchema
> extends ShellApiWithMongoClass {
  public id: ServerSessionId | undefined;
  public _session: ClientSession;
  public _options: ClientSessionOptions;
  public _mongo: Mongo<M>;
  private _databases: Record<string, Database<M>>;

  constructor(
    mongo: Mongo<M>,
    options: ClientSessionOptions,
    session: ClientSession
  ) {
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
  [asPrintable](): ServerSessionId | undefined {
    return this._session.id;
  }

  getDatabase<K extends StringKey<M>>(name: K): Database<M, M[K]> {
    assertArgsDefinedType([name], ['string'], 'Session.getDatabase');

    if (!isValidDatabaseName(name)) {
      throw new MongoshInvalidInputError(
        `Invalid database name: ${name}`,
        CommonErrors.InvalidArgument
      );
    }

    if (!(name in this._databases)) {
      this._databases[name] = new DatabaseImpl(
        this._mongo,
        name,
        this
      )._typeLaunder();
    }
    return this._databases[name] as Database<M, M[K]>;
  }

  advanceOperationTime(ts: TimestampType): void {
    this._session.advanceOperationTime(ts);
  }

  advanceClusterTime(clusterTime: ClusterTime): void {
    this._session.advanceClusterTime(clusterTime);
  }

  @returnsPromise
  async endSession(): Promise<void> {
    return await this._session.endSession();
  }

  hasEnded(): boolean | undefined {
    return this._session.hasEnded;
  }

  getClusterTime(): ClusterTime | undefined {
    return this._session.clusterTime;
  }

  getOperationTime(): TimestampType | undefined {
    return this._session.operationTime;
  }

  getOptions(): ClientSessionOptions {
    return this._options;
  }

  startTransaction(options: TransactionOptions = {}): void {
    return this._session.startTransaction(options);
  }

  @returnsPromise
  async commitTransaction(): Promise<void> {
    await this._session.commitTransaction();
  }

  @returnsPromise
  async abortTransaction(): Promise<void> {
    await this._session.abortTransaction();
  }

  @returnsPromise
  async withTransaction<T extends (...args: any) => any>(
    fn: T,
    options: TransactionOptions = {}
  ): Promise<ReturnType<T>> {
    assertArgsDefinedType([fn, options], ['function', [undefined, 'object']]);
    // The driver doesn't automatically ensure that fn is an async
    // function/convert its return type to a Promise, so we do that here.
    return await this._session.withTransaction(async () => await fn(), options);
  }
}
