import Mongo from './mongo';
import {
  shellApiClassDefault,
  hasAsyncChild,
  ShellApiClass, returnsPromise, serverVersions
} from './decorators';

import {
  Document
} from '@mongosh/service-provider-core';
import { assertArgsDefined, assertArgsType, getConfigDB, getPrintableShardStatus } from './helpers';
import { ADMIN_DB, ServerVersions } from './enums';
import { CommandResult } from './result';
import { MongoshCommandFailed } from '@mongosh/errors';

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

  @returnsPromise
  async addShard(url: string): Promise<any> {
    assertArgsDefined(url);
    this._emitShardApiCall('addShard', { url });
    return this._mongo._serviceProvider.runCommand(ADMIN_DB, {
      addShard: url
    });
  }

  @returnsPromise
  @serverVersions(['3.4.0', ServerVersions.latest])
  async addShardToZone(shard: string, zone: string): Promise<any> {
    assertArgsDefined(shard, zone);
    this._emitShardApiCall('addShardToZone', { shard, zone });
    await getConfigDB(this._mongo); // error if not connected to mongos
    return this._mongo._serviceProvider.runCommand(ADMIN_DB, {
      addShardToZone: shard,
      zone: zone
    });
  }

  @returnsPromise
  @serverVersions(['3.4.0', ServerVersions.latest]) // we don't support earlier versions which had different behavior
  async addShardTag(shard: string, tag: string): Promise<any> {
    const result = await this.addShardToZone(shard, tag);
    if (result.code != ErrorCodes.CommandNotFound) {
      return result;
    }

    const configDB = await getConfigDB(this._mongo);
    const shards = configDB.getCollection('shards');
    const doc = await shards.findOne({ _id: shard });
    if (doc === null || doc === undefined) {
      throw new MongoshCommandFailed(`Can't find a shard with name: ${shard}`);
    }
    return shards.update(
      { _id: shard },
      { $addToSet: { tags: tag } },
      { writeConcern: { w: 'majority', wtimeout: 60000 } }
    );
  }
}
