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
import { ADMIN_DB, ServerVersions, asPrintable } from './enums';
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
  [asPrintable](): string {
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
    assertArgsType([url], ['string']);
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
    assertArgsType([shard, zone], ['string', 'string']);
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
    this._emitShardApiCall('addShardTag', { shard, tag });
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
    assertArgsType([namespace, min, max], ['string', 'object', 'object']);
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
    this._emitShardApiCall('addTagRange', { namespace, min, max, zone });

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

  @returnsPromise
  @serverVersions(['3.4.0', ServerVersions.latest])
  async removeRangeFromZone(ns: string, min: Document, max: Document): Promise<any> {
    this._emitShardApiCall('removeRangeFromZone', { ns, min, max });
    return this.updateZoneKeyRange(ns, min, max, null);
  }

  @returnsPromise
  @serverVersions(['3.4.0', ServerVersions.latest])
  async removeTagRange(ns: string, min: Document, max: Document): Promise<any> {
    this._emitShardApiCall('removeTagRange', { ns, min, max });
    try {
      return await this.updateZoneKeyRange(ns, min, max, null);
    } catch (error) {
      if (error.codeName === 'CommandNotFound') {
        error.message = `${error.message}. This method aliases to updateZoneKeyRange which exists only for server versions > 3.4.`;
      }
      throw error;
    }
  }

  @returnsPromise
  @serverVersions(['3.4.0', ServerVersions.latest])
  async removeShardFromZone(shard: string, zone: string): Promise<any> {
    assertArgsDefined(shard, zone);
    assertArgsType([shard, zone], ['string', 'string']);
    this._emitShardApiCall('removeShardFromZone', { shard, zone });

    await getConfigDB(this._mongo); // will error if not connected to mongos
    return await this._mongo._serviceProvider.runCommandWithCheck(ADMIN_DB, {
      removeShardFromZone: shard,
      zone: zone
    });
  }

  @returnsPromise
  @serverVersions(['3.4.0', ServerVersions.latest])
  async removeShardTag(shard: string, tag: string): Promise<any> {
    this._emitShardApiCall('removeTagRange', { shard, tag });
    try {
      return await this.removeShardFromZone(shard, tag);
    } catch (error) {
      if (error.codeName === 'CommandNotFound') {
        error.message = `${error.message}. This method aliases to removeShardFromZone which exists only for server versions > 3.4.`;
      }
      throw error;
    }
  }

  @returnsPromise
  @serverVersions(['3.4.0', ServerVersions.latest])
  async enableAutoSplit(): Promise<any> {
    assertArgsDefined();
    this._emitShardApiCall('enableAutoSplit', {});
    const config = await getConfigDB(this._mongo);
    return await config.getCollection('settings').updateOne(
      { _id: 'autosplit' },
      { $set: { enabled: true } },
      { upsert: true, writeConcern: { w: 'majority', wtimeout: 30000 } }
    );
  }

  @returnsPromise
  @serverVersions(['3.4.0', ServerVersions.latest])
  async disableAutoSplit(): Promise<any> {
    assertArgsDefined();
    this._emitShardApiCall('disableAutoSplit', {});
    const config = await getConfigDB(this._mongo);
    return await config.getCollection('settings').updateOne(
      { _id: 'autosplit' },
      { $set: { enabled: false } },
      { upsert: true, writeConcern: { w: 'majority', wtimeout: 30000 } }
    );
  }

  @returnsPromise
  async splitAt(ns: string, query: Document): Promise<any> {
    assertArgsDefined(ns, query);
    assertArgsType([ns, query], ['string', 'object']);
    this._emitShardApiCall('splitAt', { ns, query });
    return this._mongo._serviceProvider.runCommandWithCheck(ADMIN_DB, {
      split: ns,
      middle: query
    });
  }

  @returnsPromise
  async splitFind(ns: string, query: Document): Promise<any> {
    assertArgsDefined(ns, query);
    assertArgsType([ns, query], ['string', 'object']);
    this._emitShardApiCall('splitFind', { ns, query });
    return this._mongo._serviceProvider.runCommandWithCheck(ADMIN_DB, {
      split: ns,
      find: query
    });
  }

  @returnsPromise
  async moveChunk(ns: string, query: Document, destination: string): Promise<any> {
    assertArgsDefined(ns, query);
    assertArgsType([ns, query, destination], ['string', 'object', 'string']);
    this._emitShardApiCall('moveChunk', { ns, query, destination });
    return this._mongo._serviceProvider.runCommandWithCheck(ADMIN_DB, {
      moveChunk: ns,
      find: query,
      to: destination
    });
  }

  @returnsPromise
  @serverVersions(['4.4.0', ServerVersions.latest])
  async balancerCollectionStatus(ns: string): Promise<any> {
    assertArgsDefined(ns);
    assertArgsType([ns], ['string']);
    this._emitShardApiCall('balancerCollectionStatus', { ns });
    return this._mongo._serviceProvider.runCommandWithCheck(ADMIN_DB, {
      balancerCollectionStatus: ns
    });
  }


  @returnsPromise
  async enableBalancing(ns: string): Promise<any> {
    assertArgsDefined(ns);
    assertArgsType([ns], ['string']);
    this._emitShardApiCall('enableBalancing', { ns });
    const config = await getConfigDB(this._mongo);
    return await config.getCollection('collections').updateOne(
      { _id: ns },
      { $set: { 'noBalance': false } },
      { writeConcern: { w: 'majority', wtimeout: 60000 } }
    );
  }

  @returnsPromise
  async disableBalancing(ns: string): Promise<any> {
    assertArgsDefined(ns);
    assertArgsType([ns], ['string']);
    this._emitShardApiCall('disableBalancing', { ns });
    const config = await getConfigDB(this._mongo);
    return await config.getCollection('collections').updateOne(
      { _id: ns },
      { $set: { 'noBalance': true } },
      { writeConcern: { w: 'majority', wtimeout: 60000 } }
    );
  }

  @returnsPromise
  async getBalancerState(): Promise<boolean> {
    this._emitShardApiCall('getBalancerState', {});
    const config = await getConfigDB(this._mongo);
    const doc = await config.getCollection('settings').findOne({ _id: 'balancer' });
    if (doc === null || doc === undefined) {
      return true;
    }
    return !doc.stopped;
  }

  @returnsPromise
  async isBalancerRunning(): Promise<any> {
    this._emitShardApiCall('isBalancerRunning', {});
    await getConfigDB(this._mongo);
    return this._mongo._serviceProvider.runCommandWithCheck(ADMIN_DB, {
      balancerStatus: 1
    });
  }

  @returnsPromise
  async startBalancer(timeout = 60000): Promise<any> {
    assertArgsDefined(timeout);
    assertArgsType([timeout], ['number']);
    this._emitShardApiCall('startBalancer', { timeout });
    return this._mongo._serviceProvider.runCommandWithCheck(ADMIN_DB, {
      balancerStart: 1, maxTimeMS: timeout
    });
  }

  @returnsPromise
  async stopBalancer(timeout = 60000): Promise<any> {
    assertArgsDefined(timeout);
    assertArgsType([timeout], ['number']);
    this._emitShardApiCall('stopBalancer', { timeout });
    return this._mongo._serviceProvider.runCommandWithCheck(ADMIN_DB, {
      balancerStop: 1, maxTimeMS: timeout
    });
  }

  @returnsPromise
  async setBalancerState(state: boolean): Promise<any> {
    assertArgsDefined(state);
    assertArgsType([state], ['boolean']);
    this._emitShardApiCall('setBalancerState', { state });
    if (state) {
      return this.startBalancer();
    }
    return this.stopBalancer();
  }
}
