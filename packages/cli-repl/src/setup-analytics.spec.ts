import { expect } from 'chai';
import os from 'os';
import {
  NoopAnalytics,
  ThrottledAnalytics,
  ToggleableAnalytics,
} from '@mongosh/logging';
import type { TelemetryEvent } from '@mongosh/logging';
import type { AgentWithInitialize } from '@mongodb-js/devtools-proxy-support';
import { useOrCreateAgent } from '@mongodb-js/devtools-proxy-support';
import {
  resolveTelemetryAgent,
  setupTelemetryAnalytics,
} from './setup-analytics';

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
    device_id: 'test-device',
  },
};

describe('setup-analytics', function () {
  describe('setupTelemetryAnalytics', function () {
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

    function setup(
      params: Partial<Parameters<typeof setupTelemetryAnalytics>[0]> = {}
    ) {
      return setupTelemetryAnalytics({
        configuredTelemetryEndpoint: '',
        fetch: fetch as any,
        metadataPath,
        ...params,
      });
    }

    it('returns a no-op sink when no endpoint is configured', function () {
      const { analytics, telemetryEndpoint } = setup();
      expect(telemetryEndpoint).to.equal('');
      expect(analytics).to.be.instanceOf(ToggleableAnalytics);
      // No endpoint -> nothing to send to. Telemetry is not disabled here;
      // events are still logged locally, they just have no destination.
      expect(analytics._target).to.be.instanceOf(NoopAnalytics);
    });

    it('creates a telemetry client when an endpoint is configured via user config', function () {
      const { analytics, telemetryEndpoint } = setup({
        configuredTelemetryEndpoint: 'https://config.example/events',
      });
      expect(telemetryEndpoint).to.equal('https://config.example/events');
      expect(analytics._target).to.be.instanceOf(ThrottledAnalytics);
    });

    it('uses MONGOSH_TELEMETRY_ENDPOINT over the configured default', function () {
      process.env.MONGOSH_TELEMETRY_ENDPOINT = 'https://env.example/events';
      const { telemetryEndpoint, analytics } = setup({
        configuredTelemetryEndpoint: 'https://config.example/events',
      });
      expect(telemetryEndpoint).to.equal('https://env.example/events');
      expect(analytics._target).to.be.instanceOf(ThrottledAnalytics);
    });

    it('is disabled when every source resolves to an empty endpoint', function () {
      process.env.MONGOSH_TELEMETRY_ENDPOINT = '';
      const { telemetryEndpoint, analytics } = setup({
        configuredTelemetryEndpoint: '',
      });
      expect(telemetryEndpoint).to.equal('');
      expect(analytics._target).to.be.instanceOf(NoopAnalytics);
    });

    it('never calls fetch when no endpoint is configured', async function () {
      let fetchCount = 0;
      const { analytics } = setup({
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

  describe('resolveTelemetryAgent', function () {
    const createdAgents: (AgentWithInitialize | undefined)[] = [];

    afterEach(function () {
      // Mirrors cli-repl.ts (which destroys its shared agent without
      // awaiting); none of these agents ever open a real connection.
      for (const agent of createdAgents.splice(0)) {
        agent?.destroy();
      }
    });

    it('return undefined when the agent has no proxy configured for the endpoint', function () {
      const agent = useOrCreateAgent({});
      createdAgents.push(agent);
      const resolved = resolveTelemetryAgent(
        agent,
        'https://telemetry.example.com'
      );
      expect(resolved).to.equal(undefined);
    });

    it('return the agent unchanged when a proxy is configured for the endpoint', function () {
      const agent = useOrCreateAgent({
        proxy: 'http://proxy.example.com:8080',
      });
      createdAgents.push(agent);
      const resolved = resolveTelemetryAgent(
        agent,
        'https://telemetry.example.com'
      );
      expect(resolved).to.equal(agent);
    });

    it('return undefined when there is no agent to resolve', function () {
      const resolved = resolveTelemetryAgent(
        undefined,
        'https://telemetry.example.com'
      );
      expect(resolved).to.equal(undefined);
    });

    it('return undefined for an unparsable telemetry endpoint', function () {
      // Use an agent with proxy configured to trigger the code path that
      // parses the target URL in proxyForUrl(). With a malformed endpoint,
      // this should throw; the fix wraps it in try/catch and returns undefined.
      const agent = useOrCreateAgent({
        proxy: 'http://proxy.example.com:8080',
      });
      createdAgents.push(agent);
      const resolved = resolveTelemetryAgent(agent, 'not a url');
      expect(resolved).to.equal(undefined);
    });
  });
});
