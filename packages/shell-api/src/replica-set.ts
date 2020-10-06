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
import { ADMIN_DB } from './enums';
import { assertArgsDefined, assertArgsType } from './helpers';
import { MongoshInternalError, MongoshInvalidInputError } from '@mongosh/errors';
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
    return this._mongo._internalState.currentDb.printSecondaryReplicationInfo();
  }

  @returnsPromise
  async printSlaveReplicationInfo(): Promise<CommandResult> {
    throw new MongoshInvalidInputError('printSlaveReplicationInfo has been deprecated. Use printSecondaryReplicationInfo instead');
  }

  @returnsPromise
  async printReplicationInfo(): Promise<CommandResult> {
    return this._mongo._internalState.currentDb.printReplicationInfo();
  }

  /**
   * Internal method to determine what is printed for this class.
   */
  _asPrintable(): string {
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
