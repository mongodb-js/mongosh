export async function eventually(fn: Function, opts: { frequency?: number; timeout?: number } = {}): Promise<any> {
  const options = {
    frequency: 100,
    timeout: 10000,
    ...opts
  };

  let attempts = Math.round(options.timeout / options.frequency);
  let err;

  while (attempts) {
    attempts--;

    try {
      await fn();
      return;
    } catch (e: any) {
      err = e;
    }

    await new Promise(resolve => setTimeout(resolve, options.frequency));
  }

  Object.assign(err, {
    timedOut: true,
    timeout: options.timeout,
    message: `[Timed out ${options.timeout}ms] ${err.message}`
  });
  throw err;
}
