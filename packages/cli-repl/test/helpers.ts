export async function eventually(fn: Function, options: { frequency?: number; timeout?: number } = {}): Promise<any> {
  options = {
    frequency: 100,
    timeout: 10000,
    ...options
  };

  let attempts = Math.round(options.timeout / options.frequency);
  let err;

  while (attempts) {
    attempts--;

    try {
      await fn();
      return;
    } catch (e) {
      err = e;
    }

    await new Promise(resolve => setTimeout(resolve, options.frequency));
  }

  throw err;
}
