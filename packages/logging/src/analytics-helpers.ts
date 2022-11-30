export type MongoshAnalyticsIdentity = {
  userId: string;
} | {
  anonymousId: string;
};

/**
 * General interface for an Analytics provider that mongosh can use.
 */
export interface MongoshAnalytics {
  identify(message: MongoshAnalyticsIdentity & {
    traits: { platform: string }
  }): void;

  track(message: MongoshAnalyticsIdentity & {
    event: string,
    properties: {
      // eslint-disable-next-line camelcase
      mongosh_version: string,
      [key: string]: any;
    }
  }): void;
}

/**
 * A no-op implementation of MongoshAnalytics that can be used when
 * actually connecting to the telemetry provider is not possible
 * (e.g. because we are running without an API key).
 */
export class NoopAnalytics implements MongoshAnalytics {
  identify(_info: any): void {} // eslint-disable-line @typescript-eslint/no-unused-vars
  track(_info: any): void {} // eslint-disable-line @typescript-eslint/no-unused-vars
}

/**
 * An implementation of MongoshAnalytics that forwards to another implementation
 * and can be enabled/paused/disabled.
 */
export class ToggleableAnalytics implements MongoshAnalytics {
  _queue: Array<['identify', Parameters<MongoshAnalytics['identify']>] | ['track', Parameters<MongoshAnalytics['track']>]> = [];
  _state: 'enabled' | 'disabled' | 'paused' = 'paused';
  _target: MongoshAnalytics;
  _pendingError?: Error;

  constructor(target: MongoshAnalytics = new NoopAnalytics()) {
    this._target = target;
  }

  identify(...args: Parameters<MongoshAnalytics['identify']>): void {
    this._validateArgs(args);
    switch (this._state) {
      case 'enabled':
        this._target.identify(...args);
        break;
      case 'paused':
        this._queue.push(['identify', args]);
        break;
      default:
        break;
    }
  }

  track(...args: Parameters<MongoshAnalytics['track']>): void {
    this._validateArgs(args);
    switch (this._state) {
      case 'enabled':
        this._target.track(...args);
        break;
      case 'paused':
        this._queue.push(['track', args]);
        break;
      default:
        break;
    }
  }

  enable() {
    if (this._pendingError) {
      throw this._pendingError;
    }
    this._state = 'enabled';
    const queue = this._queue;
    this._queue = [];
    for (const entry of queue) {
      if (entry[0] === 'identify') this.identify(...entry[1]);
      if (entry[0] === 'track') this.track(...entry[1]);
    }
  }

  disable() {
    this._state = 'disabled';
    this._pendingError = undefined;
    this._queue = [];
  }

  pause() {
    this._state = 'paused';
  }

  _validateArgs([firstArg]: [MongoshAnalyticsIdentity]): void {
    // Validate that the first argument of a track() or identify() call has
    // a .userId or .anonymousId property set.
    // This validation is also performed by the segment package, but is done
    // here for two reasons: One, if telemetry is disabled, then we lose the
    // stack trace information for where the buggy call came from, and two,
    // this way the validation affects all tests in CI, not just the ones that
    // are explicitly written to enable telemetry to a fake endpoint.
    if (!('userId' in firstArg && firstArg.userId) &&
        !('anonymousId' in firstArg && firstArg.anonymousId)) {
      const err = new Error('Telemetry setup is missing userId or anonymousId');
      switch (this._state) {
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
}
