import { ServiceProvider } from '../../service-provider-core';
import { Database } from './database';
import { ShellIterationState } from './shell-iteration-state';
import { Cursor } from './cursor';
import { ApiType, apiMethod, apiProperty } from '../internal/api-type';
import { EventEmitter } from '../internal/event-emitter';

export class ShellApi extends ApiType {
  private _eventEmitter: EventEmitter;
  private _serviceProvider: ServiceProvider;
  private _databases: { [dbName: string]: Database } = {};
  private _currentDatabase: Database;
  private _shellIterationState: ShellIterationState;

  constructor(eventEmitter: EventEmitter, serviceProvider: ServiceProvider) {
    super();
    this._eventEmitter = eventEmitter;
    this._serviceProvider = serviceProvider;
    this._shellIterationState = new ShellIterationState();
    this.use('test');
  }

  setupGlobalContext(globalContext: any): void {
    Object.values(ShellApi.attributes).forEach((attribute: any) => {
      globalContext[attribute.name] = typeof this[attribute.name] === 'function' ?
        this[attribute.name].bind(this) :
        this[attribute.name];
    });
  }

  @apiMethod()
  it(): Cursor {
    const cursor = this._shellIterationState.getCursor();
    if (!cursor) {
      throw new Error('no cursor');
    }

    return cursor;
  }

  @apiMethod()
  use(dbName: string): Database {
    this._databases[dbName] = this._databases[dbName] ||
      new Database(
        this._eventEmitter,
        this._serviceProvider,
        this._shellIterationState,
        dbName
      );
    this._currentDatabase = this._databases[dbName];
    return this._currentDatabase;
  }

  @apiProperty()
  get db(): Database {
    return this._currentDatabase;
  }

  @apiProperty({
    returnType: 'Cursor',
    returnsClass: true
  })
  get DBQuery(): typeof Cursor {
    return Cursor;
  }
}
