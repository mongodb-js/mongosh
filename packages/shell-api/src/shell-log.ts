import type ShellInstanceState from './shell-instance-state';
import { shellApiClassDefault, ShellApiClass } from './decorators';

const instanceStateSymbol = Symbol.for('@@mongosh.instanceState');

/**
 * This class contains the *global log* property that is considered part of the immediate shell API.
 */
@shellApiClassDefault
export class ShellLog extends ShellApiClass {
  // Use symbols to make sure these are *not* among the things copied over into
  // the global scope.
  [instanceStateSymbol]: ShellInstanceState;

  get _instanceState(): ShellInstanceState {
    return this[instanceStateSymbol];
  }

  constructor(instanceState: ShellInstanceState) {
    super();
    this[instanceStateSymbol] = instanceState;
  }

  getPath(): string | undefined {
    return this._instanceState.evaluationListener.getLogPath?.();
  }

  info(message: string, attr?: unknown) {
    this[instanceStateSymbol].messageBus.emit('mongosh:write-custom-log', {
      method: 'info',
      message,
      attr,
    });
  }

  warn(message: string, attr?: unknown) {
    this[instanceStateSymbol].messageBus.emit('mongosh:write-custom-log', {
      method: 'warn',
      message,
      attr,
    });
  }

  error(message: string, attr?: unknown) {
    this[instanceStateSymbol].messageBus.emit('mongosh:write-custom-log', {
      method: 'error',
      message,
      attr,
    });
  }

  fatal(message: string, attr?: unknown) {
    this[instanceStateSymbol].messageBus.emit('mongosh:write-custom-log', {
      method: 'fatal',
      message,
      attr,
    });
  }

  debug(message: string, attr?: unknown, level?: 1 | 2 | 3 | 4 | 5) {
    this[instanceStateSymbol].messageBus.emit('mongosh:write-custom-log', {
      method: 'debug',
      message,
      attr,
      level,
    });
  }
}
