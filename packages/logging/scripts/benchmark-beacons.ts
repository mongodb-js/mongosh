/* eslint-disable no-console */
/**
 * Side-by-side comparison of Beacon implementations (MONGOSH-3454).
 *
 * Section 1 — flush latency: for fast / slow / blackhole local servers,
 * measures the wall-clock time of `track() x N + flush()` through
 * TelemetryClient for a response-waiting fetch baseline (defined locally in
 * this script — the shipped transport is fire-and-forget only) vs
 * FireAndForgetBeacon (cold and warmed).
 *
 * Section 2 — TLS session resumption: measures time-to-dispatched of the
 * first send of a process, cold (full handshake) vs resumed from the
 * persisted session ticket. Local numbers are small; the saved round-trips
 * scale with real network RTT.
 *
 * Run: npm run benchmark-beacons              (from packages/logging)
 *      npm run benchmark-beacons -- <url>     (extra: real endpoint timings)
 */
import http from 'http';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { once } from 'events';
import { createServer as createHttpsServer } from 'https';
import type { AddressInfo } from 'net';
import { TelemetryClient } from '../src/telemetry-client';
import type { Beacon, BeaconOutcome } from '../src/beacon';
import { REQUEST_TIMEOUT_MS } from '../src/beacon';
import { FireAndForgetBeacon } from '../src/fire-and-forget-beacon';
import type { TelemetryEvent } from '../src/telemetry-events';

const EVENTS_PER_RUN = 10;
const FLUSH_TIMEOUT_MS = 2_000;

/**
 * Response-waiting baseline for comparison. This used to ship as
 * `FetchBeacon` before the fire-and-forget transport became the only one;
 * it lives on here purely so the benchmark can keep demonstrating the
 * difference.
 */
class FetchBaselineBeacon implements Beacon {
  async send(
    url: string,
    headers: Record<string, string>
  ): Promise<BeaconOutcome> {
    const start = performance.now();
    try {
      const response = await globalThis.fetch(url, {
        method: 'HEAD',
        headers,
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      return {
        kind: 'response',
        status: response.status,
        durationMs: performance.now() - start,
      };
    } catch (error) {
      return {
        kind: 'error',
        error: error as Error,
        durationMs: performance.now() - start,
      };
    }
  }
}

const event = {
  name: 'API Call',
  payload: {
    session_id: 'benchmark-session',
    device_id: 'benchmark-device',
    class: 'Database',
    method: 'runCommand',
    count: 1,
  },
} as unknown as TelemetryEvent;

type Scenario = { name: string; responseDelayMs: number | 'never' };
const scenarios: Scenario[] = [
  { name: 'fast server (0ms)', responseDelayMs: 0 },
  { name: 'slow server (1000ms)', responseDelayMs: 1_000 },
  { name: 'blackhole (never responds)', responseDelayMs: 'never' },
];

async function startServer(scenario: Scenario): Promise<http.Server> {
  const srv = http.createServer((req, res) => {
    if (scenario.responseDelayMs === 'never') return;
    setTimeout(() => {
      res.writeHead(200);
      res.end();
    }, scenario.responseDelayMs).unref();
  });
  srv.listen(0);
  await once(srv, 'listening');
  return srv;
}

function endpointOf(srv: http.Server, protocol = 'http'): string {
  return `${protocol}://localhost:${(srv.address() as AddressInfo).port}`;
}

async function timeFlush(
  endpoint: string,
  beacon: Beacon,
  warm: boolean
): Promise<string> {
  const client = new TelemetryClient(endpoint, beacon, FLUSH_TIMEOUT_MS);
  if (warm) {
    client.warmUp();
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  const start = performance.now();
  for (let i = 0; i < EVENTS_PER_RUN; i++) {
    client.track(event);
  }
  await client.flush();
  return `${Math.round(performance.now() - start)}ms`;
}

async function benchmarkFlushLatency(): Promise<void> {
  const rows: Record<string, Record<string, string>> = {};
  for (const scenario of scenarios) {
    const row: Record<string, string> = {};

    let srv = await startServer(scenario);
    row['fetch baseline'] = await timeFlush(
      endpointOf(srv),
      new FetchBaselineBeacon(),
      false
    );
    srv.closeAllConnections();
    srv.close();

    srv = await startServer(scenario);
    const cold = new FireAndForgetBeacon();
    row['FireAndForget (cold)'] = await timeFlush(endpointOf(srv), cold, false);
    cold.close();
    srv.closeAllConnections();
    srv.close();

    srv = await startServer(scenario);
    const warm = new FireAndForgetBeacon();
    row['FireAndForget (warm)'] = await timeFlush(endpointOf(srv), warm, true);
    warm.close();
    srv.closeAllConnections();
    srv.close();

    rows[scenario.name] = row;
  }
  console.log(`\n=== flush latency: ${EVENTS_PER_RUN} events + flush() ===`);
  console.table(rows);
}

async function timeFirstDispatch(
  url: string,
  storePath: string
): Promise<{ durationMs: string; beacon: FireAndForgetBeacon }> {
  const beacon = new FireAndForgetBeacon({
    tlsOptions: { rejectUnauthorized: false },
    sessionStorePath: storePath,
  });
  const start = performance.now();
  const outcome = await beacon.send(url, {});
  const duration = performance.now() - start;
  if (outcome.kind !== 'dispatched') {
    throw new Error(`expected dispatched, got ${outcome.kind}`);
  }
  return { durationMs: `${duration.toFixed(2)}ms`, beacon };
}

async function benchmarkTlsResumption(): Promise<void> {
  const certDir = path.resolve(
    __dirname,
    '..',
    '..',
    'testing',
    'certificates',
    'partial-trust-chain'
  );
  const srv = createHttpsServer(
    {
      key: fs.readFileSync(path.join(certDir, 'key.pem')),
      cert: fs.readFileSync(path.join(certDir, 'cert.pem')),
    },
    (req, res) => {
      res.writeHead(200);
      res.end();
    }
  ).listen(0);
  await once(srv, 'listening');
  const url = `${endpointOf(
    srv as unknown as http.Server,
    'https'
  )}/v1/benchmark`;

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'beacon-bench-'));
  const storePath = path.join(dir, 'sessions.json');

  const cold = await timeFirstDispatch(url, storePath);
  // The shutdown hook waits for the ticket + store write, exactly as a real
  // mongosh exit would via TelemetryClient.flush().
  await cold.beacon.flush();
  cold.beacon.close();

  const resumed = await timeFirstDispatch(url, storePath);
  resumed.beacon.close();

  srv.closeAllConnections();
  srv.close();
  fs.rmSync(dir, { recursive: true, force: true });

  console.log(
    '\n=== first dispatch of a process: TLS session resumption (loopback; savings scale with real RTT) ==='
  );
  console.table({
    'full handshake (cold)': { 'time to dispatched': cold.durationMs },
    'resumed from persisted ticket': {
      'time to dispatched': resumed.durationMs,
    },
  });
}

async function benchmarkRealEndpoint(endpoint: string): Promise<void> {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'beacon-bench-real-'));
  const storePath = path.join(dir, 'sessions.json');

  const beacon = new FireAndForgetBeacon({ sessionStorePath: storePath });
  const start = performance.now();
  const outcome = await beacon.send(`${endpoint}/v1/benchmark`, {});
  const coldMs = (performance.now() - start).toFixed(2);
  beacon.close();

  const resumedBeacon = new FireAndForgetBeacon({
    sessionStorePath: storePath,
  });
  const resumedStart = performance.now();
  const resumedOutcome = await resumedBeacon.send(
    `${endpoint}/v1/benchmark`,
    {}
  );
  const resumedMs = (performance.now() - resumedStart).toFixed(2);
  resumedBeacon.close();
  fs.rmSync(dir, { recursive: true, force: true });

  console.log(`\n=== real endpoint: ${endpoint} ===`);
  console.table({
    'cold first dispatch': { outcome: outcome.kind, time: `${coldMs}ms` },
    'resumed first dispatch': {
      outcome: resumedOutcome.kind,
      time: `${resumedMs}ms`,
    },
  });
}

async function main(): Promise<void> {
  await benchmarkFlushLatency();
  await benchmarkTlsResumption();
  const realEndpoint = process.argv[2];
  if (realEndpoint) {
    await benchmarkRealEndpoint(realEndpoint);
  }
  // Pending baseline fetches against the blackhole are still waiting on
  // their AbortSignal timeouts; don't let them delay benchmark exit.
  process.exit(0);
}

void main();
