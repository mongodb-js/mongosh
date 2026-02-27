export = class AsyncRewriter {
  process(code: string): Promise<string>;
  runtimeSupportCode(): string;
}
