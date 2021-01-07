import v8 from 'v8';
import {
  expose,
  caller,
  MessageData,
  PostmsgRpcOptions,
  ServerMessageData,
  ClientMessageData
} from 'postmsg-rpc';

type RPCMessageBus = { on: Function; off: Function } & (
  | { postMessage: Function; send?: never }
  | { postMessage?: never; send?: Function }
);

function isMessageData(data: any): data is MessageData {
  return data && typeof data === 'object' && 'id' in data && 'sender' in data;
}

function isServerMessageData(data: any): data is ServerMessageData {
  return isMessageData(data) && data.sender === 'postmsg-rpc/server';
}

function isClientMessageData(data: any): data is ClientMessageData {
  return isMessageData(data) && data.sender === 'postmsg-rpc/client';
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

function send(messageBus: RPCMessageBus, data: any): void {
  if (
    'postMessage' in messageBus &&
    typeof messageBus.postMessage === 'function'
  ) {
    messageBus.postMessage(data);
  }

  if ('send' in messageBus && typeof messageBus.send === 'function') {
    messageBus.send(data);
  }
}

function serialize(data: unknown): string {
  return `data:;base64,${v8.serialize(data).toString('base64')}`;
}

function deserialize<T = unknown>(str: string): T | string {
  if (/^data:;base64,.+/.test(str)) {
    return v8.deserialize(
      Buffer.from(str.replace('data:;base64,', ''), 'base64')
    );
  }
  return str;
}

function getRPCOptions(messageBus: RPCMessageBus): PostmsgRpcOptions {
  return {
    addListener: messageBus.on.bind(messageBus),
    removeListener: messageBus.off.bind(messageBus),
    postMessage(data) {
      if (isClientMessageData(data) && Array.isArray(data.args)) {
        data.args = serialize(removeTrailingUndefined(data.args));
      }

      if (isServerMessageData(data)) {
        data.res = serialize(data.res);
      }

      return send(messageBus, data);
    },
    getMessageData(data) {
      if (
        isClientMessageData(data) &&
        data.args &&
        typeof data.args === 'string'
      ) {
        data.args = deserialize(data.args);
      }

      if (isServerMessageData(data) && typeof data.res === 'string') {
        data.res = deserialize(data.res);
      }

      return data;
    }
  };
}

export type WithClose<T> = { [k in keyof T]: T[k] & { close(): void } };

export function exposeAll<O>(obj: O, messageBus: RPCMessageBus): WithClose<O> {
  Object.entries(obj).forEach(([key, val]) => {
    const { close } = expose(key, val, getRPCOptions(messageBus));
    (val as any).close = close;
  });
  return obj as WithClose<O>;
}

export type Caller<Impl, Keys extends keyof Impl = keyof Impl> = Promisified<
  Pick<Impl, Keys>
>;

export function createCaller<Impl extends {}>(
  methodNames: Extract<keyof Impl, string>[],
  messageBus: RPCMessageBus
): Caller<Impl, typeof methodNames[number]> {
  const obj = {};
  methodNames.forEach((name) => {
    (obj as any)[name] = caller(name as string, getRPCOptions(messageBus));
  });
  return obj as Caller<Impl, typeof methodNames[number]>;
}
