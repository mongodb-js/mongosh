import util from 'util';
import { expect } from 'chai';
import type { Database, Mongo, ReplicaSet } from '../src';

export const delay = util.promisify(setTimeout);

export const ensureMaster = async (
  cls: Database | ReplicaSet,
  timeout: number,
  hostport: string
): Promise<void> => {
  while (!(await cls.hello()).isWritablePrimary) {
    if (timeout > 32000) {
      return expect.fail(
        `Waited for ${hostport} to become primary, never happened`
      );
    }
    await delay(timeout);
    timeout *= 2; // try again but wait double
  }
};

const localSessionIds = async (mongo: Mongo) => {
  return (
    await (
      await mongo.getDB('config').aggregate([{ $listLocalSessions: {} }])
    ).toArray()
  ).map((k) => JSON.stringify(k._id.id));
};

export const ensureSessionExists = async (
  mongo: Mongo,
  timeout: number,
  sessionId: string
): Promise<void> => {
  let ls = await localSessionIds(mongo);
  while (!ls.includes(sessionId)) {
    if (timeout > 32000) {
      throw new Error(
        `Waited for session id ${sessionId}, never happened ${ls}`
      );
    }
    await delay(timeout);
    timeout *= 2; // try again but wait double
    ls = await localSessionIds(mongo);
  }
};

export const ensureResult = async <T = any>(
  timeout: number,
  getFn: () => T | Promise<T>,
  testFn: (val: T) => boolean,
  failMsg: string
): Promise<any> => {
  let result = await getFn();
  while (!testFn(result)) {
    if (timeout > 1000) {
      // eslint-disable-next-line no-console
      console.log(`looping at timeout=${timeout}, result=${result}`);
    }
    if (timeout > 30000) {
      throw new Error(`Waited for ${failMsg}, never happened`);
    }
    await delay(timeout);
    timeout *= 2; // try again but wait double
    result = await getFn();
  }
  return result;
};

export function createRetriableMethod<
  T extends { [K in F]: (...args: any[]) => Promise<any> },
  F extends keyof T
>(
  target: T,
  method: F,
  options?: {
    totalRetries?: number;
    initialSleepInterval?: number;
    backoffFactor?: number;
    noiseThreshold: number;
  }
): T[F] {
  const totalRetries = options?.totalRetries ?? 12;
  const initialSleepInterval = options?.initialSleepInterval ?? 1000;
  const backoffFactor = options?.backoffFactor ?? 1.3;
  const noiseThreshold = options?.noiseThreshold ?? 0.8;
  const func: T[F] = target[method];

  if (typeof func !== 'function') {
    throw new Error(`${method.toString()} is not a method`);
  }

  let timeout = 0;
  const retriableFunc = async (...args: any) => {
    let lastErr: any;
    let sleepInterval = initialSleepInterval;
    for (let i = 0; i < totalRetries; i++) {
      try {
        return await func.apply(target, args);
      } catch (e) {
        // start to be noisy after % of attempts failed
        if (i > totalRetries * noiseThreshold) {
          // eslint-disable-next-line no-console
          console.info(`${method.toString()} did not succeed yet. Error:`, e);
        }

        timeout += sleepInterval;
        lastErr = e;

        if (i + 1 < totalRetries) {
          await delay(sleepInterval);
          sleepInterval *= backoffFactor;
        }
      }
    }

    Object.assign(lastErr, {
      timedOut: true,
      timeout,
      message: `[Timed out ${timeout}ms] - ${String(method)} - ${
        lastErr.message
      }`,
    });

    throw lastErr;
  };

  return retriableFunc as T[F];
}
