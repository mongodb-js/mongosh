import Mongo from './mongo';
import {
  shellApiClassDefault,
  hasAsyncChild,
  ShellApiClass,
  returnsPromise
} from './decorators';

import {
  Document
} from '@mongosh/service-provider-core';
import { ADMIN_DB, asPrintable } from './enums';
import { assertArgsDefined, assertArgsType } from './helpers';
import { MongoshInternalError, MongoshInvalidInputError, MongoshRuntimeError } from '@mongosh/errors';
import { CommandResult } from './result';

@shellApiClassDefault
@hasAsyncChild
export default class ReplicaSet extends ShellApiClass {
  _mongo: Mongo;

  constructor(mongo) {
    super();
    this._mongo = mongo;
  }

  /**
   *  rs.initiate calls replSetInitiate admin command.
   *
   * @param config
   */
  @returnsPromise
  async initiate(config = {}): Promise<any> {
    this._emitReplicaSetApiCall('initiate', { config });
    return this._mongo._serviceProvider.runCommandWithCheck(ADMIN_DB, { replSetInitiate: config });
  }

  /**
   *  rs.config calls replSetReconfig admin command.
   *
   *  Returns a document that contains the current replica set configuration.
   */
  @returnsPromise
  async config(): Promise<any> {
    this._emitReplicaSetApiCall('config', {});
    try {
      const result = await this._mongo._serviceProvider.runCommandWithCheck(
        ADMIN_DB,
        { replSetReconfig: 1 }
      );
      if (result.config === undefined) {
        throw new MongoshInternalError('Documented returned from command replSetReconfig does not contain \'config\'');
      }
      return result.config;
    } catch (error) {
      if (error.codeName === 'CommandNotFound') {
        return await this._mongo.getDB('local').getCollection('system.replset').findOne();
      }
      throw error;
    }
  }

  /**
   * Alias, conf is documented but config is not
   */
  @returnsPromise
  async conf(): Promise<any> {
    return this.config();
  }

  /**
   *  rs.reconfig calls replSetReconfig admin command.
   *
   *  @param config
   *  @param options
   */
  @returnsPromise
  async reconfig(config: any, options = {}): Promise<any> {
    assertArgsDefined(config);
    assertArgsType([ config, options ], ['object', 'object']);
    this._emitReplicaSetApiCall('reconfig', { config, options });

    const conf = await this.conf();

    config.version = conf.version ? conf.version + 1 : 1;
    const cmd = { replSetReconfig: config, ...options };

    return this._mongo._serviceProvider.runCommandWithCheck(ADMIN_DB, cmd);
  }

  @returnsPromise
  async status(): Promise<any> {
    this._emitReplicaSetApiCall('status', {});
    return this._mongo._serviceProvider.runCommandWithCheck(
      ADMIN_DB,
      {
        replSetGetStatus: 1,
      }
    );
  }

  @returnsPromise
  async isMaster(): Promise<any> {
    this._emitReplicaSetApiCall('isMaster', {});
    return this._mongo._serviceProvider.runCommandWithCheck(
      ADMIN_DB,
      {
        isMaster: 1,
      }
    );
  }

  @returnsPromise
  async printSecondaryReplicationInfo(): Promise<CommandResult> {
    this._emitReplicaSetApiCall('printSecondaryReplicationInfo', {});
    return this._mongo._internalState.currentDb.printSecondaryReplicationInfo();
  }

  @returnsPromise
  async printSlaveReplicationInfo(): Promise<CommandResult> {
    throw new MongoshInvalidInputError('printSlaveReplicationInfo has been deprecated. Use printSecondaryReplicationInfo instead');
  }

  @returnsPromise
  async printReplicationInfo(): Promise<CommandResult> {
    this._emitReplicaSetApiCall('printReplicationInfo', {});
    return this._mongo._internalState.currentDb.printReplicationInfo();
  }

  @returnsPromise
  async add(hostport: string | Document, arb?: boolean): Promise<any> {
    assertArgsDefined(hostport);
    this._emitReplicaSetApiCall('add', { hostport, arb });

    const local = this._mongo.getDB('local');
    if (await local.getCollection('system.replset').countDocuments({}) !== 1) {
      throw new MongoshRuntimeError('local.system.replset has unexpected contents');
    }
    const configDoc = await local.getCollection('system.replset').findOne();
    if (configDoc === undefined || configDoc === null) {
      throw new MongoshRuntimeError('no config object retrievable from local.system.replset');
    }

    configDoc.version++;

    const max = Math.max(...configDoc.members.map(m => m._id));
    let cfg;
    if (typeof hostport === 'string') {
      cfg = { _id: max + 1, host: hostport };
      if (arb) {
        cfg.arbiterOnly = true;
      }
    } else if (arb === true) {
      throw new MongoshInvalidInputError(`Expected first parameter to be a host-and-port string of arbiter, but got ${JSON.stringify(hostport)}`);
    } else {
      cfg = hostport;
      if (cfg._id === null || cfg._id === undefined) {
        cfg._id = max + 1;
      }
    }

    configDoc.members.push(cfg);
    return this._mongo._serviceProvider.runCommandWithCheck(
      ADMIN_DB,
      {
        replSetReconfig: configDoc,
      }
    );
  }

  @returnsPromise
  async addArb(hostname: string): Promise<void> {
    this._emitReplicaSetApiCall('addArb', { hostname });
    return this.add(hostname, true);
  }

  @returnsPromise
  async remove(hostname: string): Promise<void> {
    assertArgsDefined(hostname);
    assertArgsType([hostname], ['string']);
    this._emitReplicaSetApiCall('remove', { hostname });
    const local = this._mongo.getDB('local');
    if (await local.getCollection('system.replset').countDocuments({}) !== 1) {
      throw new MongoshRuntimeError('local.system.replset has unexpected contents');
    }
    const configDoc = await local.getCollection('system.replset').findOne();
    if (configDoc === null || configDoc === undefined) {
      throw new MongoshRuntimeError('no config object retrievable from local.system.replset');
    }
    configDoc.version++;

    for (let i = 0; i < configDoc.members.length; i++) {
      if (configDoc.members[i].host === hostname) {
        configDoc.members.splice(i, 1);
        return this._mongo._serviceProvider.runCommandWithCheck(
          ADMIN_DB,
          {
            replSetReconfig: configDoc,
          }
        );
      }
    }
    throw new MongoshInvalidInputError(`Couldn't find ${hostname} in ${JSON.stringify(configDoc.members)}. Is ${hostname} a member of this replset?`);
  }

  @returnsPromise
  async freeze(secs: number): Promise<any> {
    assertArgsDefined(secs);
    assertArgsType([secs], ['number']);
    this._emitReplicaSetApiCall('freeze', { secs });
    return this._mongo._serviceProvider.runCommandWithCheck(
      ADMIN_DB,
      {
        replSetFreeze: secs,
      }
    );
  }

  @returnsPromise
  async stepDown(stepdownSecs?: number, catchUpSecs?: number): Promise<any> {
    assertArgsType([stepdownSecs, catchUpSecs], ['number', 'number']);
    this._emitReplicaSetApiCall('stepDown', { stepdownSecs, catchUpSecs });
    const cmd = {
      replSetStepDown: stepdownSecs === undefined ? 60 : stepdownSecs,
    } as any;
    if (catchUpSecs !== undefined) {
      cmd.secondaryCatchUpPeriodSecs = catchUpSecs;
    }
    return this._mongo._serviceProvider.runCommandWithCheck(
      ADMIN_DB,
      cmd
    );
  }

  @returnsPromise
  async syncFrom(host: string): Promise<any> {
    assertArgsDefined(host);
    assertArgsType([host], ['string']);
    this._emitReplicaSetApiCall('syncFrom', { host });
    return this._mongo._serviceProvider.runCommandWithCheck(
      ADMIN_DB,
      {
        replSetSyncFrom: host,
      }
    );
  }

  /**
   * Internal method to determine what is printed for this class.
   */
  [asPrintable](): string {
    return `ReplicaSet class connected to ${this._mongo._uri}`;
  }

  /**
   * Internal helper for emitting ReplicaSet API call events.
   *
   * @param methodName
   * @param methodArguments
   * @private
   */
  private _emitReplicaSetApiCall(methodName: string, methodArguments: Document = {}): void {
    this._mongo._internalState.emitApiCall({
      method: methodName,
      class: 'ReplicaSet',
      arguments: methodArguments
    });
  }
}
