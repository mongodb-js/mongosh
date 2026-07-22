import type {
  AgentWithInitialize,
  RequestInit,
  Response,
} from '@mongodb-js/devtools-proxy-support';
import { useOrCreateAgent } from '@mongodb-js/devtools-proxy-support';
import type { Beacon } from '@mongosh/logging';
import {
  ThrottledAnalytics,
  ToggleableAnalytics,
  TelemetryClient,
  FetchBeacon,
  FireAndForgetBeacon,
} from '@mongosh/logging';
import path from 'path';

/**
 * ThrottledAnalytics caps events to protect against high-frequency
 * scenarios such as reconnect loops.
 */
const TELEMETRY_THROTTLE_RATE = 30;

export type SetupTelemetryAnalyticsParams = {
  /**
   * The telemetry endpoint from user config, which carries the production
   * default. Used as the lowest-priority source when resolving the endpoint.
   */
  configuredTelemetryEndpoint: string;
  /** Proxy-aware fetch used to deliver telemetry events. */
  fetch: (url: string, init?: RequestInit) => Promise<Response>;
  /** Directory used to persist cross-session throttle state. */
  metadataPath: string;
  /**
   * Proxy-aware agent shared with the rest of mongosh. This is always
   * present in a real mongosh — `useOrCreateAgent` is called without a
   * target in cli-repl.ts, and without one it always builds an agent rather
   * than returning undefined. The fire-and-forget transport only reuses it
   * (via {@link resolveTelemetryAgent}) when a proxy actually applies to the
   * telemetry endpoint; otherwise it builds its own resuming keep-alive
   * agent so TLS session resumption and the local DNS cache stay in effect.
   * Note that when a proxy agent *is* used, the fire-and-forget beacon's
   * `dispatched` guarantee ("bytes reached the kernel") is a little weaker:
   * the client-visible connect event can fire once the tunnel to the proxy
   * is established, ahead of the end-to-end TLS handshake completing —
   * acceptable for best-effort telemetry.
   */
  agent?: AgentWithInitialize;
  /** User-Agent header value for the fire-and-forget transport. */
  userAgent?: string;
};

export type SetupTelemetryAnalyticsResult = {
  /**
   * The analytics sink. When no endpoint is configured this is a no-op sink
   * (nothing is sent over the network); telemetry can still be "enabled" and
   * events are still written to the local log — they just have nowhere to be
   * sent.
   */
  analytics: ToggleableAnalytics;
  /** The resolved telemetry endpoint, or '' when none is configured. */
  telemetryEndpoint: string;
};

/**
 * Resolves the shared proxy-aware agent against the telemetry endpoint for
 * use by the fire-and-forget transport.
 *
 * `useOrCreateAgent(agent, telemetryEndpoint, true)`, given an *existing*
 * agent instance plus a target and `useTargetRegardlessOfExistingAgent:
 * true`, re-checks that agent's own `proxyOptions` against the target and:
 *  - returns `undefined` when they resolve to no proxy for that URL — the
 *    fire-and-forget transport then builds its own resuming keep-alive
 *    agent (TLS session resumption + DNS cache) instead of reusing the
 *    general-purpose one, both of which would otherwise be dead code;
 *  - returns the agent unchanged when a proxy *does* apply, so proxy
 *    environments keep working.
 * (Verified against node_modules/@mongodb-js/devtools-proxy-support
 * dist/agent.js: `useOrCreateAgent` branches on `isExistingAgentInstance`
 * (`'createConnection' in options`, true for any agent produced by
 * `createAgent`/`useOrCreateAgent`) and, on that branch, returns `undefined`
 * exactly when `useTargetRegardlessOfExistingAgent && target !== undefined
 * && agent.proxyOptions && !proxyForUrl(agent.proxyOptions, target)`.)
 */
export function resolveTelemetryAgent(
  agent: AgentWithInitialize | undefined,
  telemetryEndpoint: string
): AgentWithInitialize | undefined {
  if (!agent) return undefined;
  try {
    return useOrCreateAgent(agent, telemetryEndpoint, true);
  } catch {
    // A malformed endpoint must not break analytics setup; the fire-and-forget
    // beacon then builds its own agent and telemetry sends fail silently
    // downstream, consistent with the never-throw contract.
    return undefined;
  }
}

/**
 * Build the analytics sink for a mongosh session.
 *
 * When no endpoint is configured there is nowhere to send events, so a no-op
 * {@link ToggleableAnalytics} sink is returned. This does not disable telemetry
 * (`isTelemetryEnabled()` is independent of the endpoint) — events are still
 * logged locally, just not sent. This is also why CI is safe without any
 * special-casing: with no endpoint configured, no HTTP requests are made.
 */
export function setupTelemetryAnalytics({
  configuredTelemetryEndpoint,
  fetch,
  metadataPath,
  agent,
  userAgent,
}: SetupTelemetryAnalyticsParams): SetupTelemetryAnalyticsResult {
  // Resolve the telemetry endpoint: MONGOSH_TELEMETRY_ENDPOINT environment
  // variable > `telemetryEndpoint` user config (which carries the prod default).
  const telemetryEndpoint =
    process.env.MONGOSH_TELEMETRY_ENDPOINT ?? configuredTelemetryEndpoint;
  if (!telemetryEndpoint) {
    return { analytics: new ToggleableAnalytics(), telemetryEndpoint: '' };
  }
  // Opt-in fire-and-forget transport (MONGOSH-3454): resolves sends once the
  // request is written to an established socket instead of waiting for the
  // response, so telemetry can never delay mongosh exit. Owns its own
  // health policy (adaptive timeout, circuit breaker) and persists TLS
  // session tickets next to the throttle state for cross-session resumption.
  const beacon: Beacon =
    process.env.MONGOSH_TELEMETRY_TRANSPORT === 'fire-and-forget'
      ? new FireAndForgetBeacon({
          agent: resolveTelemetryAgent(agent, telemetryEndpoint),
          defaultHeaders: userAgent ? { 'User-Agent': userAgent } : {},
          sessionStorePath: path.join(
            metadataPath,
            'telemetry-tls-sessions.json'
          ),
        })
      : new FetchBeacon(fetch);
  return {
    telemetryEndpoint,
    // ThrottledAnalytics wraps TelemetryClient target and gates every
    // track() call before it reaches it. The timeframe defaults to 60s.
    // Once the cap is hit, further events within the same window
    // are silently dropped and TelemetryClient.track()
    // (and its underlying fetch) is never called.
    analytics: new ToggleableAnalytics(
      new ThrottledAnalytics({
        target: new TelemetryClient(telemetryEndpoint, beacon),
        throttle: {
          rate: TELEMETRY_THROTTLE_RATE,
          metadataPath,
        },
      })
    ),
  };
}
