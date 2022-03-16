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

  constructor(target: MongoshAnalytics = new NoopAnalytics()) {
    this._target = target;
  }

  identify(...args: Parameters<MongoshAnalytics['identify']>): void {
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
    this._queue = [];
  }

  pause() {
    this._state = 'paused';
  }
}
