import os from 'os';
import path from 'path';
import fs from 'fs';
import { promisify } from 'util';
import { expect } from 'chai';
import type { MongoshAnalytics } from './analytics-helpers';
import {
  ToggleableAnalytics,
  ThrottledAnalytics,
  SampledAnalytics,
} from './analytics-helpers';
import type { IdentifyEvent, NewConnectionEvent } from './telemetry-events';

const wait = promisify(setTimeout);

const sessionId = 's-test-session';

const iEvt: IdentifyEvent = {
  name: 'Identify',
  anonymousId: 'u-test',
  session_id: sessionId,
  mongosh_version: '1.2.3',
  ai_agent: undefined,
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
  device_id: 'test-device-id',
};

const tEvt: NewConnectionEvent = {
  name: 'New Connection',
  session_id: sessionId,
  mongosh_version: '1.2.3',
  ai_agent: undefined,
  payload: {
    is_atlas: false,
    is_atlas_url: undefined,
    is_local_atlas: false,
    is_localhost: true,
    is_do_url: undefined,
    is_enterprise: undefined,
    is_genuine: true,
    is_data_federation: undefined,
    is_stream: undefined,
    atlas_hostname: null,
    server_version: '7.0.0',
    server_os: undefined,
    server_arch: undefined,
    non_genuine_server_name: '',
    auth_type: undefined,
    api_version: undefined,
    api_strict: undefined,
    api_deprecation_errors: undefined,
    dl_version: undefined,
    atlas_version: undefined,
    node_version: undefined,
  },
};

const t2Evt: NewConnectionEvent = {
  ...tEvt,
  payload: { ...tEvt.payload, is_localhost: false },
};

describe('analytics helpers', function () {
  let events: any[];
  let target: MongoshAnalytics;

  beforeEach(function () {
    events = [];
    target = {
      track(event: any) {
        events.push(['track', event]);
      },
      async flush() {
        return Promise.resolve();
      },
    };
  });

  describe('ToggleableAnalytics', function () {
    it('starts out in paused state and can be toggled on and off', function () {
      const toggleable = new ToggleableAnalytics(target);
      expect(events).to.have.lengthOf(0);

      toggleable.track(iEvt);
      toggleable.track(tEvt);
      expect(events).to.have.lengthOf(0);

      toggleable.enable();
      expect(events).to.have.lengthOf(2);

      toggleable.track(t2Evt);
      expect(events).to.have.lengthOf(3);

      toggleable.pause();
      toggleable.track(tEvt);
      expect(events).to.have.lengthOf(3);

      toggleable.disable();
      expect(events).to.have.lengthOf(3);
      toggleable.enable();

      expect(events).to.deep.equal([
        ['track', iEvt],
        ['track', tEvt],
        ['track', t2Evt],
      ]);
    });
  });

  describe('ThrottledAnalytics', function () {
    const metadataPath = os.tmpdir();
    const userId = 'u-' + Date.now();

    const throttledIEvt: IdentifyEvent = {
      ...iEvt,
      anonymousId: userId,
      session_id: userId,
    };
    const throttledTEvt: NewConnectionEvent = { ...tEvt, session_id: userId };
    const throttledT2Evt: NewConnectionEvent = { ...t2Evt, session_id: userId };

    afterEach(async function () {
      try {
        await fs.promises.unlink(
          path.resolve(metadataPath, `am-${userId}.json`)
        );
      } catch (e) {
        // ignore
      }
    });

    it('should not throttle events by default', async function () {
      const analytics = new ThrottledAnalytics({ target });
      analytics.track(throttledIEvt);
      analytics.track(throttledTEvt);
      analytics.track(throttledTEvt);
      analytics.track(throttledTEvt);
      analytics.track(throttledTEvt);
      await analytics.flush();
      expect(events).to.have.lengthOf(5);
    });

    it('should throttle when throttling options are provided', async function () {
      const analytics = new ThrottledAnalytics({
        target,
        throttle: { rate: 5, metadataPath },
      });
      analytics.track(throttledIEvt);
      for (let i = 0; i < 100; i++) {
        analytics.track(throttledTEvt);
      }
      await analytics.flush();
      expect(events).to.have.lengthOf(5);
    });

    it('should reset counter after a timeout', async function () {
      const analytics = new ThrottledAnalytics({
        target,
        throttle: { rate: 5, metadataPath, timeframe: 200 },
      });
      analytics.track(throttledIEvt);
      for (let i = 0; i < 100; i++) {
        analytics.track(throttledTEvt);
      }
      // More than 200 to make sure we are outside of the previous frame
      await wait(300);
      for (let i = 0; i < 100; i++) {
        analytics.track(throttledTEvt);
      }
      await analytics.flush();
      expect(events).to.have.lengthOf(10);
    });

    it('should persist throttled state and throttle across sessions', async function () {
      // first "session"
      const a1 = new ThrottledAnalytics({
        target,
        throttle: { rate: 5, metadataPath },
      });
      a1.track(throttledIEvt);
      a1.track(throttledTEvt);
      a1.track(throttledTEvt);
      await a1.flush();
      expect(events).to.have.lengthOf(3);

      // second "session" — uses a different session_id so no lock conflict
      const sid2 = userId + '-2';
      const a2 = new ThrottledAnalytics({
        target,
        throttle: { rate: 5, metadataPath },
      });
      a2.track({ ...throttledIEvt, session_id: sid2 });
      for (let i = 0; i < 100; i++) {
        a2.track({ ...throttledTEvt, session_id: sid2 });
      }
      await a2.flush();
      // a1 used 3, a2 gets 2 more to reach rate=5
      expect(events).to.have.lengthOf(5);
    });

    it('should only allow one analytics instance to send events', async function () {
      const a1 = new ThrottledAnalytics({
        target,
        throttle: { rate: 5, metadataPath },
      });
      const a2 = new ThrottledAnalytics({
        target,
        throttle: { rate: 5, metadataPath },
      });

      a1.track(throttledIEvt);
      a2.track(throttledIEvt);
      a1.track(throttledTEvt);
      a2.track(throttledT2Evt);
      a1.track(throttledTEvt);
      a2.track(throttledT2Evt);
      a1.track(throttledTEvt);
      a2.track(throttledT2Evt);

      await a1.flush();
      await a2.flush();

      expect(events).to.have.lengthOf(4);
      expect(
        events
          .filter((e) => e[0] === 'track' && e[1].name === 'New Connection')
          .map((e) => e[1].payload.is_localhost)
          .join(',')
      ).to.match(/^(true,true,true|false,false,false)$/);
    });
  });

  describe('SampledAnalytics', function () {
    it('should send the event forward when sampled', function () {
      const analytics = new SampledAnalytics({
        target,
        sampling: () => true,
      });

      expect(analytics.enabled).to.be.true;

      analytics.track(iEvt);
      analytics.track(tEvt);

      expect(events.length).to.equal(2);
    });

    it('should not send the event forward when not sampled', function () {
      const analytics = new SampledAnalytics({
        target,
        sampling: () => false,
      });

      expect(analytics.enabled).to.be.false;

      analytics.track(iEvt);
      analytics.track(tEvt);

      expect(events.length).to.equal(0);
    });
  });
});
