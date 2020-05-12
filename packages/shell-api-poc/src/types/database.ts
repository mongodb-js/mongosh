import { ServiceProvider } from '../../service-provider-core';
import { Collection } from './collection';
import { ShellIterationState } from './shell-iteration-state';
import { EvaluationResult, toEvaluationResult, Evaluable } from '../internal/evaluable';
import { ApiType, apiMethod } from '../internal/api-type';
import { EventEmitter } from '../internal/event-emitter';

export class Database extends ApiType implements Evaluable {
  private _name: string;
  private _serviceProvider: ServiceProvider;
  private _eventEmitter: EventEmitter;

  constructor(
    eventEmitter: EventEmitter,
    serviceProvider: ServiceProvider,
    shellIterationState: ShellIterationState,
    name: string
  ) {
    super();
    this._eventEmitter = eventEmitter;
    this._name = name;
    this._serviceProvider = serviceProvider;

    const proxy = new Proxy(this, {
      get: (obj, prop: string): any => {
        if (!(prop in obj) &&
          typeof prop === 'string' &&
          prop !== 'then'
        ) {
          obj[prop] = new Collection(
            this._eventEmitter,
            serviceProvider,
            shellIterationState,
            proxy,
            prop
          );
        }

        return obj[prop];
      }
    });

    return proxy;
  }

  @apiMethod()
  getName(): string {
    return this._name;
  }

  async [toEvaluationResult](): Promise<EvaluationResult> {
    return {
      type: 'Database',
      value: this._name
    };
  }
}

