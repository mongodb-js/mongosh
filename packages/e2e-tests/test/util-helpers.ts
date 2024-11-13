export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function skipDueToEPermErrors(context: Mocha.Context): void {
  if (process.platform === 'win32' && process.versions.node.startsWith('22')) {
    // This test fails on Windows with node 22 likely due to https://github.com/nodejs/node/issues/51766
    return context.skip();
  }
}
