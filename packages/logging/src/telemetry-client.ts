import type { TelemetryEvent } from './telemetry-events';
import type { MongoshAnalytics } from './analytics-helpers';

// TODO: replace with the real telemetry endpoint URL before shipping
export const DEFAULT_TELEMETRY_ENDPOINT =
  'https://telemetry.example.mongodb.com/v1/events';

/**
 * Sends telemetry events to the MongoDB telemetry HTTP endpoint.
 * All requests are fire-and-forget — errors are silently dropped.
 * Pass a custom `endpoint` to override the default (e.g. for testing).
 */
export class TelemetryClient implements MongoshAnalytics {
  private readonly endpoint: string;

  constructor(endpoint: string = DEFAULT_TELEMETRY_ENDPOINT) {
    this.endpoint = endpoint;
  }

  track(event: TelemetryEvent): void {
    void fetch(this.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
    }).catch(() => {
      // fire-and-forget: network errors are intentionally ignored
    });
  }

  async flush(): Promise<void> {
    // fire-and-forget: no in-flight tracking, nothing to await
  }
}
