/* eslint-disable new-cap */
import {
  shellApiClassDefault,
  hasAsyncChild,
  ShellApiClass,
  returnsPromise,
  returnType,
  platforms
} from './decorators';
import { CursorIterationResult } from './result';
import Mongo from './mongo';
import Database from './database';
import { CommandResult } from './result';
import ShellInternalState from './shell-internal-state';
import { assertArgsDefined } from './helpers';
import { ReplPlatform, DEFAULT_DB } from '@mongosh/service-provider-core';
import { MongoshUnimplementedError } from '@mongosh/errors';
import { DBQuery } from './deprecated';
import { ShellApiErrors } from './error-codes';

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

  use(db: string): any {
    return this.internalState.currentDb._mongo.use(db);
  }

  @returnsPromise
  async show(cmd: string, arg?: string): Promise<CommandResult> {
    return await this.internalState.currentDb._mongo.show(cmd, arg);
  }

  @returnsPromise
  async exit(): Promise<void> {
    await this.internalState.close(true);
    if (this.internalState.initialServiceProvider.platform === ReplPlatform.CLI) {
      process.exit();
    } else {
      throw new MongoshUnimplementedError(
        `exit not supported for current platform: ${ReplPlatform[this.internalState.initialServiceProvider.platform]}`,
        ShellApiErrors.ShellApiPlatformUnsupported
      );
    }
  }

  @returnsPromise
  @returnType('Mongo')
  @platforms([ ReplPlatform.CLI ] )
  public async Mongo(uri?: string, options?: any): Promise<Mongo> {
    if (
      this.internalState.initialServiceProvider.platform !== ReplPlatform.CLI
    ) {
      throw new MongoshUnimplementedError(
        `new Mongo connection are not supported for current platform: ${
          ReplPlatform[this.internalState.initialServiceProvider.platform]
        }`,
        ShellApiErrors.ShellApiPlatformUnsupported
      );
    }
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
    const options = user || pwd ? {
      auth: { username: user, password: pwd }
    } : {};
    const mongo = await this.Mongo(uri, options);
    const db = mongo._serviceProvider.initialDb || DEFAULT_DB;
    return mongo.getDB(db);
  }

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
      ShellApiErrors.ShellApiLoadUnsupported
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
      throw new MongoshUnimplementedError('passwordPrompt() is not available in this shell', ShellApiErrors.ShellApiPasswordPromptUnsupported);
    }
    return await evaluationListener.onPrompt('Enter password', 'password');
  }
}
