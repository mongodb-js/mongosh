/* eslint-disable new-cap */
import {
  shellApiClassDefault,
  hasAsyncChild,
  ShellApiClass,
  returnsPromise,
  returnType,
  platforms,
  toShellResult,
  ShellResult,
  directShellCommand
} from './decorators';
import Mongo from './mongo';
import Database from './database';
import { CommandResult, CursorIterationResult } from './result';
import ShellInternalState from './shell-internal-state';
import { assertArgsDefined, assertCLI } from './helpers';
import { DEFAULT_DB, ReplPlatform } from '@mongosh/service-provider-core';
import { CommonErrors, MongoshUnimplementedError } from '@mongosh/errors';
import { DBQuery } from './deprecated';
import { promisify } from 'util';
import { ClientSideFieldLevelEncryptionOptions } from './field-level-encryption';

@shellApiClassDefault
@hasAsyncChild
export default class ShellApi extends ShellApiClass {
  readonly internalState: ShellInternalState;
  public DBQuery: DBQuery;

  constructor(internalState: ShellInternalState) {
    super();
    this.internalState = internalState;
    this.DBQuery = new DBQuery();
  }

  @directShellCommand
  use(db: string): any {
    return this.internalState.currentDb._mongo.use(db);
  }

  @directShellCommand
  @returnsPromise
  async show(cmd: string, arg?: string): Promise<CommandResult> {
    return await this.internalState.currentDb._mongo.show(cmd, arg);
  }

  @directShellCommand
  @returnsPromise
  async exit(): Promise<void> {
    await this.internalState.close(true);
    // This should never actually return.
    await this.internalState.evaluationListener.onExit?.();
    throw new MongoshUnimplementedError(
      `exit not supported for current platform: ${ReplPlatform[this.internalState.initialServiceProvider.platform]}`,
      CommonErrors.NotImplemented
    );
  }

  @directShellCommand
  @returnsPromise
  async quit(): Promise<void> {
    return await this.exit();
  }

  @returnsPromise
  @returnType('Mongo')
  @platforms([ ReplPlatform.CLI ] )
  public async Mongo(uri?: string, options?: ClientSideFieldLevelEncryptionOptions): Promise<Mongo> {
    assertCLI(this.internalState.initialServiceProvider.platform);
    const mongo = new Mongo(this.internalState, uri, options);
    await mongo.connect();
    this.internalState.mongos.push(mongo);
    return mongo;
  }

  @returnsPromise
  @returnType('Database')
  @platforms([ ReplPlatform.CLI ] )
  async connect(uri: string, user?: string, pwd?: string): Promise<Database> {
    assertArgsDefined(uri);
    assertCLI(this.internalState.initialServiceProvider.platform);
    const mongo = new Mongo(this.internalState, uri);
    await mongo.connect(user, pwd);
    this.internalState.mongos.push(mongo);
    const db = mongo._serviceProvider.initialDb || DEFAULT_DB;
    return mongo.getDB(db);
  }

  @directShellCommand
  @returnsPromise
  async it(): Promise<any> {
    if (!this.internalState.currentCursor) {
      return new CursorIterationResult();
    }
    return await this.internalState.currentCursor._it();
  }

  version(): string {
    const version = require('../package.json').version;
    return version;
  }

  load(): void {
    throw new MongoshUnimplementedError(
      'load is not currently implemented. If you are running mongosh from the CLI ' +
      'then you can use .load <filename> as an alternative.',
      CommonErrors.NotImplemented
    );
  }

  @returnsPromise
  @platforms([ ReplPlatform.CLI ] )
  async enableTelemetry(): Promise<any> {
    return await this.internalState.evaluationListener.toggleTelemetry?.(true);
  }

  @returnsPromise
  @platforms([ ReplPlatform.CLI ] )
  async disableTelemetry(): Promise<any> {
    return await this.internalState.evaluationListener.toggleTelemetry?.(false);
  }

  @returnsPromise
  @platforms([ ReplPlatform.CLI ] )
  async passwordPrompt(): Promise<string> {
    const { evaluationListener } = this.internalState;
    if (!evaluationListener.onPrompt) {
      throw new MongoshUnimplementedError('passwordPrompt() is not available in this shell', CommonErrors.NotImplemented);
    }
    return await evaluationListener.onPrompt('Enter password', 'password');
  }

  @returnsPromise
  async sleep(ms: number): Promise<void> {
    return await promisify(setTimeout)(ms);
  }

  @returnsPromise
  async print(...origArgs: any[]): Promise<void> {
    const { evaluationListener } = this.internalState;
    const args: ShellResult[] =
      await Promise.all(origArgs.map(arg => toShellResult(arg)));
    await evaluationListener.onPrint?.(args);
  }

  @returnsPromise
  async printjson(...origArgs: any[]): Promise<void> {
    return this.print(...origArgs);
  }

  @directShellCommand
  @returnsPromise
  async cls(): Promise<void> {
    const { evaluationListener } = this.internalState;
    await evaluationListener.onClearCommand?.();
  }
}
