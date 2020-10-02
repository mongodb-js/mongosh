import Mongo from './mongo';
import {
  shellApiClassDefault,
  hasAsyncChild,
  ShellApiClass, returnsPromise
} from './decorators';

import {
  Document
} from '@mongosh/service-provider-core';
import { assertArgsDefined, assertArgsType, getPrintableShardStatus } from './helpers';
import { ADMIN_DB } from './enums';
import { CommandResult } from './result';

@shellApiClassDefault
@hasAsyncChild
export default class Shard extends ShellApiClass {
  _mongo: Mongo;

  constructor(mongo) {
    super();
    this._mongo = mongo;
  }

  /**
   * Internal method to determine what is printed for this class.
   */
  _asPrintable(): string {
    return `Shard class connected to ${this._mongo._uri}`;
  }

  /**
   * Internal helper for emitting Shard API call events.
   *
   * @param methodName
   * @param methodArguments
   * @private
   */
  private _emitShardApiCall(methodName: string, methodArguments: Document = {}): void {
    this._mongo._internalState.emitApiCall({
      method: methodName,
      class: 'Shard',
      arguments: methodArguments
    });
  }

  @returnsPromise
  async enableSharding(database: string, primaryShard?: string): Promise<any> {
    assertArgsDefined(database);
    this._emitShardApiCall('enableSharding', { database, primaryShard });

    const cmd = {
      enableSharding: database
    } as any;
    if (primaryShard !== undefined) {
      cmd.primaryShard = primaryShard;
    }
    return this._mongo._serviceProvider.runCommandWithCheck(ADMIN_DB, cmd);
  }

  @returnsPromise
  async shardCollection(namespace: string, key: Document, unique?: boolean, options?: any): Promise<any> {
    assertArgsDefined(namespace, key);
    assertArgsType([namespace, key, options], ['string', 'object', 'object']);
    this._emitShardApiCall('shardCollection', { namespace, key, unique, options });

    const cmd = {
      shardCollection: namespace,
      key: key
    } as any;
    if (unique !== undefined) {
      cmd.unique = unique;
    }
    const orderedCmd = options !== undefined ? { ...cmd, ...options } : cmd;
    return this._mongo._serviceProvider.runCommandWithCheck(ADMIN_DB, orderedCmd);
  }

  @returnsPromise
  async status(verbose = false): Promise<any> {
    const result = await getPrintableShardStatus(this._mongo, verbose);
    return new CommandResult('StatsResult', result);
  }
}
