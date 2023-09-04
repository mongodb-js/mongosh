import fs from 'fs';
import path from 'path';

export type MongoshAnalyticsIdentity =
  | {
      userId: string;
      anonymousId?: never;
    }
  | {
      userId?: never;
      anonymousId: string;
    };

type AnalyticsIdentifyMessage = MongoshAnalyticsIdentity & {
  traits: { platform: string };
};

type AnalyticsTrackMessage = MongoshAnalyticsIdentity & {
  event: string;
  properties: {
    mongosh_version: string;
    [key: string]: any;
  };
};

/**
 * General interface for an Analytics provider that mongosh can use.
 */
export interface MongoshAnalytics {
  identify(message: AnalyticsIdentifyMessage): void;

  track(message: AnalyticsTrackMessage): void;

  // NB: Callback and not a promise to match segment analytics interface so it's
  // easier to pass it to the helpers constructor
  flush(callback: (err?: Error) => void): void;
}

class Queue<T> {
  private queue: T[] = [];
  private state: 'paused' | 'enabled' | 'disabled' = 'paused';
  constructor(private applyFn: (val: T) => void) {}
  push(val: T) {
    switch (this.state) {
      case 'paused':
        this.queue.push(val);
        return;
      case 'enabled':
        this.applyFn(val);
        return;
      case 'disabled':
      default:
        return;
    }
  }
  enable() {
    this.state = 'enabled';
    const queue = this.queue;
    this.queue = [];
    queue.forEach((val) => {
      this.applyFn(val);
    });
  }
  disable() {
    this.state = 'disabled';
    this.queue = [];
  }
  pause() {
    this.state = 'paused';
  }
  getState() {
    return this.state;
  }
}

/**
 * A no-op implementation of MongoshAnalytics that can be used when
 * actually connecting to the telemetry provider is not possible
 * (e.g. because we are running without an API key).
 */
export class NoopAnalytics implements MongoshAnalytics {
  identify(): void {}
  track(): void {}
  flush(cb: () => void) {
    cb();
  }
}

type AnalyticsEventsQueueItem =
  | ['identify', Parameters<MongoshAnalytics['identify']>]
  | ['track', Parameters<MongoshAnalytics['track']>];

/**
 * An implementation of MongoshAnalytics that forwards to another implementation
 * and can be enabled/paused/disabled.
 */
export class ToggleableAnalytics implements MongoshAnalytics {
  _queue = new Queue<AnalyticsEventsQueueItem>((item) => {
    if (item[0] === 'identify') {
      this._target.identify(...item[1]);
    }
    if (item[0] === 'track') {
      this._target.track(...item[1]);
    }
  });
  _target: MongoshAnalytics;
  _pendingError?: Error;

  constructor(target: MongoshAnalytics = new NoopAnalytics()) {
    this._target = target;
  }

  identify(...args: Parameters<MongoshAnalytics['identify']>): void {
    this._validateArgs(args);
    this._queue.push(['identify', args]);
  }

  track(...args: Parameters<MongoshAnalytics['track']>): void {
    this._validateArgs(args);
    this._queue.push(['track', args]);
  }

  enable() {
    if (this._pendingError) {
      throw this._pendingError;
    }
    this._queue.enable();
  }

  disable() {
    this._pendingError = undefined;
    this._queue.disable();
  }

  pause() {
    this._queue.pause();
  }

  _validateArgs([firstArg]: [MongoshAnalyticsIdentity]): void {
    // Validate that the first argument of a track() or identify() call has
    // a .userId or .anonymousId property set.
    // This validation is also performed by the segment package, but is done
    // here for two reasons: One, if telemetry is disabled, then we lose the
    // stack trace information for where the buggy call came from, and two,
    // this way the validation affects all tests in CI, not just the ones that
    // are explicitly written to enable telemetry to a fake endpoint.
    if (
      !('userId' in firstArg && firstArg.userId) &&
      !('anonymousId' in firstArg && firstArg.anonymousId)
    ) {
      const err = new Error('Telemetry setup is missing userId or anonymousId');
      switch (this._queue.getState()) {
        case 'enabled':
          throw err;
        case 'paused':
          this._pendingError ??= err;
          break;
        default:
          break;
      }
    }
  }

  flush(callback: (err?: Error | undefined) => void): void {
    return this._target.flush(callback);
  }
}

type ThrottledAnalyticsOptions = {
  target: MongoshAnalytics;
  /**
   * Throttling options. If not provided, throttling is disabled (default: null)
   */
  throttle: {
    /** Allowed events per timeframe number */
    rate: number;
    /** Timeframe for throttling in milliseconds (default: 60_000ms) */
    timeframe?: number;
    /** Path to persist rpm value to be able to track them between sessions */
    metadataPath: string;
    /** Duration in milliseconds in which the lock is considered stale (default: 43_200_000) */
    lockfileStaleDuration?: number;
  } | null;
};

async function lockfile(
  filepath: string,
  staleDuration = 43_200_000
): Promise<() => Promise<void>> {
  let intervalId: ReturnType<typeof setInterval>;
  const lockfilePath = `${filepath}.lock`;
  const unlock = async () => {
    clearInterval(intervalId);
    try {
      return await fs.promises.rmdir(lockfilePath);
    } catch {
      // ignore update errors
    }
  };
  try {
    await fs.promises.mkdir(lockfilePath);
    // Set up an interval update for lockfile mtime so that if the lockfile is
    // created by long running process (longer than staleDuration) we make sure
    // that another process doesn't consider lockfile stale
    intervalId = setInterval(() => {
      const now = Date.now();
      fs.promises.utimes(lockfilePath, now, now).catch(() => {});
    }, staleDuration / 2);
    intervalId.unref?.();
    return unlock;
  } catch (e) {
    if ((e as any).code !== 'EEXIST') {
      throw e;
    }
    const stats = await fs.promises.stat(lockfilePath);
    // To make sure that the lockfile is not just a leftover from an unclean
    // process exit, we check whether or not it is stale
    if (Date.now() - stats.mtimeMs > staleDuration) {
      await fs.promises.rmdir(lockfilePath);
      return lockfile(filepath, staleDuration);
    }
    throw new Error(`File ${filepath} already locked`);
  }
}

export class ThrottledAnalytics implements MongoshAnalytics {
  private trackQueue = new Queue<AnalyticsTrackMessage>((message) => {
    if (this.shouldEmitAnalyticsEvent()) {
      this.target.track(message);
      this.throttleState.count++;
    }
  });
  private target: ThrottledAnalyticsOptions['target'] = new NoopAnalytics();
  private currentUserId: string | null = null;
  private throttleOptions: ThrottledAnalyticsOptions['throttle'] = null;
  private throttleState = { count: 0, timestamp: Date.now() };
  private restorePromise: Promise<void> = Promise.resolve();
  private unlock: () => Promise<void> = () => Promise.resolve();

  constructor({ target, throttle }: Partial<ThrottledAnalyticsOptions> = {}) {
    this.target = target ?? this.target;
    this.throttleOptions = throttle ?? this.throttleOptions;
  }

  get metadataPath() {
    if (!this.throttleOptions) {
      throw new Error(
        'Metadata path is not avaialble if throttling is disabled'
      );
    }

    if (!this.currentUserId) {
      throw new Error('Metadata path is not avaialble if userId is not set');
    }

    const {
      throttleOptions: { metadataPath },
      currentUserId: userId,
    } = this;

    return path.resolve(metadataPath, `am-${userId}.json`);
  }

  identify(message: AnalyticsIdentifyMessage): void {
    if (this.currentUserId) {
      throw new Error('Identify can only be called once per user session');
    }
    this.currentUserId = message.userId ?? message.anonymousId;
    this.restorePromise = this.restoreThrottleState().then((enabled) => {
      if (!enabled) {
        this.trackQueue.disable();
        return;
      }
      if (this.shouldEmitAnalyticsEvent()) {
        this.target.identify(message);
        this.throttleState.count++;
      }
      this.trackQueue.enable();
    });
  }

  track(message: AnalyticsTrackMessage): void {
    this.trackQueue.push(message);
  }

  // Tries to restore persisted throttle state and returns `true` if telemetry can
  // be enabled on restore. This method must not throw exceptions, since there
  // is nothing to handle them. If the error is unexpected, this method should
  // return `false` to disable telemetry
  private async restoreThrottleState(): Promise<boolean> {
    if (!this.throttleOptions) {
      return true;
    }

    if (!this.currentUserId) {
      throw new Error('Trying to restore throttle state before userId is set');
    }

    try {
      this.unlock = await lockfile(
        this.metadataPath,
        this.throttleOptions.lockfileStaleDuration
      );
    } catch (e) {
      // Error while locking means that lock already exists or something
      // unexpected happens, in either case we disable telemetry
      return false;
    }

    try {
      this.throttleState = JSON.parse(
        await fs.promises.readFile(this.metadataPath, 'utf8')
      );
    } catch (e) {
      if ((e as any).code !== 'ENOENT') {
        // Any error except ENOENT means that we failed to restore state for
        // some unknown / unexpected reason, ignore the error and assume that it
        // is not safe to enable telemetry in that case
        return false;
      }
    }

    return true;
  }

  private shouldEmitAnalyticsEvent() {
    // No throttle options indicate that throttling is disabled
    if (!this.throttleOptions) {
      return true;
    }
    // If throttle window passed, reset throttle state and allow to emit event
    if (
      Date.now() - this.throttleState.timestamp >
      (this.throttleOptions.timeframe ?? 60_000)
    ) {
      this.throttleState.timestamp = Date.now();
      this.throttleState.count = 0;
      return true;
    }
    // Otherwise only allow if the count below the allowed rate
    return this.throttleState.count < this.throttleOptions.rate;
  }

  flush(callback: (err?: Error | undefined) => void): void {
    if (!this.throttleOptions) {
      this.target.flush(callback);
      return;
    }

    if (!this.currentUserId) {
      callback(
        new Error('Trying to persist throttle state before userId is set')
      );
      return;
    }

    this.restorePromise.finally(async () => {
      try {
        await fs.promises.writeFile(
          this.metadataPath,
          JSON.stringify(this.throttleState)
        );
        await this.unlock();
        this.target.flush(callback);
      } catch (e) {
        callback(e as Error);
      }
    });
  }
}
