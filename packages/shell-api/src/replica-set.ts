import Mongo from './mongo';
import {
  shellApiClassDefault,
  hasAsyncChild,
  ShellApiClass,
} from './decorators';

import {
  Document
} from '@mongosh/service-provider-core';
import { MongoshUnimplementedError } from '@mongosh/errors';

@shellApiClassDefault
@hasAsyncChild
export default class ReplicaSet extends ShellApiClass {
  mongo: Mongo;

  constructor(mongo) {
    super();
    this.mongo = mongo;
    const proxy = new Proxy(this, {
      get: (obj, prop): any => {
        if (!(prop in obj)) {
          throw new MongoshUnimplementedError('rs not currently supported');
        }
        return obj[prop];
      }
    });
    return proxy;
  }

  toReplString(): any {
    return `ReplicaSet class connected to ${this.mongo.uri}`;
  }

  /**
   * Internal helper for emitting ReplicaSet API call events.
   *
   * @param methodName
   * @param methodArguments
   * @private
   */
  private _emitReplicaSetApiCall(methodName: string, methodArguments: Document = {}): void {
    this.mongo.internalState.emitApiCall({
      method: methodName,
      class: 'ReplicaSet',
      arguments: methodArguments
    });
  }
}
