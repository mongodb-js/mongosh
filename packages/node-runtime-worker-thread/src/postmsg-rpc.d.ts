declare module 'postmsg-rpc' {
  export type MessageData = {
    sender: 'postmsg-rpc/client' | 'postmsg-rpc/server';
    id: string;
    func: string;
    args?: unknown[] | string;
  };

  export type PostmsgRpcOptions = {
    addListener(name: 'message', fn: Function): void;
    removeListener(name: 'message', fn: Function): void;
    postMessage(data: MessageData): void;
    getMessageData(message: unknown): unknown;
  };

  export function expose(
    funcName: string,
    func: Function,
    opts: PostmsgRpcOptions
  ): { close: () => void };

  export function caller<
    T extends (...args: unknown[]) => Promise<unknown> = () => Promise<void>
  >(funcName: string, opts: PostmsgRpcOptions): T;
}
