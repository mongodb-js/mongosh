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
    try {
      return await this._mongo._serviceProvider.runCommandWithCheck(ADMIN_DB, cmd);
    } catch (error) {
      if (error.codeName === 'CommandNotFound') {
        error.message = `${error.message}. Are you connected to mongos?`;
      }
      throw error;
    }
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
    try {
      return await this._mongo._serviceProvider.runCommandWithCheck(ADMIN_DB, orderedCmd);
    } catch (error) {
      if (error.codeName === 'CommandNotFound') {
        error.message = `${error.message}. Are you connected to mongos?`;
      }
      throw error;
    }
  }

  @returnsPromise
  async status(verbose = false): Promise<any> {
    await getConfigDB(this._mongo); // will error if not connected to mongos
    const result = await getPrintableShardStatus(this._mongo, verbose);
    return new CommandResult('StatsResult', result);
  }

  @returnsPromise
  async addShard(url: string): Promise<any> {
    assertArgsDefined(url);
    await getConfigDB(this._mongo);
    this._emitShardApiCall('addShard', { url });
    return this._mongo._serviceProvider.runCommandWithCheck(ADMIN_DB, {
      addShard: url
    });
  }

  @returnsPromise
  @serverVersions(['3.4.0', ServerVersions.latest])
  async addShardToZone(shard: string, zone: string): Promise<any> {
    assertArgsDefined(shard, zone);
    this._emitShardApiCall('addShardToZone', { shard, zone });
    await getConfigDB(this._mongo); // will error if not connected to mongos
    return this._mongo._serviceProvider.runCommandWithCheck(ADMIN_DB, {
      addShardToZone: shard,
      zone: zone
    });
  }

  @returnsPromise
  @serverVersions(['3.4.0', ServerVersions.latest])
  async addShardTag(shard: string, tag: string): Promise<any> {
    try {
      return await this.addShardToZone(shard, tag);
    } catch (error) {
      if (error.codeName === 'CommandNotFound') {
        error.message = `${error.message}. This method aliases to addShardToZone which exists only for server versions > 3.4.`;
      }
      throw error;
    }
  }

  @returnsPromise
  async updateZoneKeyRange(namespace: string, min: Document, max: Document, zone: string): Promise<any> {
    assertArgsDefined(namespace, min, max, zone);
    this._emitShardApiCall('updateZoneKeyRange', { namespace, min, max, zone });

    await getConfigDB(this._mongo); // will error if not connected to mongos
    return await this._mongo._serviceProvider.runCommandWithCheck(ADMIN_DB, {
      updateZoneKeyRange: namespace,
      min,
      max,
      zone
    });
  }

  @returnsPromise
  @serverVersions(['3.4.0', ServerVersions.latest])
  async addTagRange(namespace: string, min: Document, max: Document, zone: string): Promise<any> {
    assertArgsDefined(namespace, min, max, zone);
    this._emitShardApiCall('updateZoneKeyRange', { namespace, min, max, zone });

    await getConfigDB(this._mongo); // will error if not connected to mongos
    try {
      return await this.updateZoneKeyRange(
        namespace,
        min,
        max,
        zone
      );
    } catch (error) {
      if (error.codeName === 'CommandNotFound') {
        error.message = `${error.message}. This method aliases to updateZoneKeyRange which exists only for server versions > 3.4.`;
      }
      throw error;
    }
  }
}
