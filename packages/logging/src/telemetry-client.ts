import type { TelemetryEvent } from './telemetry-events';
import type { MongoshAnalytics } from './analytics-helpers';

// TODO: replace with the real telemetry endpoint URL before shipping
export const DEFAULT_TELEMETRY_ENDPOINT =
  'https://telemetry.example.mongodb.com/v1/events';

const FLUSH_TIMEOUT_MS = 5_000;

/**
 * Sends telemetry events to the MongoDB telemetry HTTP endpoint.
 * Network errors are silently dropped. flush() waits up to 5 s for
 * in-flight requests so events sent right before exit are not lost.
 * Pass a custom `endpoint` to override the default (e.g. for testing).
 */
export class TelemetryClient implements MongoshAnalytics {
  private readonly endpoint: string;
  private readonly inflight: Promise<void>[] = [];

  constructor(endpoint: string = DEFAULT_TELEMETRY_ENDPOINT) {
    this.endpoint = endpoint;
  }

  track(event: TelemetryEvent): void {
    const p = fetch(this.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
    })
      .then(() => {})
      .catch(() => {});
    this.inflight.push(p);
  }

  async flush(): Promise<void> {
    const pending = this.inflight.splice(0);
    if (pending.length === 0) return;
    const timeout = new Promise<void>((resolve) =>
      setTimeout(resolve, FLUSH_TIMEOUT_MS).unref?.()
    );
    await Promise.race([Promise.all(pending), timeout]);
  }
}
