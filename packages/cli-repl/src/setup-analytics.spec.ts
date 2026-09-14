import { expect } from 'chai';
import os from 'os';
import {
  NoopAnalytics,
  ThrottledAnalytics,
  ToggleableAnalytics,
} from '@mongosh/logging';
import type { TelemetryEvent } from '@mongosh/logging';
import { resolveToggleableAnalytics } from './setup-analytics';

const identifyEvent: TelemetryEvent = {
  name: 'Identify',
  payload: {
    mongosh_version: '1.0.0',
    ai_agent: undefined,
    session_id: 'test-session',
    platform: 'linux',
    arch: 'x64',
    is_containerized: false,
    os_type: undefined,
    os_version: undefined,
    os_arch: undefined,
    os_release: undefined,
    os_linux_dist: undefined,
    os_linux_release: undefined,
    os_darwin_product_name: undefined,
    os_darwin_product_version: undefined,
    os_darwin_product_build_version: undefined,
  },
};

describe('resolveToggleableAnalytics', function () {
  const metadataPath = os.tmpdir();
  // A fetch stub; these tests never actually track()/send, they only inspect
  // how the analytics sink is constructed.
  const fetch = () => Promise.resolve(new Response());

  let savedEnvEndpoint: string | undefined;
  beforeEach(function () {
    savedEnvEndpoint = process.env.MONGOSH_TELEMETRY_ENDPOINT;
    delete process.env.MONGOSH_TELEMETRY_ENDPOINT;
  });
  afterEach(function () {
    if (savedEnvEndpoint === undefined) {
      delete process.env.MONGOSH_TELEMETRY_ENDPOINT;
    } else {
      process.env.MONGOSH_TELEMETRY_ENDPOINT = savedEnvEndpoint;
    }
  });

  async function setup(
    params: Partial<Parameters<typeof resolveToggleableAnalytics>[0]> = {}
  ) {
    return resolveToggleableAnalytics({
      configuredTelemetryEndpoint: '',
      fetch: fetch as any,
      metadataPath,
      ...params,
    });
  }

  it('returns a no-op sink when no endpoint is configured', async function () {
    const { analytics, telemetryEndpoint } = await setup();
    expect(telemetryEndpoint).to.equal('');
    expect(analytics).to.be.instanceOf(ToggleableAnalytics);
    // No endpoint -> nothing to send to. Telemetry is not disabled here;
    // events are still logged locally, they just have no destination.
    expect(analytics._target).to.be.instanceOf(NoopAnalytics);
  });

  it('creates a telemetry client when an endpoint is configured via user config', async function () {
    const { analytics, telemetryEndpoint } = await setup({
      configuredTelemetryEndpoint: 'https://config.example/events',
    });
    expect(telemetryEndpoint).to.equal('https://config.example/events');
    expect(analytics._target).to.be.instanceOf(ThrottledAnalytics);
  });

  it('uses MONGOSH_TELEMETRY_ENDPOINT over the configured default', async function () {
    process.env.MONGOSH_TELEMETRY_ENDPOINT = 'https://env.example/events';
    const { telemetryEndpoint, analytics } = await setup({
      configuredTelemetryEndpoint: 'https://config.example/events',
    });
    expect(telemetryEndpoint).to.equal('https://env.example/events');
    expect(analytics._target).to.be.instanceOf(ThrottledAnalytics);
  });

  it('is disabled when every source resolves to an empty endpoint', async function () {
    process.env.MONGOSH_TELEMETRY_ENDPOINT = '';
    const { telemetryEndpoint, analytics } = await setup({
      configuredTelemetryEndpoint: '',
    });
    expect(telemetryEndpoint).to.equal('');
    expect(analytics._target).to.be.instanceOf(NoopAnalytics);
  });

  it('never calls fetch when no endpoint is configured', async function () {
    let fetchCount = 0;
    const { analytics } = await setup({
      configuredTelemetryEndpoint: '',
      fetch: (() => {
        fetchCount++;
        return Promise.resolve(new Response());
      }) as any,
    });
    // Enable the queue so tracked events are forwarded to the target, then
    // flush — with no endpoint the target is a NoopAnalytics, so no request
    // is ever made.
    analytics.enable();
    analytics.track(identifyEvent);
    await analytics.flush();
    expect(fetchCount).to.equal(0);
  });
});
