import { ChildProcess } from 'child_process';
import { MongoshBus } from '@mongosh/types';
import { exposeAll, WithClose } from './rpc';

export class ChildProcessMongoshBus {
  exposedEmitter: WithClose<MongoshBus>;

  constructor(eventEmitter: MongoshBus, childProcess: ChildProcess) {
    const exposedEmitter: WithClose<MongoshBus> = exposeAll(
      {
        emit(...args) {
          eventEmitter.emit(...args);
        },
        on() {
          // no-op
          return exposedEmitter;
        }
      },
      childProcess
    );
    this.exposedEmitter = exposedEmitter;
  }
}
