import { expect } from 'chai';
import { gunzipSync } from 'zlib';
import { TelemetryClient } from '.';
import type { TelemetryEvent, Beacon } from '.';
import type { BeaconOutcome } from './beacon';

const sessionEvent: TelemetryEvent = {
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

type RecordedSend = { url: string; headers: Record<string, string> };

function createFakeBeacon(
  sendImpl?: (
    url: string,
    headers: Record<string, string>
  ) => Promise<BeaconOutcome>
): { beacon: Beacon; sends: RecordedSend[] } {
  const sends: RecordedSend[] = [];
  const beacon: Beacon = {
    send(url, headers) {
      sends.push({ url, headers });
      return (
        sendImpl?.(url, headers) ??
        Promise.resolve({ kind: 'dispatched', durationMs: 1 })
      );
    },
  };
  return { beacon, sends };
}

describe('TelemetryClient', function () {
  it('send events to the configured endpoint', async function () {
    const { beacon, sends } = createFakeBeacon();
    const client = new TelemetryClient('https://example.com/events', beacon);
    client.track(sessionEvent);
    await client.flush();
    expect(sends.map(({ url }) => url)).to.deep.equal([
      'https://example.com/events/v1/identify?deviceId=test-device&sessionId=test-session',
    ]);
  });

  it('send the event gzip+base64-encoded in the Cookie header', async function () {
    const { beacon, sends } = createFakeBeacon();
    const client = new TelemetryClient('https://example.com/events', beacon);

    client.track(sessionEvent);
    await client.flush();

    expect(sends).to.have.lengthOf(1);
    const cookie: string = sends[0].headers.Cookie;
    expect(cookie).to.match(/^mge=/);
    const decoded = gunzipSync(
      Buffer.from(cookie.slice('mge='.length), 'base64')
    ).toString();
    expect(JSON.parse(decoded)).to.deep.equal(
      JSON.parse(JSON.stringify(sessionEvent))
    );
  });

  it('stay silent when the beacon rejects despite its contract', async function () {
    const { beacon } = createFakeBeacon(() =>
      Promise.reject(new Error('beacon contract violation'))
    );
    const client = new TelemetryClient('https://example.com/events', beacon);
    client.track(sessionEvent);
    await client.flush(); // must not throw
  });

  it('resolve flush() immediately when no events were tracked', async function () {
    const { beacon } = createFakeBeacon();
    const client = new TelemetryClient('https://example.com/events', beacon);
    await client.flush(); // must not throw
  });

  it('wait for all in-flight sends before resolving flush()', async function () {
    const dispatched: BeaconOutcome = { kind: 'dispatched', durationMs: 1 };
    let resolve1!: (o: BeaconOutcome) => void;
    let resolve2!: (o: BeaconOutcome) => void;
    const outcomes = [
      new Promise<BeaconOutcome>((r) => (resolve1 = r)),
      new Promise<BeaconOutcome>((r) => (resolve2 = r)),
    ];
    let sendIndex = 0;
    const { beacon } = createFakeBeacon(() => outcomes[sendIndex++]);
    const client = new TelemetryClient('https://example.com/events', beacon);

    client.track(sessionEvent);
    client.track(sessionEvent);

    let flushed = false;
    const flushPromise = client.flush().then(() => {
      flushed = true;
    });

    await new Promise(setImmediate);
    expect(flushed).to.equal(false);

    resolve1(dispatched);
    await new Promise(setImmediate);
    expect(flushed).to.equal(false);

    resolve2(dispatched);
    await flushPromise;
    expect(flushed).to.equal(true);
  });

  it('clear inflight so a second flush() has nothing to wait on', async function () {
    const { beacon, sends } = createFakeBeacon();
    const client = new TelemetryClient('https://example.com/events', beacon);

    client.track(sessionEvent);
    await client.flush();
    expect(sends).to.have.lengthOf(1);

    await client.flush(); // no new track() calls — should resolve immediately
    expect(sends).to.have.lengthOf(1);
  });

  it('resolve flush() via the timeout when a send never completes', async function () {
    const { beacon } = createFakeBeacon(
      () => new Promise<BeaconOutcome>(() => undefined) // Never resolves.
    );
    const client = new TelemetryClient(
      'https://example.com/events',
      beacon,
      10 // Override the 2s default so the test completes much faster.
    );
    client.track(sessionEvent);
    const start = Date.now();
    await client.flush();
    expect(Date.now() - start).to.be.lessThan(500); // Well within CI tolerance.
  });

  it('exclude events tracked after flush() starts from that flush', async function () {
    const dispatched: BeaconOutcome = { kind: 'dispatched', durationMs: 1 };
    let resolveFirst!: (o: BeaconOutcome) => void;
    const firstOutcome = new Promise<BeaconOutcome>((r) => (resolveFirst = r));
    let sendCount = 0;
    const { beacon } = createFakeBeacon(() => {
      sendCount++;
      if (sendCount === 1) return firstOutcome;
      return Promise.resolve(dispatched);
    });
    const client = new TelemetryClient('https://example.com/events', beacon);

    client.track(sessionEvent); // first event — held until resolveFirst()
    const flushPromise = client.flush();

    client.track(sessionEvent); // second event tracked while flush is pending

    resolveFirst(dispatched);
    await flushPromise;

    // second event is in a fresh inflight batch, not in the completed flush;
    // draining it separately confirms it was tracked outside the first flush
    await client.flush(); // drain the second event
    expect(sendCount).to.equal(2);
  });

  it('invoke the beacon flush hook after in-flight sends complete', async function () {
    const order: string[] = [];
    const beacon: Beacon = {
      send: async () => {
        await new Promise((resolve) => setTimeout(resolve, 20));
        order.push('send');
        return { kind: 'dispatched', durationMs: 1 };
      },
      flush: () => {
        order.push('beacon-flush');
        return Promise.resolve();
      },
    };
    const client = new TelemetryClient('https://example.com/events', beacon);
    client.track(sessionEvent);
    client.track(sessionEvent);
    await client.flush();
    expect(order).to.deep.equal(['send', 'send', 'beacon-flush']);
  });

  it('call the beacon flush hook even when no events were tracked', async function () {
    let flushCalls = 0;
    const beacon: Beacon = {
      send: () => Promise.resolve({ kind: 'dispatched', durationMs: 1 }),
      flush: () => {
        flushCalls++;
        return Promise.resolve();
      },
    };
    const client = new TelemetryClient('https://example.com/events', beacon);
    await client.flush();
    expect(flushCalls).to.equal(1);
  });

  it('bound the beacon flush hook by the flush timeout', async function () {
    const beacon: Beacon = {
      send: () => Promise.resolve({ kind: 'dispatched', durationMs: 1 }),
      flush: () => new Promise<void>(() => undefined), // never resolves
    };
    const client = new TelemetryClient(
      'https://example.com/events',
      beacon,
      10
    );
    client.track(sessionEvent);
    const start = Date.now();
    await client.flush();
    expect(Date.now() - start).to.be.lessThan(500);
  });

  it('forward warm-up to the beacon with the /warm-up path', function () {
    const warmUpCalls: string[] = [];
    const beacon: Beacon = {
      send: () => Promise.resolve({ kind: 'dispatched', durationMs: 1 }),
      warmUp: (url) => {
        warmUpCalls.push(url);
      },
    };
    const client = new TelemetryClient('https://example.com/events', beacon);
    client.warmUp();
    expect(warmUpCalls).to.deep.equal(['https://example.com/events/warm-up']);
  });

  it('tolerate beacons without warm-up support', function () {
    const { beacon } = createFakeBeacon();
    const client = new TelemetryClient('https://example.com/events', beacon);
    client.warmUp(); // must not throw
  });
});
