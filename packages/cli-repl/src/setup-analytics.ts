import type { RequestInit, Response } from '@mongodb-js/devtools-proxy-support';
import {
  ThrottledAnalytics,
  ToggleableAnalytics,
  TelemetryClient,
} from '@mongosh/logging';

/**
 * ThrottledAnalytics caps events per day to protect against high-frequency
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
}: SetupTelemetryAnalyticsParams): SetupTelemetryAnalyticsResult {
  // Resolve the telemetry endpoint: MONGOSH_TELEMETRY_ENDPOINT environment
  // variable > `telemetryEndpoint` user config (which carries the prod default).
  const telemetryEndpoint =
    process.env.MONGOSH_TELEMETRY_ENDPOINT ?? configuredTelemetryEndpoint;
  if (!telemetryEndpoint) {
    return { analytics: new ToggleableAnalytics(), telemetryEndpoint: '' };
  }
  return {
    telemetryEndpoint,
    analytics: new ToggleableAnalytics(
      new ThrottledAnalytics({
        // includeDeviceId: false — device_id is already in the event payload,
        // no need to duplicate it in the User-Agent header.
        target: new TelemetryClient(telemetryEndpoint, fetch),
        throttle: {
          rate: TELEMETRY_THROTTLE_RATE,
          metadataPath,
        },
      })
    ),
  };
}
