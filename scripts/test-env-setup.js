/* istanbul ignore file */

'use strict';

/**
 * Environment defaults applied to every mocha run in this repository.
 * Referenced from each package's .mocharc.json `require` list.
 */

// The `telemetryEndpoint` user config defaults to mongosh's production
// telemetry endpoint, so anything that starts a shell -- in-process or spawned
// -- would send real telemetry from a test run. An empty endpoint means there
// is nowhere to send to, so the analytics sink becomes a no-op. Telemetry
// itself stays enabled, so tests keep exercising the configuration real users
// have; events are still written to the log, they just never reach the network.
//
// Tests that check what is sent use a local server instead, see
// packages/e2e-tests/test/e2e-telemetry.spec.ts.
if (process.env.MONGOSH_TELEMETRY_ENDPOINT === undefined) {
  process.env.MONGOSH_TELEMETRY_ENDPOINT = '';
}
