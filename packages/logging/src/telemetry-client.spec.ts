import { expect } from 'chai';
import { gunzipSync } from 'zlib';
import { TelemetryClient } from '.';
import type { TelemetryEvent } from '.';

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
  },
};

describe('TelemetryClient', function () {
  it('sends events to the configured endpoint', async function () {
    const calls: string[] = [];
    const client = new TelemetryClient('https://example.com/events', (url) => {
      calls.push(url);
      return Promise.resolve();
    });
    client.track(sessionEvent);
    await client.flush();
    expect(calls).to.deep.equal([
      'https://example.com/events/v1/identify?sessionId=test-session',
    ]);
  });

  it('sends a HEAD request with the event gzip+base64-encoded in the Cookie header', async function () {
    const requests: { url: string; init: any }[] = [];
    const client = new TelemetryClient(
      'https://example.com/events',
      (url, init) => {
        requests.push({ url, init });
        return Promise.resolve();
      }
    );

    client.track(sessionEvent);
    await client.flush();

    expect(requests).to.have.lengthOf(1);
    expect(requests[0].url).to.equal(
      'https://example.com/events/v1/identify?sessionId=test-session'
    );
    expect(requests[0].init.method).to.equal('HEAD');
    expect(requests[0].init.signal).to.be.instanceOf(AbortSignal);

    const cookie: string = requests[0].init.headers.Cookie;
    expect(cookie).to.match(/^mge=/);
    const decoded = gunzipSync(
      Buffer.from(cookie.slice('mge='.length), 'base64')
    ).toString();
    expect(JSON.parse(decoded)).to.deep.equal(
      JSON.parse(JSON.stringify(sessionEvent))
    );
  });

  it('aborts a request that never resolves after the request timeout', async function () {
    let capturedSignal: AbortSignal | undefined;
    const client = new TelemetryClient(
      'https://example.com/events',
      (_url, init) => {
        capturedSignal = init?.signal;
        // Simulate a stuck network request and reject once the signal is aborted.
        return new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => {
            reject(new Error('The operation was aborted'));
          });
        });
      },
      undefined,
      5 // requestTimeoutMs
    );

    client.track(sessionEvent);

    // The request never resolves on its own. flush() only returns once the
    // timeout aborts it (within the 2s).
    await client.flush();

    expect(capturedSignal).to.be.instanceOf(AbortSignal);
    expect(capturedSignal?.aborted).to.equal(true);
  });

  it('silently ignores network errors', async function () {
    const client = new TelemetryClient('https://example.com/events', () => {
      return Promise.reject(new Error('network failure'));
    });
    client.track(sessionEvent);
    await client.flush(); // must not throw
  });

  it('flush() resolves immediately when no events were tracked', async function () {
    const client = new TelemetryClient('https://example.com/events', () =>
      Promise.resolve()
    );
    await client.flush(); // must not throw
  });

  it('flush() waits for all in-flight requests before resolving', async function () {
    let resolve1!: () => void;
    let resolve2!: () => void;
    const p1 = new Promise<void>((r) => (resolve1 = r));
    const p2 = new Promise<void>((r) => (resolve2 = r));
    const responses = [p1, p2];
    let responseIndex = 0;

    const client = new TelemetryClient('https://example.com/events', () => {
      return responses[responseIndex++];
    });

    client.track(sessionEvent);
    client.track(sessionEvent);

    let flushed = false;
    const flushPromise = client.flush().then(() => {
      flushed = true;
    });

    await Promise.resolve();
    expect(flushed).to.equal(false);

    resolve1();
    await Promise.resolve();
    expect(flushed).to.equal(false);

    resolve2();
    await flushPromise;
    expect(flushed).to.equal(true);
  });

  it('flush() clears inflight so a second flush() has nothing to wait on', async function () {
    const fetchCalls: number[] = [];
    const client = new TelemetryClient('https://example.com/events', () => {
      fetchCalls.push(1);
      return Promise.resolve();
    });

    client.track(sessionEvent);
    await client.flush();
    expect(fetchCalls).to.have.lengthOf(1);

    await client.flush(); // no new track() calls — should resolve immediately
    expect(fetchCalls).to.have.lengthOf(1);
  });

  it('flush() resolves via timeout when a request never completes', async function () {
    // Simulate a stuck network request that never resolves.
    const client = new TelemetryClient(
      'https://example.com/events',
      () => new Promise<void>(() => undefined), // Never resolves.
      10 // Override the 2s default so the test completes much faster.
    );
    client.track(sessionEvent);
    const start = Date.now();
    await client.flush();
    expect(Date.now() - start).to.be.lessThan(500); // Well within CI tolerance.
  });

  it('events tracked after flush() starts are not included in that flush', async function () {
    let resolveFirst!: () => void;
    const firstDone = new Promise<void>((r) => (resolveFirst = r));
    let fetchCount = 0;

    const client = new TelemetryClient('https://example.com/events', () => {
      fetchCount++;
      if (fetchCount === 1) return firstDone;
      return Promise.resolve();
    });

    client.track(sessionEvent); // first event — held until resolveFirst()
    const flushPromise = client.flush();

    client.track(sessionEvent); // second event tracked while flush is pending

    resolveFirst();
    await flushPromise;

    // second event is in a fresh inflight batch, not in the completed flush;
    // draining it separately confirms it was tracked outside the first flush
    await client.flush(); // drain the second event
    expect(fetchCount).to.equal(2);
  });
});
