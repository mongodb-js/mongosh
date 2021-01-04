import { serialize, deserialize } from 'v8';
import { expose, caller, MessageData, PostmsgRpcOptions } from 'postmsg-rpc';
import { Worker } from 'worker_threads';
import { ChildProcess } from 'child_process';

type AnyProcess = NodeJS.Process | ChildProcess | Worker;

function isRPCMessage(data: any): data is MessageData {
  return data.sender && data.id && data.func;
}

function removeTrailingUndefined(arr: unknown[]): unknown[] {
  if (Array.isArray(arr)) {
    arr = [...arr];
    while (arr.length > 0 && arr[arr.length - 1] === undefined) {
      arr.pop();
    }
  }
  return arr;
}

function send(process: AnyProcess, data: any): void {
  if ('postMessage' in process) {
    process.postMessage(data);
  }

  if ('send' in process && process.send !== undefined) {
    process.send(data);
  }
}

function getRPCOptions(
  process: NodeJS.Process | ChildProcess | Worker
): PostmsgRpcOptions {
  return {
    addListener: process.on.bind(process),
    removeListener: process.off.bind(process),
    postMessage(data) {
      if (isRPCMessage(data) && Array.isArray(data.args)) {
        data.args = serialize(removeTrailingUndefined(data.args)).toString(
          'base64'
        );
      }

      return send(process, data);
    },
    getMessageData(data) {
      if (isRPCMessage(data) && data.args && typeof data.args === 'string') {
        data.args = deserialize(Buffer.from(data.args, 'base64'));
      }

      return data;
    }
  };
}

export function exposeAll(
  obj: Record<string, Function>,
  process: AnyProcess
): { [key in keyof typeof obj]: typeof obj[key] & { close(): void } } {
  Object.entries(obj).forEach(([key, val]) => {
    const { close } = expose(key, val, getRPCOptions(process));
    (val as any).close = close;
  });
  return obj as any;
}

export function createCaller<M extends ReadonlyArray<string>>(
  methodNames: M,
  process: AnyProcess
): Record<M[number], Function> {
  const obj: Record<string, Function> = {};
  methodNames.forEach((name) => {
    obj[name] = caller(name, getRPCOptions(process));
  });
  return obj;
}
