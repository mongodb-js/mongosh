import type Database from './database';
import {
  shellApiClassDefault,
  returnsPromise,
  serverVersions,
  apiVersions,
  ShellApiWithMongoClass,
  returnType,
} from './decorators';

import type {
  Document,
  CheckMetadataConsistencyOptions,
} from '@mongosh/service-provider-core';
import type { ShardingStatusResult } from './helpers';
import {
  assertArgsDefinedType,
  getConfigDB,
  getPrintableShardStatus,
} from './helpers';
import { ServerVersions, asPrintable } from './enums';
import type { UpdateResult } from './result';
import { CommandResult } from './result';
import { redactURICredentials } from '@mongosh/history';
import type Mongo from './mongo';
import type AggregationCursor from './aggregation-cursor';
import type RunCommandCursor from './run-command-cursor';
import semver from 'semver';

@shellApiClassDefault
export default class Shard extends ShellApiWithMongoClass {
  _database: Database;

  constructor(database: Database) {
    super();
    this._database = database;
  }

  get _mongo(): Mongo {
    return this._database._mongo;
  }

  /**
   * Internal method to determine what is printed for this class.
   */
  [asPrintable](): string {
    return `Shard class connected to ${redactURICredentials(
      this._database._mongo._uri
    )} via db ${this._database._name}`;
  }

  /**
   * Internal helper for emitting Shard API call events.
   *
   * @param methodName
   * @param methodArguments
   * @private
   */
  private _emitShardApiCall(
    methodName: string,
    methodArguments: Document = {}
  ): void {
    this._database._mongo._instanceState.emitApiCallWithArgs({
      method: methodName,
      class: 'Shard',
      arguments: methodArguments,
    });
  }

  @returnsPromise
  @apiVersions([])
  async enableSharding(
    database: string,
    primaryShard?: string
  ): Promise<Document> {
    assertArgsDefinedType(
      [database, primaryShard],
      ['string', [undefined, 'string']],
      'Shard.enableSharding'
    );
    this._emitShardApiCall('enableSharding', { database, primaryShard });

    const cmd = {
      enableSharding: database,
    } as any;
    if (primaryShard !== undefined) {
      cmd.primaryShard = primaryShard;
    }
    try {
      return await this._database._runAdminCommand(cmd);
    } catch (error: any) {
      if (error?.codeName === 'CommandNotFound') {
        error.message = `${error.message}. Are you connected to mongos?`;
      }
      throw error;
    }
  }

  @returnsPromise
  @apiVersions([])
  @serverVersions(['5.0.0', ServerVersions.latest])
  async commitReshardCollection(namespace: string): Promise<Document> {
    assertArgsDefinedType(
      [namespace],
      ['string'],
      'Shard.commitReshardCollection'
    );
    this._emitShardApiCall('commitReshardCollection', { namespace });
    return await this._database._runAdminCommand({
      commitReshardCollection: namespace,
    });
  }

  @returnsPromise
  @apiVersions([])
  @serverVersions(['5.0.0', ServerVersions.latest])
  async abortReshardCollection(namespace: string): Promise<Document> {
    assertArgsDefinedType(
      [namespace],
      ['string'],
      'Shard.abortReshardCollection'
    );
    this._emitShardApiCall('abortReshardCollection', { namespace });
    return await this._database._runAdminCommand({
      abortReshardCollection: namespace,
    });
  }

  @returnsPromise
  @apiVersions([])
  async shardCollection(
    namespace: string,
    key: Document,
    unique?: boolean | Document,
    options?: Document
  ): Promise<Document> {
    return await this._runShardCollection(
      'shardCollection',
      namespace,
      key,
      unique,
      options
    );
  }

  @returnsPromise
  @apiVersions([])
  @serverVersions(['5.0.0', ServerVersions.latest])
  async reshardCollection(
    namespace: string,
    key: Document,
    unique?: boolean | Document,
    options?: Document
  ): Promise<Document> {
    return await this._runShardCollection(
      'reshardCollection',
      namespace,
      key,
      unique,
      options
    );
  }

  async _runShardCollection(
    command: 'shardCollection' | 'reshardCollection',
    namespace: string,
    key: Document,
    unique?: boolean | Document,
    options?: Document
  ): Promise<Document> {
    assertArgsDefinedType(
      [namespace, key, unique, options],
      [
        'string',
        'object',
        [undefined, 'boolean', 'object'],
        [undefined, 'object'],
      ],
      `Shard.${command}`
    );
    this._emitShardApiCall(command, { namespace, key, unique, options });
    if (typeof unique === 'object' && unique !== null) {
      options = unique;
      unique = undefined;
    }

    const cmd = {
      [command]: namespace,
      key: key,
    } as any;
    if (unique !== undefined) {
      cmd.unique = unique;
    }
    try {
      return await this._database._runAdminCommand({ ...cmd, ...options });
    } catch (error: any) {
      if (error?.codeName === 'CommandNotFound') {
        error.message = `${error.message}. Are you connected to mongos?`;
      }
      throw error;
    }
  }

  @returnsPromise
  @apiVersions([1])
  async status(
    verbose = false,
    configDB?: Database
  ): Promise<CommandResult<ShardingStatusResult>> {
    const result = await getPrintableShardStatus(
      configDB ?? (await getConfigDB(this._database)),
      verbose
    );
    return new CommandResult('StatsResult', result);
  }

  @returnsPromise
  @apiVersions([])
  async addShard(url: string): Promise<Document> {
    assertArgsDefinedType([url], ['string'], 'Shard.addShard');
    await getConfigDB(this._database);
    this._emitShardApiCall('addShard', { url });
    return this._database._runAdminCommand({
      addShard: url,
    });
  }

  @returnsPromise
  @apiVersions([])
  @serverVersions(['3.4.0', ServerVersions.latest])
  async addShardToZone(shard: string, zone: string): Promise<Document> {
    assertArgsDefinedType(
      [shard, zone],
      ['string', 'string'],
      'Shard.addShardToZone'
    );
    this._emitShardApiCall('addShardToZone', { shard, zone });
    await getConfigDB(this._database); // will error if not connected to mongos
    return this._database._runAdminCommand({
      addShardToZone: shard,
      zone: zone,
    });
  }

  @returnsPromise
  @apiVersions([])
  @serverVersions(['3.4.0', ServerVersions.latest])
  async addShardTag(shard: string, tag: string): Promise<Document> {
    assertArgsDefinedType(
      [shard, tag],
      ['string', 'string'],
      'Shard.addShardTag'
    );
    this._emitShardApiCall('addShardTag', { shard, tag });
    try {
      return await this.addShardToZone(shard, tag);
    } catch (error: any) {
      if (error?.codeName === 'CommandNotFound') {
        error.message = `${error.message}. This method aliases to addShardToZone which exists only for server versions > 3.4.`;
      }
      throw error;
    }
  }

  @returnsPromise
  @apiVersions([])
  async updateZoneKeyRange(
    namespace: string,
    min: Document,
    max: Document,
    zone: string | null
  ): Promise<Document> {
    assertArgsDefinedType(
      [namespace, min, max, zone],
      ['string', 'object', 'object', true],
      'Shard.updateZoneKeyRange'
    );
    this._emitShardApiCall('updateZoneKeyRange', { namespace, min, max, zone });

    await getConfigDB(this._database); // will error if not connected to mongos
    return await this._database._runAdminCommand({
      updateZoneKeyRange: namespace,
      min,
      max,
      zone,
    });
  }

  @returnsPromise
  @apiVersions([])
  @serverVersions(['3.4.0', ServerVersions.latest])
  async addTagRange(
    namespace: string,
    min: Document,
    max: Document,
    zone: string
  ): Promise<Document> {
    assertArgsDefinedType(
      [namespace, min, max, zone],
      ['string', 'object', 'object', true],
      'Shard.addTagRange'
    );
    this._emitShardApiCall('addTagRange', { namespace, min, max, zone });

    try {
      return await this.updateZoneKeyRange(namespace, min, max, zone);
    } catch (error: any) {
      if (error?.codeName === 'CommandNotFound') {
        error.message = `${error.message}. This method aliases to updateZoneKeyRange which exists only for server versions > 3.4.`;
      }
      throw error;
    }
  }

  @returnsPromise
  @apiVersions([])
  @serverVersions(['3.4.0', ServerVersions.latest])
  async removeRangeFromZone(
    ns: string,
    min: Document,
    max: Document
  ): Promise<Document> {
    assertArgsDefinedType(
      [ns, min, max],
      ['string', 'object', 'object'],
      'Shard.removeRangeFromZone'
    );
    this._emitShardApiCall('removeRangeFromZone', { ns, min, max });
    return this.updateZoneKeyRange(ns, min, max, null);
  }

  @returnsPromise
  @apiVersions([])
  @serverVersions(['3.4.0', ServerVersions.latest])
  async removeTagRange(
    ns: string,
    min: Document,
    max: Document
  ): Promise<Document> {
    assertArgsDefinedType(
      [ns, min, max],
      ['string', 'object', 'object'],
      'Shard.removeTagRange'
    );
    this._emitShardApiCall('removeTagRange', { ns, min, max });
    try {
      return await this.updateZoneKeyRange(ns, min, max, null);
    } catch (error: any) {
      if (error?.codeName === 'CommandNotFound') {
        error.message = `${error.message}. This method aliases to updateZoneKeyRange which exists only for server versions > 3.4.`;
      }
      throw error;
    }
  }

  @returnsPromise
  @apiVersions([])
  @serverVersions(['3.4.0', ServerVersions.latest])
  async removeShardFromZone(shard: string, zone: string): Promise<Document> {
    assertArgsDefinedType(
      [shard, zone],
      ['string', 'string'],
      'Shard.removeShardFromZone'
    );
    this._emitShardApiCall('removeShardFromZone', { shard, zone });

    await getConfigDB(this._database); // will error if not connected to mongos
    return await this._database._runAdminCommand({
      removeShardFromZone: shard,
      zone: zone,
    });
  }

  @returnsPromise
  @apiVersions([])
  @serverVersions(['3.4.0', ServerVersions.latest])
  async removeShardTag(shard: string, tag: string): Promise<Document> {
    assertArgsDefinedType(
      [shard, tag],
      ['string', 'string'],
      'Shard.removeShardTag'
    );
    this._emitShardApiCall('removeTagRange', { shard, tag });
    try {
      return await this.removeShardFromZone(shard, tag);
    } catch (error: any) {
      if (error?.codeName === 'CommandNotFound') {
        error.message = `${error.message}. This method aliases to removeShardFromZone which exists only for server versions > 3.4.`;
      }
      throw error;
    }
  }

  @returnsPromise
  @apiVersions([1])
  @serverVersions(['3.4.0', '6.0.2'])
  async enableAutoSplit(): Promise<UpdateResult> {
    const connectionInfo = await this._instanceState.fetchConnectionInfo();
    if (
      connectionInfo?.buildInfo?.version &&
      semver.gte(connectionInfo.buildInfo.version, '6.0.3')
    ) {
      await this._instanceState.printDeprecationWarning(
        'Starting in MongoDB 6.0.3, automatic chunk splitting is not performed. This is because of balancing policy improvements. Auto-splitting commands still exist, but do not perform an operation. For details, see Balancing Policy Changes: https://www.mongodb.com/docs/manual/release-notes/6.0/#balancing-policy-changes\n'
      );
    }
    this._emitShardApiCall('enableAutoSplit', {});
    const config = await getConfigDB(this._database);
    return (await config
      .getCollection('settings')
      .updateOne(
        { _id: 'autosplit' },
        { $set: { enabled: true } },
        { upsert: true, writeConcern: { w: 'majority', wtimeout: 30000 } }
      )) as UpdateResult;
  }

  @returnsPromise
  @apiVersions([1])
  @serverVersions(['3.4.0', '6.0.2'])
  async disableAutoSplit(): Promise<UpdateResult> {
    const connectionInfo = await this._instanceState.fetchConnectionInfo();
    if (
      connectionInfo?.buildInfo?.version &&
      semver.gte(connectionInfo.buildInfo.version, '6.0.3')
    ) {
      await this._instanceState.printDeprecationWarning(
        'Starting in MongoDB 6.0.3, automatic chunk splitting is not performed. This is because of balancing policy improvements. Auto-splitting commands still exist, but do not perform an operation. For details, see Balancing Policy Changes: https://www.mongodb.com/docs/manual/release-notes/6.0/#balancing-policy-changes\n'
      );
    }
    this._emitShardApiCall('disableAutoSplit', {});
    const config = await getConfigDB(this._database);
    return (await config
      .getCollection('settings')
      .updateOne(
        { _id: 'autosplit' },
        { $set: { enabled: false } },
        { upsert: true, writeConcern: { w: 'majority', wtimeout: 30000 } }
      )) as UpdateResult;
  }

  @returnsPromise
  @apiVersions([])
  async splitAt(ns: string, query: Document): Promise<Document> {
    assertArgsDefinedType([ns, query], ['string', 'object'], 'Shard.splitAt');
    this._emitShardApiCall('splitAt', { ns, query });
    return this._database._runAdminCommand({
      split: ns,
      middle: query,
    });
  }

  @returnsPromise
  @apiVersions([])
  async splitFind(ns: string, query: Document): Promise<Document> {
    assertArgsDefinedType([ns, query], ['string', 'object'], 'Shard.splitFind');
    this._emitShardApiCall('splitFind', { ns, query });
    return this._database._runAdminCommand({
      split: ns,
      find: query,
    });
  }

  @returnsPromise
  @apiVersions([])
  async moveChunk(
    ns: string,
    query: Document,
    destination: string | undefined
  ): Promise<Document> {
    assertArgsDefinedType(
      [ns, query, destination],
      ['string', 'object', 'string'],
      'Shard.moveChunk'
    );
    this._emitShardApiCall('moveChunk', { ns, query, destination });
    return this._database._runAdminCommand({
      moveChunk: ns,
      find: query,
      to: destination,
    });
  }

  @returnsPromise
  @apiVersions([])
  @serverVersions(['4.4.0', ServerVersions.latest])
  async balancerCollectionStatus(ns: string): Promise<Document> {
    assertArgsDefinedType([ns], ['string'], 'Shard.balancerCollectionStatus');
    this._emitShardApiCall('balancerCollectionStatus', { ns });
    return this._database._runAdminReadCommand({
      balancerCollectionStatus: ns,
    });
  }

  @returnsPromise
  @apiVersions([])
  async enableBalancing(ns: string): Promise<UpdateResult> {
    assertArgsDefinedType([ns], ['string'], 'Shard.enableBalancing');
    this._emitShardApiCall('enableBalancing', { ns });
    const config = await getConfigDB(this._database);
    return (await config
      .getCollection('collections')
      .updateOne(
        { _id: ns },
        { $set: { noBalance: false } },
        { writeConcern: { w: 'majority', wtimeout: 60000 } }
      )) as UpdateResult;
  }

  @returnsPromise
  @apiVersions([])
  async disableBalancing(ns: string): Promise<UpdateResult> {
    assertArgsDefinedType([ns], ['string'], 'Shard.disableBalancing');
    this._emitShardApiCall('disableBalancing', { ns });
    const config = await getConfigDB(this._database);
    return (await config
      .getCollection('collections')
      .updateOne(
        { _id: ns },
        { $set: { noBalance: true } },
        { writeConcern: { w: 'majority', wtimeout: 60000 } }
      )) as UpdateResult;
  }

  @returnsPromise
  @apiVersions([])
  async getBalancerState(): Promise<boolean> {
    this._emitShardApiCall('getBalancerState', {});
    const config = await getConfigDB(this._database);
    const doc = await config
      .getCollection('settings')
      .findOne({ _id: 'balancer' });
    if (doc === null || doc === undefined) {
      return true;
    }
    return !doc.stopped;
  }

  @returnsPromise
  @apiVersions([])
  async isBalancerRunning(): Promise<Document> {
    this._emitShardApiCall('isBalancerRunning', {});
    await getConfigDB(this._database);
    return this._database._runAdminReadCommand({
      balancerStatus: 1,
    });
  }

  @returnsPromise
  @apiVersions([])
  async startBalancer(timeout = 60000): Promise<Document> {
    assertArgsDefinedType([timeout], ['number'], 'Shard.startBalancer');
    this._emitShardApiCall('startBalancer', { timeout });
    return this._database._runAdminReadCommand({
      balancerStart: 1,
      maxTimeMS: timeout,
    });
  }

  @returnsPromise
  @apiVersions([])
  async stopBalancer(timeout = 60000): Promise<Document> {
    assertArgsDefinedType([timeout], ['number'], 'Shard.stopBalancer');
    this._emitShardApiCall('stopBalancer', { timeout });
    return this._database._runAdminCommand({
      balancerStop: 1,
      maxTimeMS: timeout,
    });
  }

  @returnsPromise
  @apiVersions([])
  async setBalancerState(state: boolean): Promise<Document> {
    assertArgsDefinedType([state], ['boolean'], 'Shard.setBalancerState');
    this._emitShardApiCall('setBalancerState', { state });
    if (state) {
      return this.startBalancer();
    }
    return this.stopBalancer();
  }

  @returnsPromise
  @apiVersions([])
  @serverVersions(['6.0.3', ServerVersions.latest])
  @returnType('AggregationCursor')
  async getShardedDataDistribution(options = {}): Promise<AggregationCursor> {
    this._emitShardApiCall('getShardedDataDistribution', {});

    const cursor = await this._database
      .getSiblingDB('admin')
      .aggregate([{ $shardedDataDistribution: options }]);

    try {
      await cursor.hasNext();
    } catch (err: any) {
      if (err.code?.valueOf() === 40324) {
        // unrecognized stage error
        err.message = `sh.getShardedDataDistribution only works on mongos and MongoDB server versions greater than 6.0.3 [Original Error: ${err.message}]`;
      }

      throw err;
    }

    return cursor;
  }

  @returnsPromise
  @apiVersions([])
  @serverVersions(['7.0.0', ServerVersions.latest])
  async startAutoMerger(): Promise<UpdateResult> {
    this._emitShardApiCall('startAutoMerger', {});
    const config = await getConfigDB(this._database);
    return (await config
      .getCollection('settings')
      .updateOne(
        { _id: 'automerge' },
        { $set: { enabled: true } },
        { upsert: true, writeConcern: { w: 'majority', wtimeout: 30000 } }
      )) as UpdateResult;
  }

  @returnsPromise
  @apiVersions([])
  @serverVersions(['7.0.0', ServerVersions.latest])
  async stopAutoMerger(): Promise<UpdateResult> {
    this._emitShardApiCall('stopAutoMerger', {});
    const config = await getConfigDB(this._database);
    return (await config
      .getCollection('settings')
      .updateOne(
        { _id: 'automerge' },
        { $set: { enabled: false } },
        { upsert: true, writeConcern: { w: 'majority', wtimeout: 30000 } }
      )) as UpdateResult;
  }

  @returnsPromise
  @apiVersions([])
  @serverVersions(['7.0.0', ServerVersions.latest])
  async isAutoMergerEnabled(): Promise<boolean> {
    this._emitShardApiCall('isAutoMergerEnabled', {});
    const config = await getConfigDB(this._database);
    const doc = await config
      .getCollection('settings')
      .findOne({ _id: 'automerge' });
    if (doc === null || doc === undefined) {
      return true;
    }
    return doc.enabled;
  }

  @returnsPromise
  @apiVersions([])
  @serverVersions(['7.0.0', ServerVersions.latest])
  async disableAutoMerger(ns: string): Promise<UpdateResult> {
    assertArgsDefinedType([ns], ['string'], 'Shard.disableAutoMerger');

    this._emitShardApiCall('disableAutoMerger', { ns });
    const config = await getConfigDB(this._database);
    return (await config
      .getCollection('collections')
      .updateOne(
        { _id: ns },
        { $set: { enableAutoMerge: false } },
        { writeConcern: { w: 'majority', wtimeout: 60000 } }
      )) as UpdateResult;
  }

  @returnsPromise
  @apiVersions([])
  @serverVersions(['7.0.0', ServerVersions.latest])
  async enableAutoMerger(ns: string): Promise<UpdateResult> {
    assertArgsDefinedType([ns], ['string'], 'Shard.enableAutoMerger');

    this._emitShardApiCall('enableAutoMerger', { ns });
    const config = await getConfigDB(this._database);
    return (await config
      .getCollection('collections')
      .updateOne(
        { _id: ns },
        { $unset: { enableAutoMerge: 1 } },
        { writeConcern: { w: 'majority', wtimeout: 60000 } }
      )) as UpdateResult;
  }

  @returnsPromise
  @serverVersions(['7.0.0', ServerVersions.latest])
  async checkMetadataConsistency(
    options: CheckMetadataConsistencyOptions = {}
  ): Promise<RunCommandCursor> {
    this._emitShardApiCall('checkMetadataConsistency', { options });

    return this._database._runAdminCursorCommand({
      checkMetadataConsistency: 1,
    });
  }

  @returnsPromise
  @serverVersions(['5.0.0', ServerVersions.latest])
  async shardAndDistributeCollection(
    ns: string,
    key: Document,
    unique?: boolean | Document,
    options?: Document
  ): Promise<Document> {
    this._emitShardApiCall('shardAndDistributeCollection', {
      ns,
      key,
      unique,
      options,
    });
    await this.shardCollection(ns, key, unique, options);

    if (typeof unique === 'object') {
      options = unique;
    }

    const reshardOptions: Document = {
      forceRedistribution: true,
    };

    if (options?.numInitialChunks !== undefined) {
      reshardOptions.numInitialChunks = options.numInitialChunks;
    }

    if (options?.collation !== undefined) {
      reshardOptions.collation = options.collation;
    }

    return await this.reshardCollection(ns, key, reshardOptions);
  }

  @serverVersions(['8.0.0', ServerVersions.latest])
  @apiVersions([])
  @returnsPromise
  async moveCollection(ns: string, toShard: string): Promise<Document> {
    assertArgsDefinedType(
      [ns, toShard],
      ['string', 'string'],
      'Shard.moveCollection'
    );
    this._emitShardApiCall('moveCollection', { moveCollection: ns, toShard });
    return await this._database._runAdminCommand({
      moveCollection: ns,
      toShard,
    });
  }

  @serverVersions(['8.0.0', ServerVersions.latest])
  @apiVersions([])
  @returnsPromise
  async abortMoveCollection(ns: string): Promise<Document> {
    assertArgsDefinedType([ns], ['string'], 'Shard.abortMoveCollection');
    this._emitShardApiCall('abortMoveCollection', { abortMoveCollection: ns });
    return await this._database._runAdminCommand({ abortMoveCollection: ns });
  }

  @serverVersions(['8.0.0', ServerVersions.latest])
  @apiVersions([])
  @returnsPromise
  async unshardCollection(ns: string, toShard: string): Promise<Document> {
    assertArgsDefinedType(
      [ns, toShard],
      ['string', 'string'],
      'Shard.unshardCollection'
    );
    this._emitShardApiCall('unshardCollection', {
      unshardCollection: ns,
      toShard,
    });
    return await this._database._runAdminCommand({
      unshardCollection: ns,
      toShard,
    });
  }

  @serverVersions(['8.0.0', ServerVersions.latest])
  @apiVersions([])
  @returnsPromise
  async abortUnshardCollection(ns: string): Promise<Document> {
    assertArgsDefinedType([ns], ['string'], 'Shard.abortUnshardCollection');
    this._emitShardApiCall('abortUnshardCollection', {
      abortUnshardCollection: ns,
    });
    return await this._database._runAdminCommand({
      abortUnshardCollection: ns,
    });
  }
}
