import { gzip } from 'zlib';
import { promisify } from 'util';
import timers from 'timers';
import type { TelemetryEvent } from './telemetry-events';
import type { MongoshAnalytics } from './analytics-helpers';

const gzipAsync = promisify(gzip);

// Generous enough number for a fire-and-forget event. Adjust freely if needed.
export const REQUEST_TIMEOUT_MS = 1_000;
export const FLUSH_TIMEOUT_MS = 500;
const SCHEMA_VERSION = 'v1';

function noop(): void {
  // ignore
}

type FetchFn = (
  url: string,
  init?: {
    method?: string;
    headers?: { Cookie: string };
    signal?: AbortSignal;
  }
) => Promise<unknown>;

function eventPath(name: TelemetryEvent['name']): string {
  return `/${SCHEMA_VERSION}/${name.toLowerCase().replace(/\s+/g, '-')}`;
}

export class TelemetryClient implements MongoshAnalytics {
  private readonly endpoint: string;
  private readonly fetch: FetchFn;
  private readonly requestTimeoutMs: number;
  private readonly flushTimeoutMs: number;
  private readonly controller = new AbortController();
  private pending = new Set<Promise<unknown> | undefined>();

  constructor(
    endpoint: string,
    fetch: FetchFn = globalThis.fetch.bind(globalThis),
    flushTimeoutMs: number = FLUSH_TIMEOUT_MS,
    requestTimeoutMs: number = REQUEST_TIMEOUT_MS
  ) {
    this.endpoint = endpoint;
    this.fetch = fetch;
    this.flushTimeoutMs = flushTimeoutMs;
    this.requestTimeoutMs = requestTimeoutMs;
  }

  /**
   * Sends events to the MongoDB telemetry endpoint. The format:
   *  - path (cs-uri-stem):          schema version + event name, e.g. /v1/new-connection
   *  - query string (cs-uri-query): device_id / session_id, for filtering & joins in raw logs
   *  - User-Agent (cs(User-Agent)): client identity (mongosh version, OS, arch),
   *                                 attached by the `fetch` passed into the
   *                                 constructor, not by this class
   *  - Cookie (cs(Cookie)):         full event payload, gzip-compressed + base64-encoded
   *
   * https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/standard-logging.html
   */
  public track(event: TelemetryEvent): void {
    void this.doTrack(event).then(noop, noop);
  }

  private async doTrack(event: TelemetryEvent): Promise<void> {
    let fetchPromise: Promise<unknown> | undefined;
    try {
      const payload: Record<string, unknown> = event.payload;
      const query = new URLSearchParams({
        deviceId: String(payload.device_id ?? ''),
        sessionId: String(payload.session_id ?? ''),
      });
      const url = `${this.endpoint}${eventPath(
        event.name
      )}?${query.toString()}`;

      // TODO(MONGOSH-3504): It might be worth using something like zstd
      // and/or use a custom dictionary rather than plain gzip.
      const compressed = await gzipAsync(Buffer.from(JSON.stringify(event)));
      const signal = AbortSignal.any([
        AbortSignal.timeout(this.requestTimeoutMs),
        this.controller.signal,
      ]);
      fetchPromise = this.fetch(url, {
        method: 'HEAD',
        headers: { Cookie: `mge=${compressed.toString('base64')}` },
        signal,
      });
      this.pending.add(fetchPromise);
      await fetchPromise;
    } catch {
      // ignore
    } finally {
      this.pending.delete(fetchPromise);
    }
  }

  async flush(): Promise<void> {
    if (this.pending.size !== 0) {
      const maxFlushTimeout = timers.promises.setTimeout(this.flushTimeoutMs, {
        unref: true,
      });
      await Promise.race([Promise.allSettled(this.pending), maxFlushTimeout]);
    }
    this.controller.abort('TelemetryClient flush');
  }
}
