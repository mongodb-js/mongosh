import {
  Cursor as ServiceProviderCursor,
  ServiceProvider,
} from '../../service-provider-core';

import {
  Evaluable,
  EvaluationResult,
  toEvaluationResult
} from '../internal/evaluable';


import {
  SERVER_VERSION_EARLIEST,
  SERVER_VERSION_LATEST
} from '../internal/constants';
import { ApiType, apiProperty, apiMethod } from '../internal/api-type';
import { EventEmitter } from '../internal/event-emitter';

export class Cursor extends ApiType implements Evaluable {
  private _cursor: ServiceProviderCursor;
  private _serviceProvider: ServiceProvider;
  private _eventEmitter: EventEmitter;

  @apiProperty()
  static shellBatchSize = 20;

  constructor(
    eventEmitter: EventEmitter,
    serviceProvider: ServiceProvider,
    cursor: ServiceProviderCursor
  ) {
    super();
    this._eventEmitter = eventEmitter;
    this._serviceProvider = serviceProvider;
    this._cursor = cursor;
  }

  @apiMethod({
    serverVersions: [SERVER_VERSION_EARLIEST, '3.2.0']
  })
  addOption(...args: any[]): any {
    return this._cursor.addOption(...args);
  }

  @apiMethod()
  allowPartialResults(...args: any[]): any {
    return this._cursor.allowPartialResults(...args);
  }

  @apiMethod()
  arrayAccess(...args: any[]): any {
    return this._cursor.arrayAccess(...args);
  }

  @apiMethod()
  batchSize(...args: any[]): any {
    return this._cursor.batchSize(...args);
  }

  @apiMethod()
  clone(...args: any[]): any {
    return this._cursor.clone(...args);
  }

  @apiMethod()
  close(...args: any[]): any {
    return this._cursor.close(...args);
  }

  @apiMethod({
    serverVersions: ['3.4.0', SERVER_VERSION_LATEST]
  })
  collation(...args: any[]): any {
    return this._cursor.collation(...args);
  }

  @apiMethod({
    serverVersions: ['3.2.0', SERVER_VERSION_LATEST]
  })
  comment(...args: any[]): any {
    return this._cursor.comment(...args);
  }

  @apiMethod({
    serverVersions: [SERVER_VERSION_EARLIEST, '4.0.0']
  })
  count(...args: any[]): any {
    return this._cursor.count(...args);
  }

  @apiMethod()
  explain(...args: any[]): any {
    return this._cursor.explain(...args);
  }

  @apiMethod()
  forEach(...args: any[]): any {
    return this._cursor.forEach(...args);
  }

  @apiMethod()
  getQueryPlan(...args: any[]): any {
    return this._cursor.getQueryPlan(...args);
  }

  @apiMethod()
  hasNext(...args: any[]): any {
    return this._cursor.hasNext(...args);
  }

  @apiMethod()
  hint(...args: any[]): any {
    return this._cursor.hint(...args);
  }

  @apiMethod()
  isClosed(...args: any[]): any {
    return this._cursor.isClosed(...args);
  }

  @apiMethod()
  isExhausted(...args: any[]): any {
    return this._cursor.isExhausted(...args);
  }

  @apiMethod()
  itcount(...args: any[]): any {
    return this._cursor.itcount(...args);
  }

  @apiMethod()
  length(...args: any[]): any {
    return this._cursor.length(...args);
  }

  @apiMethod({
    returnType: 'Cursor'
  })
  limit(...args: any[]): any {
    this._cursor.limit(...args);
    return this;
  }

  @apiMethod()
  map(...args: any[]): any {
    return this._cursor.map(...args);
  }

  @apiMethod()
  max(...args: any[]): any {
    return this._cursor.max(...args);
  }

  @apiMethod({
    serverVersions: [SERVER_VERSION_EARLIEST, '4.0.0']
  })
  maxScan(...args: any[]): any {
    return this._cursor.maxScan(...args);
  }

  @apiMethod()
  maxTimeMS(...args: any[]): any {
    return this._cursor.maxTimeMS(...args);
  }

  @apiMethod()
  min(...args: any[]): any {
    return this._cursor.min(...args);
  }

  @apiMethod()
  modifiers(...args: any[]): any {
    return this._cursor.modifiers(...args);
  }

  @apiMethod()
  next(...args: any[]): any {
    return this._cursor.next(...args);
  }

  @apiMethod()
  noCursorTimeout(...args: any[]): any {
    return this._cursor.noCursorTimeout(...args);
  }

  @apiMethod()
  objsLeftInBatch(...args: any[]): any {
    return this._cursor.objsLeftInBatch(...args);
  }

  @apiMethod()
  oplogReplay(...args: any[]): any {
    return this._cursor.oplogReplay(...args);
  }

  @apiMethod()
  projection(...args: any[]): any {
    return this._cursor.projection(...args);
  }

  @apiMethod()
  pretty(...args: any[]): any {
    return this._cursor.pretty(...args);
  }

  @apiMethod({
    serverVersions: ['3.2.0', SERVER_VERSION_LATEST]
  })
  readConcern(...args: any[]): any {
    return this._cursor.readConcern(...args);
  }

  @apiMethod()
  readOnly(...args: any[]): any {
    return this._cursor.readOnly(...args);
  }

  @apiMethod()
  readPref(...args: any[]): any {
    return this._cursor.readPref(...args);
  }

  @apiMethod({
    serverVersions: ['3.2.0', SERVER_VERSION_LATEST]
  })
  returnKey(...args: any[]): any {
    return this._cursor.returnKey(...args);
  }

  @apiMethod()
  showDiskLoc(...args: any[]): any {
    return this._cursor.showDiskLoc(...args);
  }

  @apiMethod()
  showRecordId(...args: any[]): any {
    return this._cursor.showRecordId(...args);
  }

  @apiMethod()
  size(...args: any[]): any {
    return this._cursor.size(...args);
  }

  @apiMethod({
    returnType: 'Cursor'
  })
  skip(...args: any[]): any {
    this._cursor.skip(...args);
    return this;
  }

  @apiMethod({
    serverVersions: [SERVER_VERSION_EARLIEST, '4.0.0']
  })
  snapshot(...args: any[]): any {
    return this._cursor.snapshot(...args);
  }

  @apiMethod()
  sort(...args: any[]): any {
    return this._cursor.sort(...args);
  }

  @apiMethod({
    serverVersions: ['3.2.0', SERVER_VERSION_LATEST]
  })
  tailable(...args: any[]): any {
    return this._cursor.tailable(...args);
  }

  @apiMethod({ returnsPromise: true })
  toArray(): Promise<any[]> {
    return this._cursor.toArray();
  }

  async [toEvaluationResult](): Promise<EvaluationResult> {
    const results = [];
    for (let i = 0; i < Cursor.shellBatchSize; i++) {
      if (this.isClosed()) {
        break;
      }

      if (!await this.hasNext()) {
        break;
      }

      results.push(await this.next());
    }

    return {
      type: 'Cursor',
      value: results
    };
  }
}
