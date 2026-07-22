import type { RequestInit, Response } from '@mongodb-js/devtools-proxy-support';
import type { Beacon } from '@mongosh/logging';
import {
  ThrottledAnalytics,
  ToggleableAnalytics,
  TelemetryClient,
  FetchBeacon,
  FireAndForgetBeacon,
} from '@mongosh/logging';
import type http from 'http';
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
   * Proxy-aware agent shared with the rest of mongosh; undefined when no
   * proxy is configured. Used by the fire-and-forget transport so proxy
   * environments keep working.
   */
  agent?: http.Agent;
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
          agent,
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
