import v8 from 'v8';
import {
  expose,
  caller,
  MessageData,
  PostmsgRpcOptions,
  ServerMessageData,
  ClientMessageData
} from 'postmsg-rpc';
import { deserializeError, serializeError } from './serializer';

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

type RPCMessageBus = { on: Function; off: Function } & (
  | { postMessage: Function; send?: never }
  | { postMessage?: never; send?: Function }
);

const ERROR = '$$ERROR';

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

function getRPCOptions(messageBus: RPCMessageBus): PostmsgRpcOptions {
  return {
    addListener: messageBus.on.bind(messageBus),
    removeListener: messageBus.off.bind(messageBus),
    postMessage(data) {
      if (isClientMessageData(data) && Array.isArray(data.args)) {
        // We don't guard against serialization errors on the client, if they
        // happen, client is responsible for handling them
        data.args = serialize(removeTrailingUndefined(data.args));
      }

      if (isServerMessageData(data)) {
        // If serialization error happened on the server, we use our special
        // error return value to propagate the error back to the client,
        // otherwise error can be lost on the server and client call will never
        // resolve
        try {
          data.res = serialize(data.res);
        } catch (err) {
          data.res = { [ERROR]: serializeError(err) };
        }
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
    const { close } = expose(
      key,
      async(...args: unknown[]) => {
        try {
          return await val(...args);
        } catch (e) {
          return { [ERROR]: serializeError(e) };
        }
      },
      getRPCOptions(messageBus)
    );
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
    const c = caller(name as string, getRPCOptions(messageBus));
    (obj as any)[name] = async(...args: unknown[]) => {
      const result = await c(...args);
      if (typeof result === 'object' && result !== null && ERROR in result) {
        throw deserializeError((result as any)[ERROR]);
      }
      return result;
    };
  });
  return obj as Caller<Impl, typeof methodNames[number]>;
}
