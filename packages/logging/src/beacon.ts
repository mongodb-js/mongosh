// Generous enough number for a fire-and-forget event. Adjust freely if needed.
export const REQUEST_TIMEOUT_MS = 5_000;

/** Minimal structural fetch type; compatible with @mongodb-js/devtools-proxy-support's fetch. */
export type FetchFn = (
  url: string,
  init?: {
    method?: string;
    headers?: Record<string, string>;
    signal?: AbortSignal;
  }
) => Promise<{ status: number }>;

/**
 * The result of a beacon send. `send()` never rejects; failures are reported
 * as `error` outcomes so callers do not need try/catch on the send path.
 *
 *  - 'dispatched': the request was fully written to an established connection;
 *                  no response was awaited (fire-and-forget implementations).
 *  - 'response':   a response was received (implementations that wait, e.g. fetch).
 *  - 'error':      the request could not be delivered.
 *  - 'suppressed': nothing was sent — the implementation's circuit breaker is
 *                  open because the endpoint has been consistently failing.
 */
export type BeaconOutcome =
  | { kind: 'dispatched'; durationMs: number }
  | { kind: 'response'; status: number; durationMs: number }
  | { kind: 'error'; error: Error; durationMs: number }
  | { kind: 'suppressed' };

/**
 * Transport used by TelemetryClient to deliver HEAD beacons to the telemetry
 * endpoint. The client owns the event format and serialization; implementations
 * own every communication concern: sockets, pooling, request timeouts,
 * health tracking, and giving up on a dead endpoint.
 */
export interface Beacon {
  send(url: string, headers: Record<string, string>): Promise<BeaconOutcome>;
  /**
   * Impending-shutdown hook: perform any last bounded I/O (e.g. persisting
   * TLS session tickets). Callers race it against a short deadline and it is
   * invoked after in-flight sends settle; it must resolve quickly and never
   * reject.
   */
  flush?(): Promise<void>;
  /** Optionally pre-establish a connection (DNS/TCP/TLS) before the first send. */
  warmUp?(url: string): void;
  /** Optionally release held resources (sockets, agents). */
  close?(): void;
}

/**
 * Baseline Beacon backed by a fetch function; waits for the HTTP response.
 * Exists as the conservative default transport and as the comparison baseline
 * for FireAndForgetBeacon (see scripts/benchmark-beacons.ts). Intentionally
 * minimal and untested — it is expected to be deleted once the
 * fire-and-forget transport becomes the default.
 */
export class FetchBeacon implements Beacon {
  private readonly fetch: FetchFn;

  constructor(fetch: FetchFn) {
    this.fetch = fetch;
  }

  async send(
    url: string,
    headers: Record<string, string>
  ): Promise<BeaconOutcome> {
    const start = performance.now();
    try {
      const response = await this.fetch(url, {
        method: 'HEAD',
        headers,
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      return {
        kind: 'response',
        status: response.status,
        durationMs: performance.now() - start,
      };
    } catch (error) {
      return {
        kind: 'error',
        error: error as Error,
        durationMs: performance.now() - start,
      };
    }
  }
}
