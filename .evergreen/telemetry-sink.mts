import https from 'node:https';
import fs from 'node:fs';
import events from 'node:events';
import path from 'node:path';
import util from 'node:util';
import type { AddressInfo } from 'node:net';

async function main(): Promise<void> {
  const {
    positionals: [endpointFile, resultsFile],
  } = util.parseArgs({ allowPositionals: true });
  if (!endpointFile || !resultsFile) {
    console.error(`Minimal telemetry sink for the telemetry-enabled perf CI task.

Serves HTTPS on an ephemeral localhost port using the repo's test
certificates, responds 200 to every request immediately, and appends one
LDJSON line per received telemetry event so the perf task can verify that
the expected events actually arrived. TLS/client errors are recorded too,
so a zero-event run is diagnosable from the output file.

Usage: node telemetry-sink.mts <endpoint-file> <results-file>
 - <endpoint-file>: 'https://localhost:<port>' is written here once
   listening; used both as the readiness signal and as the value for
   MONGOSH_TELEMETRY_ENDPOINT.
 - <results-file>: LDJSON, one line per event or error.
    `);
    process.exit(2);
  }

  // server.bundle.pem contains both the localhost server certificate and its
  // key; Node picks the relevant PEM blocks for each option.
  const bundle = await fs.promises.readFile(
    path.resolve(
      import.meta.dirname,
      '..',
      'packages',
      'testing',
      'certificates',
      'server.bundle.pem'
    )
  );

  // A write stream serialises the LDJSON appends so concurrent requests can't
  // interleave partial lines. Truncate on open: with telemetry fully
  // suppressed (no events, no TLS errors) nothing would ever be written, and
  // the CI step that reads the file should see an empty file, not ENOENT.
  const results = fs.createWriteStream(resultsFile, { flags: 'w' });

  function record(line: unknown): void {
    results.write(JSON.stringify(line) + '\n');
  }

  const server = https.createServer({ key: bundle, cert: bundle });

  server.on('request', (req, res) => {
    try {
      const url = new URL(req.url ?? '', 'https://localhost');
      const match = url.pathname.match(/^\/v1\/(?<event>[^/]+)$/);
      record({
        event: match ? match.groups!.event : url.pathname,
        method: req.method,
        deviceId: url.searchParams.get('deviceId'),
        sessionId: url.searchParams.get('sessionId'),
        ts: new Date().toISOString(),
      });
    } catch (error) {
      record({ error: String(error) });
    }
    res.writeHead(200, { 'Content-Length': '0' });
    res.end();
  });

  // A client that does not trust our CA fails during the TLS handshake and
  // never produces a request; record those failures explicitly.
  server.on('tlsClientError', (error) => {
    record({ error: `tlsClientError: ${String(error)}` });
  });
  server.on('clientError', (error, socket) => {
    record({ error: `clientError: ${String(error)}` });
    socket.destroy();
  });

  server.listen(0, 'localhost');
  await events.once(server, 'listening');

  const { port } = server.address() as AddressInfo;
  const endpoint = `https://localhost:${port}`;
  await fs.promises.writeFile(endpointFile, endpoint);
  console.log(`telemetry sink listening on ${endpoint}`);

  process.on('SIGTERM', () => {
    server.closeAllConnections?.();
    server.close(() => process.exit(0));
    // Don't let lingering keep-alive sockets block shutdown.
    setTimeout(() => process.exit(0), 1000).unref();
  });
}

if (import.meta.main) {
  await main();
}
