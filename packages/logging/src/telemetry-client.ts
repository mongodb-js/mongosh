import type { TelemetryEvent } from './telemetry-events';
import type { MongoshAnalytics } from './analytics-helpers';

const FLUSH_TIMEOUT_MS = 2_000;

type FetchFn = (
  url: string,
  init?: { method?: string; headers?: Record<string, string>; body?: string }
) => Promise<unknown>;

/**
 * Sends telemetry events to the MongoDB telemetry HTTP endpoint.
 * Network errors are silently dropped. flush() waits up to 2 s for
 * in-flight requests so events sent right before exit are not lost.
 * Pass a custom `endpoint` to override the default (e.g. for testing).
 * Pass a proxy-aware `fetch` (e.g. from @mongodb-js/devtools-proxy-support)
 * to respect the user's HTTP_PROXY / HTTPS_PROXY environment variables.
 */
export class TelemetryClient implements MongoshAnalytics {
  private readonly endpoint: string;
  private readonly fetch: FetchFn;
  private readonly flushTimeoutMs: number;
  private readonly inflight: Promise<void>[] = [];

  constructor(
    endpoint: string,
    fetch: FetchFn = globalThis.fetch.bind(globalThis),
    flushTimeoutMs: number = FLUSH_TIMEOUT_MS
  ) {
    this.endpoint = endpoint;
    this.fetch = fetch;
    this.flushTimeoutMs = flushTimeoutMs;
  }

  track(event: TelemetryEvent): void {
    const p = this.fetch(this.endpoint, {
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
      setTimeout(resolve, this.flushTimeoutMs).unref?.()
    );
    await Promise.race([Promise.all(pending), timeout]);
  }
}
