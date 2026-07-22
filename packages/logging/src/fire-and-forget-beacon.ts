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

      const req = (isHttps ? https : http).request(target, {
        method: 'HEAD',
        headers: { ...this.options.defaultHeaders, ...headers },
        agent: this.agentFor(isHttps),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        ...(isHttps ? this.options.tlsOptions : {}),
      });

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
