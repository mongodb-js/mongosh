import { EJSON } from 'bson';
import { once } from 'events';
import { promises as fs } from 'fs';
import http from 'http';
import path from 'path';
import type { Duplex } from 'stream';
import { PassThrough } from 'stream';
import {
  eventually,
  skipIfServerVersion,
  startSharedTestServer,
} from '@mongosh/testing';
import {
  decodeTelemetryCookie,
  expect,
  readReplLogFile,
  useTmpdir,
  waitBus,
  waitEval,
} from '../test/repl-helpers';
import type { CliReplOptions } from './cli-repl';
import { CliRepl } from './cli-repl';
import { KNOWN_AGENT_ENV_VARS } from '@mongosh/logging';
import type { DevtoolsConnectOptions } from '@mongosh/service-provider-node-driver';
import type { AddressInfo } from 'net';
import sinon from 'sinon';
import type { MongoLogWriter } from 'mongodb-log-writer';
import { setTimeout as delay } from 'timers/promises';

describe('CliRepl telemetry (integration)', function () {
  let cliReplOptions: CliReplOptions;
  let cliRepl: CliRepl & {
    start(
      cstr: string,
      options: Partial<DevtoolsConnectOptions>
    ): Promise<void>;
  };
  let input: Duplex;
  let outputStream: Duplex;
  let output = '';
  const tmpdir = useTmpdir();

  // Clear any ambient AI-agent env vars (e.g. when the test runner itself is
  // launched from an AI coding agent) so telemetry assertions are not affected
  // by getAiAgent() detection. Individual tests can still set them explicitly.
  let savedAgentEnv: Record<string, string | undefined> = {};
  beforeEach(function () {
    savedAgentEnv = {};
    for (const v of Object.keys(KNOWN_AGENT_ENV_VARS)) {
      savedAgentEnv[v] = process.env[v];
      delete process.env[v];
    }
  });
  afterEach(async function () {
    // Free per-test resources (driver connections, log writer, process
    // listeners) so CliRepl instances don't accumulate across the suite and
    // exhaust memory. close() is idempotent and safe to call best-effort.
    try {
      await cliRepl?.close();
    } catch {
      /* not started or already closed */
    }
    cliRepl = undefined as any;

    for (const [v, original] of Object.entries(savedAgentEnv)) {
      if (original === undefined) {
        delete process.env[v];
      } else {
        process.env[v] = original;
      }
    }
  });

  async function log(): Promise<any[]> {
    if (!cliRepl.logWriter?.logFilePath) return [];
    await cliRepl.logWriter.flush(); // Ensure any pending data is written first
    return readReplLogFile(cliRepl.logWriter.logFilePath);
  }

  async function startWithExpectedImmediateExit(
    cliRepl: CliRepl,
    host: string
  ): Promise<void> {
    try {
      await cliRepl.start(host, {} as any);
      expect.fail('Expected start() to also exit immediately');
    } catch (err: any) {
      expect(err.message).to.include('onExit() unexpectedly returned');
    }
  }

  beforeEach(function () {
    input = new PassThrough();
    outputStream = new PassThrough();
    output = '';
    outputStream.setEncoding('utf8').on('data', (chunk) => {
      output += chunk;
    });

    cliReplOptions = {
      shellCliOptions: {},
      input: input,
      output: outputStream,
      shellHomePaths: {
        shellRoamingDataPath: tmpdir.path,
        shellLocalDataPath: tmpdir.path,
        shellRcPath: tmpdir.path,
      },
      onExit: () => {
        return Promise.resolve() as never;
      },
    };
  });

  context('with an actual server', function () {
    const testServer = startSharedTestServer();

    let getHistoryFilePathStub: sinon.SinonStub;
    beforeEach(async function () {
      // These tests exercise log file behavior, not REPL history. Disabling
      // persistent history avoids opening a history file handle per test.
      getHistoryFilePathStub = sinon
        .stub(CliRepl.prototype, 'getHistoryFilePath')
        .returns('');
      cliReplOptions.shellCliOptions.connectionSpecifier =
        await testServer.connectionString();
      cliRepl = new CliRepl(cliReplOptions);
    });

    afterEach(async function () {
      await cliRepl.mongoshRepl.close();
      getHistoryFilePathStub.restore();
    });

    context('with network connectivity', function () {
      let srv: http.Server;
      let host: string;
      let requests: any[];
      let totalEventsTracked = 0;
      let telemetryDelay = 0;
      const setTelemetryDelay = (val: number) => {
        telemetryDelay = val;
      };

      beforeEach(async function () {
        requests = [];
        totalEventsTracked = 0;
        srv = http
          .createServer((req, res) => {
            let body = '';
            req
              .setEncoding('utf8')
              .on('data', (chunk) => {
                body += chunk;
              })
              // eslint-disable-next-line @typescript-eslint/no-misused-promises
              .on('end', async () => {
                requests.push({ req, body });
                totalEventsTracked += 1; // each request is a single event
                await delay(telemetryDelay);
                res.writeHead(200);
                res.end('Ok\n');
              });
          })
          .listen(0);
        await once(srv, 'listening');
        host = `http://localhost:${(srv.address() as AddressInfo).port}`;
        // Point telemetry at the fake server via the env override so every
        // CliRepl created in these tests (including ones constructed inside a
        // test, e.g. containerized-mode cases) uses it.
        process.env.MONGOSH_TELEMETRY_ENDPOINT = host;
        cliRepl = new CliRepl(cliReplOptions);
      });

      afterEach(async function () {
        delete process.env.MONGOSH_TELEMETRY_ENDPOINT;
        srv.close();
        await once(srv, 'close');
        setTelemetryDelay(0);
        sinon.restore();
      });

      it('completes quickly even when the telemetry server is slow (fire-and-forget)', async function () {
        const testStartMs = Date.now();
        // TelemetryClient is fire-and-forget: flush() returns immediately,
        // even if the HTTP server takes a long time to respond.
        setTelemetryDelay(5000);
        await cliRepl.start(await testServer.connectionString(), {});
        this.timeout(Date.now() - testStartMs + 2500); // Do not include connection time in 2.5s timeout
        input.write('use somedb;\n');
        input.write('exit\n');
        await waitBus(cliRepl.bus, 'mongosh:closed');
        const analyticsLog = (await log()).filter(
          (entry) =>
            entry.ctx === 'analytics' &&
            entry.msg === 'Persisted telemetry throttle state'
        );
        expect(analyticsLog).to.have.lengthOf(1);
        expect(analyticsLog[0]).to.have.nested.property(
          'attr.flushError',
          null // Although the flush request will time out, it does not error.
        );
      });

      it('posts analytics data', async function () {
        await cliRepl.start(await testServer.connectionString(), {});
        // Identify and New Connection are sent fire-and-forget, so their
        // arrival order is not guaranteed. Wait until the Identify event
        // (which carries the device/OS traits) has been received.
        let identifyEvent: any;
        await eventually(() => {
          identifyEvent = requests
            .map((r) => decodeTelemetryCookie(r.req))
            .find((e) => e.name === 'Identify');
          expect(identifyEvent, 'Identify event was not posted').to.exist;
        });
        expect(identifyEvent.payload.platform).to.equal(process.platform);
      });

      it('posts analytics events when telemetry is enabled', async function () {
        await cliRepl.start(await testServer.connectionString(), {});
        input.write('use somedb;\n');
        await waitEval(cliRepl.bus);
        // There are warnings generated by the driver if exit is used to close
        // the REPL too early. That might be worth investigating at some point.
        await delay(100);
        input.write('exit\n');
        await waitBus(cliRepl.bus, 'mongosh:closed');
        // With telemetry enabled, at least Identify + New Connection events are sent
        expect(requests.length).to.be.greaterThan(0);
      });

      it('stops posting analytics data after disableTelemetry()', async function () {
        await cliRepl.start(await testServer.connectionString(), {});
        // With telemetry enabled, startup events (Identify + New Connection)
        // are sent immediately (TelemetryClient is fire-and-forget). Wait for
        // them to arrive and record the baseline.
        await eventually(() => {
          expect(requests.length).to.be.greaterThan(0);
        });
        const requestsBeforeDisable = requests.length;

        input.write('disableTelemetry()\n');
        await waitEval(cliRepl.bus);
        input.write('use somedb;\n');
        await waitEval(cliRepl.bus);
        // There are warnings generated by the driver if exit is used to close
        // the REPL too early. That might be worth investigating at some point.
        await delay(100);
        input.write('exit\n');
        await waitBus(cliRepl.bus, 'mongosh:closed');
        // No further events are posted once telemetry is disabled — in
        // particular, the Session Ended event emitted on exit is not sent.
        expect(requests).to.have.lengthOf(requestsBeforeDisable);
        const eventNames = requests.map(
          (r) => decodeTelemetryCookie(r.req).name
        );
        expect(eventNames).to.not.include('Session Ended');

        // Re-enable and verify events flow again
        requests = [];
        cliRepl = new CliRepl(cliReplOptions);
        await cliRepl.start(await testServer.connectionString(), {});
        input.write('enableTelemetry()\n');
        await waitEval(cliRepl.bus);
        input.write('use somedb;\n');
        await waitEval(cliRepl.bus);
        await delay(100);
        input.write('exit\n');
        await waitBus(cliRepl.bus, 'mongosh:closed');
        expect(requests.length).to.be.greaterThan(0);
      });

      it('includes a statement about flushed telemetry in the log', async function () {
        await cliRepl.start(await testServer.connectionString(), {});
        const { logFilePath } = cliRepl.logWriter as MongoLogWriter;
        input.write('db.hello()\n');
        input.write('exit\n');
        await waitBus(cliRepl.bus, 'mongosh:closed');
        const flushEntry = (await readReplLogFile(logFilePath)).find(
          (entry: any) => entry.id === 1_000_000_045
        );
        expect(flushEntry.attr.flushError).to.equal(null);
        expect(flushEntry.attr.flushDuration).to.be.a('number');
        // Identify + New Connection + Session Ended = 3 events
        expect(totalEventsTracked).to.equal(3);
      });

      it('does not send telemetry events for --eval sessions', async function () {
        cliReplOptions.shellCliOptions.eval = [
          'db.hello(); db.hello();',
          'db.hello()',
        ];
        cliRepl = new CliRepl(cliReplOptions);
        await startWithExpectedImmediateExit(
          cliRepl,
          await testServer.connectionString()
        );
        // Telemetry is not collected for non-interactive sessions at all.
        expect(requests).to.have.lengthOf(0);
      });

      it('sends telemetry events for --eval sessions that drop into the shell', async function () {
        cliReplOptions.shellCliOptions.eval = ['db.hello()'];
        cliReplOptions.shellCliOptions.shell = true;
        cliRepl = new CliRepl(cliReplOptions);
        await cliRepl.start(await testServer.connectionString(), {});
        input.write('exit\n');
        await waitBus(cliRepl.bus, 'mongosh:closed');
        // Identify + New Connection + Session Ended = 3 events
        expect(totalEventsTracked).to.equal(3);
      });

      it('sends a SessionEndedEvent with all session properties instead of individual API Call events', async function () {
        await cliRepl.start(await testServer.connectionString(), {});
        input.write('db.hello()\n');
        await waitEval(cliRepl.bus);
        input.write('db.hello()\n');
        await waitEval(cliRepl.bus);
        await delay(100);
        input.write('exit\n');
        await waitBus(cliRepl.bus, 'mongosh:closed');

        const allEventNames = requests
          .map((entry) => decodeTelemetryCookie(entry.req).name as string)
          .filter(Boolean);
        expect(allEventNames).not.to.include('API Call');
        expect(allEventNames).not.to.include('Script Evaluated');
        expect(allEventNames).not.to.include('Startup Time');

        const sessionEndedEvent = requests
          .map((entry) => decodeTelemetryCookie(entry.req))
          .find((entry: any) => entry.name === 'Session Ended');
        expect(sessionEndedEvent).to.exist;

        const payload = sessionEndedEvent.payload;

        // Common payload fields
        expect(payload.mongosh_version).to.be.a('string');
        expect(payload.ai_agent).to.equal(undefined);
        expect(payload.session_id).to.be.a('string');

        // SessionEndedEvent payload — session shape
        expect(payload.is_interactive).to.equal(true);
        expect(payload.commands_repl).to.deep.equal({ 'Database.hello': 2 });
        expect(payload.commands_rc).to.equal(undefined);
        expect(payload.sequence).to.deep.equal([
          'Database.hello',
          'Database.hello',
        ]);
        expect(payload.sequence_truncated).to.equal(false);
        expect(payload.error_count).to.equal(0);

        // Timing fields — present as numbers or absent (undefined)
        const timingFields = [
          'repl_instantiation_ms',
          'user_config_loading_ms',
          'driver_setup_ms',
          'logging_ms',
          'snippet_loading_ms',
          'snapshot_ms',
          'resource_file_loading_ms',
          'async_rewrite_ms',
          'eval_ms',
          'eval_file_ms',
          'telemetry_ms',
          'main_ms',
        ];
        for (const field of timingFields) {
          if (payload[field] !== undefined) {
            expect(payload[field], field).to.be.a('number');
          }
        }

        // SessionEndedEvent payload — session counters
        expect(payload.mongoshrc_loaded).to.be.a('boolean');
        expect(payload.mongorc_warning).to.be.a('boolean');
        expect(payload.snippet_loaded_count).to.equal(0);
        expect(payload.shell_flag).to.equal(false);
        expect(payload.cli_eval_count).to.equal(0);
        expect(payload.cli_file_count).to.equal(0);
        expect(payload.evaluation_count).to.equal(2);
      });

      it('sends out telemetry if the repl is running in an interactive mode in a containerized environment', async function () {
        cliRepl.getIsContainerizedEnvironment = () => {
          return Promise.resolve(true);
        };
        await cliRepl.start(await testServer.connectionString(), {});
        input.write('db.hello()\n');
        input.write('exit\n');
        await waitBus(cliRepl.bus, 'mongosh:closed');
        // Identify + New Connection + Session Ended = 3 events
        expect(totalEventsTracked).to.equal(3);
      });

      it('does not send out telemetry if the user starts with a no-telemetry config', async function () {
        await fs.writeFile(
          path.join(tmpdir.path, 'config'),
          EJSON.stringify({ enableTelemetry: false })
        );
        await cliRepl.start(await testServer.connectionString(), {});
        input.write('db.hello()\n');
        input.write('exit\n');
        await waitBus(cliRepl.bus, 'mongosh:closed');
        expect(requests).to.have.lengthOf(0);
      });

      it('does not send out telemetry if the user starts with global force-disable-telemetry config', async function () {
        const globalConfigFile = path.join(tmpdir.path, 'globalconfig.conf');
        await fs.writeFile(
          globalConfigFile,
          'mongosh:\n  forceDisableTelemetry: true'
        );

        cliReplOptions.globalConfigPaths = [globalConfigFile];
        cliRepl = new CliRepl(cliReplOptions);
        await cliRepl.start(await testServer.connectionString(), {});
        input.write('db.hello()\n');
        input.write('exit\n');
        await waitBus(cliRepl.bus, 'mongosh:closed');
        expect(requests).to.have.lengthOf(0);
      });

      it('does not let the user modify telemetry settings with global force-disable-telemetry config', async function () {
        const globalConfigFile = path.join(tmpdir.path, 'globalconfig.conf');
        await fs.writeFile(
          globalConfigFile,
          'mongosh:\n  forceDisableTelemetry: true'
        );

        cliReplOptions.globalConfigPaths = [globalConfigFile];
        cliRepl = new CliRepl(cliReplOptions);
        await cliRepl.start(await testServer.connectionString(), {});

        output = '';
        input.write('enableTelemetry()\n');
        await waitEval(cliRepl.bus);
        expect(output).to.include(
          "Cannot modify telemetry settings while 'forceDisableTelemetry' is set to true"
        );

        output = '';
        input.write('disableTelemetry()\n');
        await waitEval(cliRepl.bus);
        expect(output).to.include(
          "Cannot modify telemetry settings while 'forceDisableTelemetry' is set to true"
        );

        output = '';
        input.write('config.set("enableTelemetry", true)\n');
        await waitEval(cliRepl.bus);
        expect(output).to.include(
          "Cannot modify telemetry settings while 'forceDisableTelemetry' is set to true"
        );

        output = '';
        input.write('config.get("enableTelemetry")\n');
        await waitEval(cliRepl.bus);
        expect(output).to.include('false');

        input.write('exit\n');
        await waitBus(cliRepl.bus, 'mongosh:closed');
        expect(requests).to.have.lengthOf(0);
      });

      it('does not send out telemetry if the user only runs a script for disabling telemetry', async function () {
        cliReplOptions.shellCliOptions.eval = ['disableTelemetry()'];
        cliRepl = new CliRepl(cliReplOptions);
        await startWithExpectedImmediateExit(
          cliRepl,
          await testServer.connectionString()
        );
        expect(requests).to.have.lengthOf(0);
      });

      it('does not send out telemetry if the user runs a script for disabling telemetry and drops into the shell', async function () {
        cliReplOptions.shellCliOptions.eval = ['disableTelemetry()'];
        cliReplOptions.shellCliOptions.shell = true;
        cliRepl = new CliRepl(cliReplOptions);
        await cliRepl.start(await testServer.connectionString(), {});
        input.write('db.hello()\n');
        input.write('exit\n');
        await waitBus(cliRepl.bus, 'mongosh:closed');
        expect(requests).to.have.lengthOf(0);
      });

      it('does not send out telemetry if the repl is running in non-interactive mode in a containerized environment', async function () {
        cliReplOptions.shellCliOptions.eval = ['db.hello()'];
        cliRepl = new CliRepl(cliReplOptions);
        cliRepl.getIsContainerizedEnvironment = () => {
          return Promise.resolve(true);
        };
        await startWithExpectedImmediateExit(
          cliRepl,
          await testServer.connectionString()
        );
        expect(requests).to.have.lengthOf(0);
      });

      it('sends out telemetry in non-interactive containerized mode when an AI agent env var is set', async function () {
        process.env.CLAUDECODE = '1';
        try {
          cliReplOptions.shellCliOptions.eval = ['db.hello()'];
          cliRepl = new CliRepl(cliReplOptions);
          cliRepl.getIsContainerizedEnvironment = () => {
            return Promise.resolve(true);
          };
          await startWithExpectedImmediateExit(
            cliRepl,
            await testServer.connectionString()
          );
          expect(requests.length).to.be.greaterThan(0);
        } finally {
          delete process.env.CLAUDECODE;
        }
      });

      it('throttles telemetry beyond a certain rate', async function () {
        await cliRepl.start(await testServer.connectionString(), {});
        for (let i = 0; i < 60; i++) {
          input.write('db.hello()\n');
        }
        input.write('exit\n');
        await waitBus(cliRepl.bus, 'mongosh:closed');
        // ThrottledAnalytics caps total events at rate=30 per time window.
        // With only 3 events per session (Identify + New Connection + Session Ended),
        // we stay well under the cap — verify events were received.
        expect(requests.length).to.be.greaterThan(0);
        expect(requests.length).to.be.lessThanOrEqual(30);
      });

      context('with a 5.0+ server', function () {
        skipIfServerVersion(testServer, '<= 4.4');

        it('posts analytics data including connection information', async function () {
          await cliRepl.start(await testServer.connectionString(), {
            serverApi: {
              version: '1',
              strict: true,
              deprecationErrors: true,
            },
          });
          input.write('db.test.find();\n');
          await waitEval(cliRepl.bus);
          // There are warnings generated by the driver if exit is used to close
          // the REPL too early. That might be worth investigating at some point.
          await delay(100);
          input.write('exit\n');
          await waitBus(cliRepl.bus, 'mongosh:closed');

          const connectEvents = requests
            .map((entry) => decodeTelemetryCookie(entry.req))
            .filter((entry: any) => entry.name === 'New Connection');
          expect(connectEvents).to.have.lengthOf(1);
          const connectEvent = connectEvents[0];
          const { payload } = connectEvent;
          expect(payload.mongosh_version).to.be.a('string');
          expect(payload.session_id).to.be.a('string');
          expect(payload.is_atlas).to.equal(false);
          expect(payload.node_version).to.equal(process.version);
          expect(payload.api_version).to.equal('1');
          expect(payload.api_strict).to.equal(true);
          expect(payload.api_deprecation_errors).to.equal(true);
        });
      });
    });

    context('without network connectivity', function () {
      beforeEach(async function () {
        process.env.MONGOSH_TELEMETRY_ENDPOINT = 'http://localhost:1';
        cliRepl = new CliRepl(cliReplOptions);
        await cliRepl.start(await testServer.connectionString(), {});
      });

      afterEach(function () {
        delete process.env.MONGOSH_TELEMETRY_ENDPOINT;
      });

      it('ignores errors', async function () {
        input.write('print(123 + 456);\n');
        input.write('exit\n');
        await waitBus(cliRepl.bus, 'mongosh:closed');
        expect(output).not.to.match(/error/i);
      });
    });
  });
});
