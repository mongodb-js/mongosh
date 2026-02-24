export async function eventually(
  fn: Function,
  opts: {
    initialInterval?: number;
    timeout?: number;
    backoffFactor?: number;
  } = {}
): Promise<any> {
  const options = {
    initialInterval: 100,
    timeout: 10000,
    backoffFactor: 1, // no backoff
    ...opts,
  };

  let attempts = calculateAttempts(options);
  let currentInterval = options.initialInterval;

  let err;

  while (attempts) {
    attempts--;

    try {
      await fn();
      return;
    } catch (e: any) {
      err = e;
    }

    await new Promise((resolve) => setTimeout(resolve, currentInterval));

    currentInterval *= options.backoffFactor;
  }

  Object.assign(err, {
    timedOut: true,
    timeout: options.timeout,
    message: `[Timed out ${options.timeout}ms] ${err.message}`,
  });
  throw err;
}

function calculateAttempts(options: {
  initialInterval: number;
  timeout: number;
  backoffFactor: number;
}): number {
  let totalInterval = 0;
  let attempts = 0;
  let interval = options.initialInterval;

  while (totalInterval + interval <= options.timeout) {
    totalInterval += interval;
    interval *= options.backoffFactor;
    attempts++;
  }
  return attempts;
}
