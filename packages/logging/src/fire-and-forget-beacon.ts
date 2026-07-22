import dns from 'dns';
import http from 'http';
import https from 'https';
import tls from 'tls';
import type net from 'net';
import type { Duplex } from 'stream';
import type { Beacon, BeaconOutcome } from './beacon';
import { REQUEST_TIMEOUT_MS } from './beacon';
import { TlsSessionStore } from './tls-session-store';

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
  /** DNS lookup override; used by the built-in agents. */
  lookup?: typeof dns.lookup;
  /** TTL for the built-in DNS cache; default 60s. Ignored when `lookup` is set. */
  dnsCacheTtlMs?: number;
  /**
   * Path of the persisted TLS session-ticket store. When set (and no external
   * `agent` is given), https connections resume sessions across processes.
   */
  sessionStorePath?: string;
};

/**
 * Wraps dns.lookup with a tiny TTL cache so repeat connections to the
 * telemetry endpoint skip the DNS round-trip. Multi-answer (`all: true`)
 * lookups are passed through uncached.
 */
export function createCachedLookup(
  ttlMs: number,
  baseLookup: typeof dns.lookup = dns.lookup
): typeof dns.lookup {
  const cache = new Map<
    string,
    { address: string; family: number; expiresAt: number }
  >();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return function lookup(hostname: string, options: any, callback?: any): any {
    if (typeof options === 'function') {
      callback = options;
      options = {};
    }
    if (options.all) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      return baseLookup(hostname, options, callback);
    }
    // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
    const key = `${hostname}|${options.family ?? 0}`;
    const hit = cache.get(key);
    if (hit && hit.expiresAt > Date.now()) {
      callback(null, hit.address, hit.family);
      return;
    }
    baseLookup(
      hostname,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      options,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (err: NodeJS.ErrnoException | null, address: any, family: any) => {
        if (!err && typeof address === 'string') {
          cache.set(key, {
            address,
            family,
            expiresAt: Date.now() + ttlMs,
          });
        }
        callback(err, address, family);
      }
    );
  } as typeof dns.lookup;
}

/**
 * https.Agent that persists TLS session tickets via TlsSessionStore and
 * offers them on new connections, so a fresh process resumes the handshake
 * in one round-trip instead of performing a full one.
 */
export class ResumingHttpsAgent extends https.Agent {
  private readonly store: TlsSessionStore;
  private handshakeCompleted = false;
  private ticketCaptured = false;
  private notifyFirstTicket?: () => void;
  /** Resolves when the first session ticket of this process is captured. */
  readonly firstTicket: Promise<void>;

  constructor(options: https.AgentOptions, store: TlsSessionStore) {
    super(options);
    this.store = store;
    this.firstTicket = new Promise<void>(
      (resolve) => (this.notifyFirstTicket = resolve)
    );
  }

  /**
   * True once a handshake has completed but its ticket has not arrived yet.
   * TLS 1.3 delivers NewSessionTicket ~1 RTT after the handshake — after
   * `dispatched` resolves — so at shutdown this indicates a ticket is still
   * worth a bounded wait (see FireAndForgetBeacon.flush()).
   *
   * Gated on the handshake actually *completing*, not merely being
   * attempted: if the endpoint is down or refuses the connection, no
   * ticket can ever arrive, and flush() should not pay the grace period in
   * exactly the failure case the circuit breaker exists for.
   */
  get awaitingFirstTicket(): boolean {
    return this.handshakeCompleted && !this.ticketCaptured;
  }

  // Overrides the documented Agent API (called for every new connection).
  // The installed @types/node *does* declare this method (unlike what the
  // task brief assumed) typed generically via net.NetConnectOpts/Duplex; the
  // signature below matches that declaration verbatim so the override stays
  // structurally compatible, and the TLS-specific shape is recovered
  // internally via the same prototype-cast trick used to invoke super.
  createConnection(
    options: net.NetConnectOpts,
    callback?: (err: Error | null, stream: Duplex) => void
  ): Duplex {
    const tlsOptions = options as tls.ConnectionOptions & { host?: string };
    const host = tlsOptions.host ?? 'localhost';
    const socket = (
      https.Agent.prototype as unknown as {
        createConnection: (o: unknown, cb?: unknown) => tls.TLSSocket;
      }
    ).createConnection.call(
      this,
      { ...tlsOptions, session: this.store.get(host) },
      callback
    );
    socket.once('secureConnect', () => {
      this.handshakeCompleted = true;
    });
    // TLS 1.3 delivers session tickets after the handshake, possibly more
    // than once; each one supersedes the previous.
    socket.on('session', (ticket: Buffer) => {
      this.ticketCaptured = true;
      this.notifyFirstTicket?.();
      this.store.set(host, ticket);
    });
    return socket;
  }
}

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
  private sessionStore?: TlsSessionStore;
  private resumingAgent?: ResumingHttpsAgent;
  /** Durations of recent successful dispatches (ring of 50). */
  private readonly dispatchDurations: number[] = [];
  private consecutiveFailures = 0;
  private breakerOpenedAt?: number;
  private probeInFlight = false;
  private lookup?: typeof dns.lookup;

  constructor(options: FireAndForgetBeaconOptions = {}) {
    this.options = options;
  }

  private agentFor(isHttps: boolean): http.Agent {
    if (this.options.agent) return this.options.agent;
    this.lookup ??=
      this.options.lookup ??
      createCachedLookup(this.options.dnsCacheTtlMs ?? 60_000);
    const agentOptions = { keepAlive: true, lookup: this.lookup };
    if (isHttps) {
      if (!this.httpsAgent) {
        if (this.options.sessionStorePath) {
          this.sessionStore = new TlsSessionStore(
            this.options.sessionStorePath
          );
          this.resumingAgent = new ResumingHttpsAgent(
            { ...agentOptions, ...this.options.tlsOptions },
            this.sessionStore
          );
          this.httpsAgent = this.resumingAgent;
        } else {
          this.httpsAgent = new https.Agent({
            ...agentOptions,
            ...this.options.tlsOptions,
          });
        }
      }
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
      this.probeInFlight = false;
      this.dispatchDurations.push(outcome.durationMs);
      if (this.dispatchDurations.length > 50) this.dispatchDurations.shift();
    } else if (outcome.kind === 'error') {
      const wasProbe = this.probeInFlight;
      this.probeInFlight = false;
      this.consecutiveFailures++;
      const { threshold = 5 } = this.options.breaker ?? {};
      if (wasProbe) {
        // Failed probe: reopen immediately, restarting the cooldown.
        this.breakerOpenedAt = Date.now();
      } else if (
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
    // A half-open probe is already in flight — stay suppressed until its
    // outcome is recorded.
    if (this.probeInFlight) return true;
    const { cooldownMs = 300_000 } = this.options.breaker ?? {};
    if (Date.now() - this.breakerOpenedAt < cooldownMs) return true;
    // Half-open: exactly this send becomes the probe. breakerOpenedAt stays
    // set so concurrent sends remain suppressed while the probe is out.
    this.probeInFlight = true;
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

  /**
   * Impending-shutdown hook, invoked via TelemetryClient.flush(). TLS 1.3
   * delivers session tickets ~1 RTT *after* the handshake — i.e. after
   * `dispatched` resolves — so a short-lived session that only sends at exit
   * would otherwise never seed the resumption cache. Grant a small bounded
   * grace for an in-flight ticket, then await the pending store write.
   */
  async flush(): Promise<void> {
    if (this.resumingAgent?.awaitingFirstTicket) {
      await Promise.race([
        this.resumingAgent.firstTicket,
        new Promise((resolve) => setTimeout(resolve, 100).unref?.()),
      ]);
    }
    await this.sessionStore?.flush();
  }

  /**
   * Fire a HEAD request purely to establish the connection (DNS + TCP + TLS)
   * so that the first real event is a bare write on a hot socket. The
   * outcome is intentionally ignored.
   */
  warmUp(url: string): void {
    void this.send(url, {});
  }

  /** Destroys the beacon-owned agents and their pooled sockets. */
  close(): void {
    this.httpAgent?.destroy();
    this.httpsAgent?.destroy();
  }
}
