import { gzip } from 'zlib';
import { promisify } from 'util';
import type { TelemetryEvent } from './telemetry-events';
import type { MongoshAnalytics } from './analytics-helpers';
import type { Beacon } from './beacon';

const gzipAsync = promisify(gzip);

const FLUSH_TIMEOUT_MS = 2_000;
const SCHEMA_VERSION = 'v1';

function eventPath(name: TelemetryEvent['name']): string {
  return `/${SCHEMA_VERSION}/${name.toLowerCase().replace(/\s+/g, '-')}`;
}

export class TelemetryClient implements MongoshAnalytics {
  private readonly endpoint: string;
  private readonly beacon: Beacon;
  private readonly flushTimeoutMs: number;
  private readonly inflight: Promise<void>[] = [];

  constructor(
    endpoint: string,
    beacon: Beacon,
    flushTimeoutMs: number = FLUSH_TIMEOUT_MS
  ) {
    this.endpoint = endpoint;
    this.beacon = beacon;
    this.flushTimeoutMs = flushTimeoutMs;
  }

  /** Pre-establish the connection to the telemetry endpoint, if the beacon supports it. */
  warmUp(): void {
    this.beacon.warmUp?.(`${this.endpoint}/warm-up`);
  }

  /**
   * Sends events to the MongoDB telemetry endpoint. The format:
   *  - path (cs-uri-stem):          schema version + event name, e.g. /v1/new-connection
   *  - query string (cs-uri-query): device_id / session_id, for filtering & joins in raw logs
   *  - User-Agent (cs(User-Agent)): client identity (mongosh version, OS, arch),
   *                                 attached by the Beacon passed into the
   *                                 constructor, not by this class
   *  - Cookie (cs(Cookie)):         full event payload, gzip-compressed + base64-encoded
   *
   * https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/standard-logging.html
   */
  track(event: TelemetryEvent): void {
    const payload: Record<string, unknown> = event.payload;
    const query = new URLSearchParams({
      deviceId: String(payload.device_id ?? ''),
      sessionId: String(payload.session_id ?? ''),
    });
    const url = `${this.endpoint}${eventPath(event.name)}?${query.toString()}`;

    // TODO(MONGOSH-3504): It might be worth using something like zstd
    // and/or use a custom dictionary rather than plain gzip.
    const p = gzipAsync(Buffer.from(JSON.stringify(event)))
      .then((compressed) =>
        this.beacon.send(url, {
          Cookie: `mge=${compressed.toString('base64')}`,
        })
      )
      .then(() => {
        // discard the outcome; callers only await completion
      })
      .catch(() => {
        // telemetry is best-effort; guards gzip/serialization failures and
        // beacons that reject despite their contract
      });
    this.inflight.push(p);
  }

  /**
   * Bounded shutdown window: waits for in-flight sends to reach the kernel,
   * then gives the beacon its impending-shutdown hook (persistence I/O) —
   * all raced against flushTimeoutMs so exit can never hang on telemetry.
   */
  async flush(): Promise<void> {
    const pending = this.inflight.splice(0);
    if (pending.length === 0 && !this.beacon.flush) return;
    const work = Promise.all(pending)
      .then(() => this.beacon.flush?.())
      .catch(() => {
        // the beacon contract never rejects; guard against violations anyway
      });
    const timeout = new Promise<void>((resolve) =>
      setTimeout(resolve, this.flushTimeoutMs).unref?.()
    );
    await Promise.race([work, timeout]);
  }
}
