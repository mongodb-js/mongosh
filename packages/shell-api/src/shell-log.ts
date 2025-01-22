import type { MongoshBus } from '@mongosh/types';

export interface ShellLog {
  log: {
    info: (message: string, attr?: unknown) => void;
    warn: (message: string, attr?: unknown) => void;
    error: (message: string, attr?: unknown) => void;
    fatal: (message: string, attr?: unknown) => void;
    debug: (message: string, attr?: unknown, level?: 1 | 2 | 3 | 4 | 5) => void;
  };
}

export default function constructShellLog(messageBus: MongoshBus): ShellLog {
  return {
    log: {
      info(message: string, attr?: unknown) {
        messageBus.emit('mongosh:write-custom-log', {
          method: 'info',
          message,
          attr,
        });
      },
      warn(message: string, attr?: unknown) {
        messageBus.emit('mongosh:write-custom-log', {
          method: 'warn',
          message,
          attr,
        });
      },
      error(message: string, attr?: unknown) {
        messageBus.emit('mongosh:write-custom-log', {
          method: 'error',
          message,
          attr,
        });
      },
      fatal(message: string, attr?: unknown) {
        messageBus.emit('mongosh:write-custom-log', {
          method: 'fatal',
          message,
          attr,
        });
      },
      debug(message: string, attr?: unknown, level?: 1 | 2 | 3 | 4 | 5) {
        messageBus.emit('mongosh:write-custom-log', {
          method: 'debug',
          message,
          attr,
          level,
        });
      },
    },
  };
}
