import os from 'os';
import path from 'path';
import fs from 'fs';
import { promisify } from 'util';
import { expect } from 'chai';
import type { MongoshAnalytics } from './analytics-helpers';
import { ToggleableAnalytics, ThrottledAnalytics } from './analytics-helpers';

const wait = promisify(setTimeout);

describe('analytics helpers', function () {
  let events: any[];
  let target: MongoshAnalytics;

  beforeEach(function () {
    events = [];
    target = {
      identify(info: any) {
        events.push(['identify', info]);
      },
      track(info: any) {
        events.push(['track', info]);
      },
      flush(cb) {
        cb();
      },
    };
  });

  describe('ToggleableAnalytics', function () {
    it('starts out in paused state and can be toggled on and off', function () {
      const toggleable = new ToggleableAnalytics(target);
      expect(events).to.have.lengthOf(0);

      toggleable.identify({ userId: 'me', traits: { platform: '1234' } });
      toggleable.track({
        userId: 'me',
        event: 'something',
        properties: { mongosh_version: '1.2.3' },
      });
      expect(events).to.have.lengthOf(0);

      toggleable.enable();
      expect(events).to.have.lengthOf(2);

      toggleable.track({
        userId: 'me',
        event: 'something2',
        properties: { mongosh_version: '1.2.3' },
      });
      expect(events).to.have.lengthOf(3);

      toggleable.pause();
      toggleable.track({
        userId: 'me',
        event: 'something3',
        properties: { mongosh_version: '1.2.3' },
      });
      expect(events).to.have.lengthOf(3);

      toggleable.disable();
      expect(events).to.have.lengthOf(3);
      toggleable.enable();

      expect(events).to.deep.equal([
        ['identify', { userId: 'me', traits: { platform: '1234' } }],
        [
          'track',
          {
            userId: 'me',
            event: 'something',
            properties: { mongosh_version: '1.2.3' },
          },
        ],
        [
          'track',
          {
            userId: 'me',
            event: 'something2',
            properties: { mongosh_version: '1.2.3' },
          },
        ],
      ]);
    });

    it('emits an error for invalid messages if telemetry is enabled', function () {
      const toggleable = new ToggleableAnalytics(target);

      toggleable.identify({} as any);
      expect(() => toggleable.enable()).to.throw(
        'Telemetry setup is missing userId or anonymousId'
      );

      toggleable.disable();
      expect(() => toggleable.enable()).to.not.throw();
      expect(() => toggleable.track({} as any)).to.throw(
        'Telemetry setup is missing userId or anonymousId'
      );
    });
  });

  describe('ThrottledAnalytics', function () {
    const metadataPath = os.tmpdir();
    const userId = 'u-' + Date.now();
    const iEvt = { userId, traits: { platform: 'what' } };
    const tEvt = {
      userId,
      event: 'hi',
      properties: { mongosh_version: '1.2.3' },
    };
    const t2Evt = {
      userId,
      event: 'bye',
      properties: { mongosh_version: '1.2.3' },
    };

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
      analytics.identify(iEvt);
      analytics.track(tEvt);
      analytics.track(tEvt);
      analytics.track(tEvt);
      analytics.track(tEvt);
      await promisify(analytics.flush.bind(analytics))();
      expect(events).to.have.lengthOf(5);
    });

    it('should throttle when throttling options are provided', async function () {
      const analytics = new ThrottledAnalytics({
        target,
        throttle: { rate: 5, metadataPath },
      });
      analytics.identify(iEvt);
      for (let i = 0; i < 100; i++) {
        analytics.track(tEvt);
      }
      await promisify(analytics.flush.bind(analytics))();
      expect(events).to.have.lengthOf(5);
    });

    it('should reset counter after a timeout', async function () {
      const analytics = new ThrottledAnalytics({
        target,
        throttle: { rate: 5, metadataPath, timeframe: 200 },
      });
      analytics.identify(iEvt);
      for (let i = 0; i < 100; i++) {
        analytics.track(tEvt);
      }
      // More than 200 to make sure we are outside of the previous frame
      await wait(300);
      for (let i = 0; i < 100; i++) {
        analytics.track(tEvt);
      }
      await promisify(analytics.flush.bind(analytics))();
      expect(events).to.have.lengthOf(10);
    });

    it('should persist throttled state and throttle across sessions', async function () {
      const metadataPath = os.tmpdir();

      // first "session"
      const a1 = new ThrottledAnalytics({
        target,
        throttle: { rate: 5, metadataPath },
      });
      a1.identify(iEvt);
      a1.track(tEvt);
      a1.track(tEvt);
      await promisify(a1.flush.bind(a1))();
      expect(events).to.have.lengthOf(3);

      // second "session"
      const a2 = new ThrottledAnalytics({
        target,
        throttle: { rate: 5, metadataPath },
      });
      a2.identify(iEvt);
      for (let i = 0; i < 100; i++) {
        a2.track(tEvt);
      }
      await promisify(a2.flush.bind(a2))();
      expect(events).to.have.lengthOf(5);
    });

    it('should only allow one analytics instance to send events', async function () {
      // first "session"
      const a1 = new ThrottledAnalytics({
        target,
        throttle: { rate: 5, metadataPath },
      });
      // second "session"
      const a2 = new ThrottledAnalytics({
        target,
        throttle: { rate: 5, metadataPath },
      });

      a1.identify(iEvt);
      a2.identify(iEvt);
      a1.track(tEvt);
      a2.track(t2Evt);
      a1.track(tEvt);
      a2.track(t2Evt);
      a1.track(tEvt);
      a2.track(t2Evt);

      await promisify(a1.flush.bind(a1))();
      await promisify(a2.flush.bind(a2))();

      expect(events).to.have.lengthOf(4);
      expect(
        events
          .filter((e) => e[0] === 'track')
          .map((e) => e[1].event)
          .join(',')
        // can't be fully sure which instance 'won' the lock because fs operations are inherently subject to race conditions
      ).to.match(/^(hi,hi,hi|bye,bye,bye)$/);
    });
  });
});
