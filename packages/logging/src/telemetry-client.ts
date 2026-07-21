import { gzipSync } from 'zlib';
import type { TelemetryEvent } from './telemetry-events';
import type { MongoshAnalytics } from './analytics-helpers';

export const REQUEST_TIMEOUT_MS = 5_000;

const FLUSH_TIMEOUT_MS = 2_000;
const SCHEMA_VERSION = 'v1';

type FetchFn = (
  url: string,
  init?: {
    method?: string;
    headers?: Record<string, string>;
    signal?: AbortSignal;
  }
) => Promise<unknown>;

function eventPath(name: TelemetryEvent['name']): string {
  return `/${SCHEMA_VERSION}/${name.toLowerCase().replace(/\s+/g, '-')}`;
}

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
   *
   * Network errors are silently dropped. flush() waits up to 2s for
   * in-flight requests so events sent right before exit are not lost.
   * Overrides the default endpoint with MONGOSH_TELEMETRY_ENDPOINT env.
   * Uses a proxy-aware fetch from @mongodb-js/devtools-proxy-support
   * to respect the user's HTTP_PROXY / HTTPS_PROXY environment variables.
   */
  track(event: TelemetryEvent): void {
    const payload: Record<string, unknown> = event.payload;
    const query = new URLSearchParams({
      deviceId: String(payload.device_id ?? ''),
      sessionId: String(payload.session_id ?? ''),
    });
    const url = `${this.endpoint}${eventPath(event.name)}?${query.toString()}`;

    // TODO: It might be worth using something like zstd
    // and/or use a custom dictionary rather than plain gzip.
    const cookie = `mge=${gzipSync(Buffer.from(JSON.stringify(event))).toString(
      'base64'
    )}`;

    // A hung request (e.g. a stalled proxy) would otherwise never settle its
    // promise, leaking a socket and an entry in inflight forever — the
    // abort signal bounds every request so it always settles.
    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      REQUEST_TIMEOUT_MS
    ).unref?.();

    // User-Agent is intentionally not set here: the `fetch` passed in by the
    // caller (see cli-repl's fetch wrapper) always attaches its own
    // OS/version-derived User-Agent, which already covers the client identity.
    const p = this.fetch(url, {
      method: 'HEAD',
      headers: { Cookie: cookie },
      signal: controller.signal,
    })
      .then(() => {
        // discard the Response; callers only await completion
      })
      .catch(() => {
        // telemetry is best-effort; ignore send failures (including timeouts)
      })
      .finally(() => clearTimeout(timeoutId));
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
