import fs from 'fs';
import path from 'path';
import type { TelemetryEvent } from './telemetry-events';

/**
 * General interface for a telemetry provider that mongosh can use.
 * All events are routed through the single track() method.
 */
export interface MongoshAnalytics {
  track(event: TelemetryEvent): void;
  flush(): Promise<void>;
}

class Queue<T> {
  private applyFn: (val: T) => void;
  private queue: T[] = [];
  private state: 'paused' | 'enabled' | 'disabled' = 'paused';
  constructor(applyFn: (val: T) => void) {
    this.applyFn = applyFn;
  }
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
 * A no-op implementation of MongoshAnalytics used when telemetry is unavailable.
 */
export class NoopAnalytics implements MongoshAnalytics {
  track(): void {}
  flush() {
    return Promise.resolve();
  }
}

/**
 * An implementation of MongoshAnalytics that forwards to another implementation
 * and can be enabled/paused/disabled.
 */
export class ToggleableAnalytics implements MongoshAnalytics {
  _queue = new Queue<TelemetryEvent>((event) => {
    this._target.track(event);
  });
  _target: MongoshAnalytics;

  constructor(target: MongoshAnalytics = new NoopAnalytics()) {
    this._target = target;
  }

  track(event: TelemetryEvent): void {
    this._queue.push(event);
  }

  enable() {
    this._queue.enable();
  }

  disable() {
    this._queue.disable();
  }

  pause() {
    this._queue.pause();
  }

  async flush(): Promise<void> {
    return await this._target.flush();
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
  private trackQueue = new Queue<TelemetryEvent>((event) => {
    if (this.shouldEmitAnalyticsEvent()) {
      this.target.track(event);
      this.throttleState.count++;
    }
  });
  private target: MongoshAnalytics;
  private currentSessionId: string | null = null;
  private throttleOptions: ThrottledAnalyticsOptions['throttle'] = null;
  private throttleState = { count: 0, timestamp: Date.now() };
  private restorePromise: Promise<void> = Promise.resolve();
  private unlock: () => Promise<void> = () => Promise.resolve();

  constructor({ target, throttle }: Partial<ThrottledAnalyticsOptions> = {}) {
    this.target = target ?? new NoopAnalytics();
    this.throttleOptions = throttle ?? this.throttleOptions;
  }

  get metadataPath() {
    if (!this.throttleOptions) {
      throw new Error(
        'Metadata path is not available if throttling is disabled'
      );
    }
    if (!this.currentSessionId) {
      throw new Error('Metadata path is not available if sessionId is not set');
    }
    return path.resolve(
      this.throttleOptions.metadataPath,
      `am-${this.currentSessionId}.json`
    );
  }

  track(event: TelemetryEvent): void {
    if (!this.currentSessionId) {
      // For IdentifyEvent, use anonymousId so that throttle state persists across
      // sessions for the same user. For other events, fall back to session_id.
      if (event.name === 'Identify') {
        this.currentSessionId = event.payload.anonymousId;
      } else {
        this.currentSessionId = event.payload.session_id;
      }
      this.restorePromise = this.restoreThrottleState().then((enabled) => {
        if (!enabled) {
          this.trackQueue.disable();
          return;
        }
        this.trackQueue.enable();
      });
    }
    this.trackQueue.push(event);
  }

  // Tries to restore persisted throttle state and returns `true` if telemetry can
  // be enabled on restore. This method must not throw exceptions, since there
  // is nothing to handle them. If the error is unexpected, this method should
  // return `false` to disable telemetry
  private async restoreThrottleState(): Promise<boolean> {
    if (!this.throttleOptions) {
      return true;
    }
    if (!this.currentSessionId) {
      throw new Error(
        'Trying to restore throttle state before sessionId is set'
      );
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

  async flush(): Promise<void> {
    if (!this.throttleOptions) {
      await this.target.flush();
      return;
    }
    if (!this.currentSessionId) {
      throw new Error(
        'Trying to persist throttle state before sessionId is set'
      );
    }
    try {
      await this.restorePromise;
    } catch {
      // Ignored.
    }
    await fs.promises.writeFile(
      this.metadataPath,
      JSON.stringify(this.throttleState)
    );
    await this.unlock();
    await this.target.flush();
  }
}

type SampledAnalyticsOptions = {
  target?: MongoshAnalytics;
  sampling: () => boolean;
};

export class SampledAnalytics implements MongoshAnalytics {
  private isEnabled: boolean;
  private target: MongoshAnalytics;

  constructor(configuration: SampledAnalyticsOptions) {
    this.isEnabled = configuration.sampling();
    this.target = configuration.target || new NoopAnalytics();
  }

  get enabled(): boolean {
    return this.isEnabled;
  }

  track(event: TelemetryEvent): void {
    this.isEnabled && this.target.track(event);
  }

  async flush(): Promise<void> {
    return await this.target.flush();
  }
}
