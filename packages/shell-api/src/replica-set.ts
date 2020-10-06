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
    return this._mongo._serviceProvider.runCommandWithCheck(ADMIN_DB, { replSetReconfig: 1 });
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

    const conf = await this.config();

    config.version = conf.version ? conf.version + 1 : 1;
    const cmd = { replSetReconfig: config };
    const reconfigCmd = { ...cmd, ...options };

    return this._mongo._serviceProvider.runCommandWithCheck(ADMIN_DB, reconfigCmd);
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
