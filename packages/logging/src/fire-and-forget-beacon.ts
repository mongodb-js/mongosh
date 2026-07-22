import http from 'http';
import https from 'https';
import tls from 'tls';
import type { Beacon, BeaconOutcome } from './beacon';
import { REQUEST_TIMEOUT_MS } from './beacon';

export type FireAndForgetBeaconOptions = {
  /**
   * Externally managed agent (e.g. the proxy-aware agent from
   * devtools-proxy-support). When set, it is used for both protocols and the
   * beacon does not create or destroy agents of its own.
   */
  agent?: http.Agent;
  /** Headers merged into every request (per-send headers take precedence). */
  defaultHeaders?: Record<string, string>;
  /** Extra TLS options for https connections (e.g. `ca` in tests). */
  tlsOptions?: tls.ConnectionOptions;
  /** Adaptive request-timeout tuning; see currentTimeoutMs(). */
  timeouts?: {
    /** Timeout until enough samples exist; also the upper bound. Default REQUEST_TIMEOUT_MS. */
    defaultMs?: number;
    /** Lower bound for the adaptive timeout. Default 250. */
    minMs?: number;
    /** Headroom multiplier over the p90 dispatch duration. Default 4. */
    multiplier?: number;
    /** Samples required before the timeout adapts. Default 10. */
    minSamples?: number;
  };
  /** Circuit breaker tuning. */
  breaker?: {
    /** Consecutive failures before the breaker opens. Default 5. */
    threshold?: number;
    /** How long the breaker stays open before allowing one probe. Default 5 minutes. */
    cooldownMs?: number;
  };
};

/**
 * A fire-and-forget HEAD launcher built on the raw http/https modules.
 *
 * Unlike fetch, `send()` resolves as soon as the request has been fully
 * written to an *established* connection ('finish' + 'connect'/'secureConnect')
 * instead of waiting for the response: once the bytes reach the kernel, TCP
 * delivers them even if the process exits immediately afterwards. Every socket
 * is unref'd so pending telemetry can never keep the mongosh process alive.
 *
 * Keep-alive agents reuse connections across sends when the server responds
 * promptly, but maxSockets is deliberately left unbounded: keep-alive reuse
 * requires the previous *response* to complete, so a socket cap would queue
 * burst sends behind a stalled response — the exact hang this class exists
 * to eliminate.
 */
export class FireAndForgetBeacon implements Beacon {
  protected readonly options: FireAndForgetBeaconOptions;
  private httpAgent?: http.Agent;
  private httpsAgent?: https.Agent;
  /** Durations of recent successful dispatches (ring of 50). */
  private readonly dispatchDurations: number[] = [];
  private consecutiveFailures = 0;
  private breakerOpenedAt?: number;

  constructor(options: FireAndForgetBeaconOptions = {}) {
    this.options = options;
  }

  private agentFor(isHttps: boolean): http.Agent {
    if (this.options.agent) return this.options.agent;
    const agentOptions = { keepAlive: true };
    if (isHttps) {
      this.httpsAgent ??= new https.Agent({
        ...agentOptions,
        ...this.options.tlsOptions,
      });
      return this.httpsAgent;
    }
    this.httpAgent ??= new http.Agent(agentOptions);
    return this.httpAgent;
  }

  send(url: string, headers: Record<string, string>): Promise<BeaconOutcome> {
    if (this.breakerIsOpen()) {
      // The endpoint has been consistently failing (down or firewalled);
      // act as /dev/null instead of burning sockets and timeouts.
      return Promise.resolve({ kind: 'suppressed' });
    }
    return this.doSend(url, headers).then((outcome) =>
      this.recordOutcome(outcome)
    );
  }

  /**
   * The request timeout the next send will use. Starts at the generous
   * default; once enough dispatch durations are observed, tightens to a
   * p90-with-headroom so a hanging endpoint is abandoned at a deadline
   * scaled to this host's actual network, never a hardcoded worst case.
   * (p90, not mean: telemetry RTTs have fat tails, and a mean-derived cap
   * would abort legitimate slow sends and feed back into the breaker.)
   */
  currentTimeoutMs(): number {
    const {
      defaultMs = REQUEST_TIMEOUT_MS,
      minMs = 250,
      multiplier = 4,
      minSamples = 10,
    } = this.options.timeouts ?? {};
    if (this.dispatchDurations.length < minSamples) return defaultMs;
    const sorted = [...this.dispatchDurations].sort((a, b) => a - b);
    const p90 =
      sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.9))];
    return Math.max(minMs, Math.min(defaultMs, Math.ceil(p90 * multiplier)));
  }

  private recordOutcome(outcome: BeaconOutcome): BeaconOutcome {
    if (outcome.kind === 'dispatched') {
      this.consecutiveFailures = 0;
      this.breakerOpenedAt = undefined;
      this.dispatchDurations.push(outcome.durationMs);
      if (this.dispatchDurations.length > 50) this.dispatchDurations.shift();
    } else if (outcome.kind === 'error') {
      this.consecutiveFailures++;
      const { threshold = 5 } = this.options.breaker ?? {};
      if (
        this.consecutiveFailures >= threshold &&
        this.breakerOpenedAt === undefined
      ) {
        this.breakerOpenedAt = Date.now();
      }
    }
    return outcome;
  }

  private breakerIsOpen(): boolean {
    if (this.breakerOpenedAt === undefined) return false;
    const { threshold = 5, cooldownMs = 300_000 } = this.options.breaker ?? {};
    if (Date.now() - this.breakerOpenedAt < cooldownMs) return true;
    // Half-open: let a single probe through. A success closes the breaker
    // fully (recordOutcome resets); one more failure reopens it immediately.
    this.breakerOpenedAt = undefined;
    this.consecutiveFailures = threshold - 1;
    return false;
  }

  private doSend(
    url: string,
    headers: Record<string, string>
  ): Promise<BeaconOutcome> {
    return new Promise<BeaconOutcome>((resolve) => {
      const start = performance.now();
      const done = (outcome: BeaconOutcome): void => resolve(outcome);

      let target: URL;
      try {
        target = new URL(url);
      } catch (error) {
        done({ kind: 'error', error: error as Error, durationMs: 0 });
        return;
      }
      const isHttps = target.protocol === 'https:';

      let req: http.ClientRequest;
      try {
        req = (isHttps ? https : http).request(target, {
          method: 'HEAD',
          headers: { ...this.options.defaultHeaders, ...headers },
          agent: this.agentFor(isHttps),
          signal: AbortSignal.timeout(this.currentTimeoutMs()),
          ...(isHttps ? this.options.tlsOptions : {}),
        });
      } catch (error) {
        done({
          kind: 'error',
          error: error as Error,
          durationMs: performance.now() - start,
        });
        return;
      }

      let connected = false;
      let finished = false;
      const maybeDispatched = (): void => {
        if (connected && finished) {
          done({ kind: 'dispatched', durationMs: performance.now() - start });
        }
      };

      req.on('socket', (socket) => {
        // Never let a pending telemetry request keep the process alive.
        socket.unref();
        if (!socket.connecting) {
          // Reused keep-alive socket — already established.
          connected = true;
          maybeDispatched();
          return;
        }
        // 'dispatched' means the bytes reached the kernel; that is only true
        // once the connection (including the TLS handshake) is established.
        const connectEvent =
          socket instanceof tls.TLSSocket ? 'secureConnect' : 'connect';
        socket.once(connectEvent, () => {
          connected = true;
          maybeDispatched();
        });
      });
      req.on('finish', () => {
        finished = true;
        maybeDispatched();
      });
      // Drain the response so the keep-alive socket returns to the pool.
      // (`done` is a no-op by then — the promise already resolved.)
      req.on('response', (res) => res.resume());
      req.on('error', (error) =>
        done({ kind: 'error', error, durationMs: performance.now() - start })
      );
      req.end();
    });
  }

  /** Destroys the beacon-owned agents and their pooled sockets. */
  close(): void {
    this.httpAgent?.destroy();
    this.httpsAgent?.destroy();
  }
}
