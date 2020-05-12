import { ServiceProvider, Document } from '../../service-provider-core';
import { Database } from './database';
import { Cursor } from './cursor';
import { ShellIterationState } from './shell-iteration-state';
import { Evaluable, toEvaluationResult, EvaluationResult } from '../internal/evaluable';
import { ApiType, apiMethod } from '../internal/api-type';
import { EventEmitter } from '../internal/event-emitter';

class Collection extends ApiType implements Evaluable {
  private _eventEmitter: EventEmitter;
  private _serviceProvider: ServiceProvider;
  private _database: Database;
  private _name: string;
  private _shellIterationState: ShellIterationState;

  constructor(
    eventEmitter: EventEmitter,
    serviceProvider: ServiceProvider,
    shellIterationState: ShellIterationState,
    database: Database,
    name: string
  ) {
    super();
    this._eventEmitter = eventEmitter;
    this._serviceProvider = serviceProvider;
    this._database = database;
    this._shellIterationState = shellIterationState;
    this._name = name;
  }

  @apiMethod()
  getDB(): Database {
    return this._database;
  }

  @apiMethod()
  getName(): string {
    return this._name;
  }

  @apiMethod()
  async find(filter: Document = {}, options: Document = {}): Promise<Cursor> {
    const nativeCursor = this._serviceProvider
      .db(this._database.getName())
      .collection(this._name)
      .find(filter, options);

    const cursor = new Cursor(
      this._eventEmitter,
      this._serviceProvider,
      nativeCursor
    );

    this._shellIterationState.setCursor(cursor);

    return cursor;
  }

  async [toEvaluationResult](): Promise<EvaluationResult> {
    return {
      type: 'Collection',
      value: this._name
    };
  }
}

export { Collection };
