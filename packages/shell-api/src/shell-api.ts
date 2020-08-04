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

@shellApiClassDefault
@hasAsyncChild
export default class ShellApi extends ShellApiClass {
  readonly internalState: ShellInternalState;

  constructor(internalState) {
    super();
    this.internalState = internalState;
  }

  use(db): any {
    return this.internalState.currentDb._mongo.use(db);
  }

  @returnsPromise
  async show(arg): Promise<CommandResult> {
    return await this.internalState.currentDb._mongo.show(arg);
  }

  @returnsPromise
  async exit(): Promise<void> {
    await this.internalState.close(true);
    if (this.internalState.initialServiceProvider.platform === ReplPlatform.CLI) {
      process.exit();
    } else {
      throw new MongoshUnimplementedError(
        `exit not supported for current platform: ${ReplPlatform[this.internalState.initialServiceProvider.platform]}`
      );
    }
  }

  @returnsPromise
  @returnType('Mongo')
  @platforms([ ReplPlatform.CLI ] )
  public async Mongo(uri?, options?): Promise<Mongo> {
    if (
      this.internalState.initialServiceProvider.platform !== ReplPlatform.CLI
    ) {
      throw new MongoshUnimplementedError(
        `new Mongo connection are not supported for current platform: ${
          ReplPlatform[this.internalState.initialServiceProvider.platform]
        }`
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
  async connect(uri, user?, pwd?): Promise<Database> {
    assertArgsDefined(uri);
    const options = {} as any;
    if (user) options.username = user;
    if (pwd) options.password = pwd;
    const mongo = await this.Mongo(uri, Object.keys(options).length ? { auth: options } : {});
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
}
