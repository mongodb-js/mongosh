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

/** The set of options for analytics/telemetry support. */
export type AnalyticsOptions = {
  /** Whether to enable telemetry even if we are running in CI. */
  alwaysEnable?: boolean;
  /** Override the telemetry endpoint URL (for testing). */
  telemetryEndpoint?: string;
};

export type SetupTelemetryAnalyticsParams = {
  analyticsOptions: AnalyticsOptions | undefined;
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
  /** The analytics sink; a no-op ToggleableAnalytics when telemetry is off. */
  analytics: ToggleableAnalytics;
  /** The resolved telemetry endpoint, or '' when telemetry is disabled. */
  telemetryEndpoint: string;
};

/**
 * Build the analytics sink for a mongosh session.
 *
 * Telemetry is disabled (a no-op {@link ToggleableAnalytics} is returned) when
 * no endpoint is configured, since there is nowhere to send events.
 *
 * @throws in the mongosh CI environment unless `alwaysEnable` is set.
 */
export function setupTelemetryAnalytics({
  analyticsOptions,
  configuredTelemetryEndpoint,
  fetch,
  metadataPath,
}: SetupTelemetryAnalyticsParams): SetupTelemetryAnalyticsResult {
  if (process.env.IS_MONGOSH_EVERGREEN_CI && !analyticsOptions?.alwaysEnable) {
    throw new Error('no analytics setup for the mongosh CI environment');
  }
  // Resolve the telemetry endpoint: explicit override (tests/embedders) >
  // environment variable > `telemetryEndpoint` user config (production default).
  const telemetryEndpoint =
    analyticsOptions?.telemetryEndpoint ??
    process.env.MONGOSH_TELEMETRY_ENDPOINT ??
    configuredTelemetryEndpoint;
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
