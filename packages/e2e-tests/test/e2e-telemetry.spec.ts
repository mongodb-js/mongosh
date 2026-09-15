import { expect } from 'chai';
import { promises as fs } from 'fs';
import path from 'path';
import { EJSON } from 'bson';
import { createServer as createHTTPServer } from 'http';
import type { Server as HTTPServer, IncomingMessage } from 'http';
import type { AddressInfo } from 'net';
import { once } from 'events';
import { gunzipSync } from 'zlib';
import { eventually, isNightly } from '@mongosh/testing';
import type { TestShell } from './test-shell';
import { startTestShell } from './test-shell-context';
import { setTemporaryHomeDirectory } from './repl-helpers';

type ReceivedEvent = {
  path: string;
  query: URLSearchParams;
  event: { name: string; payload: Record<string, unknown> };
};

/**
 * TelemetryClient sends the event gzip+base64-encoded in the `Cookie` header
 * (as `mge=<base64>`), not in a request body.
 */
function decodeTelemetryCookie(req: IncomingMessage): ReceivedEvent['event'] {
  const cookie = req.headers.cookie ?? '';
  const base64 = cookie.replace(/^mge=/, '');
  return JSON.parse(gunzipSync(Buffer.from(base64, 'base64')).toString());
}

/**
 * Home for the e2e tests that care about telemetry. Every mocha run gets an
 * empty MONGOSH_TELEMETRY_ENDPOINT (see scripts/test-env-setup.js) so that no
 * test can talk to the production endpoint that `telemetryEndpoint` defaults
 * to. Telemetry stays enabled throughout; there is simply nowhere to send. The
 * tests below that need events to actually arrive somewhere point the endpoint
 * at their own server.
 */
describe('e2e telemetry', function () {
  let homedir: string;
  let configPath: string;
  let env: Record<string, string>;
  let readConfig: () => Promise<any>;

  beforeEach(async function () {
    const homeInfo = setTemporaryHomeDirectory();
    homedir = homeInfo.homedir;
    await fs.mkdir(homedir, { recursive: true });

    configPath =
      process.platform === 'win32'
        ? path.resolve(homedir, 'roaming', 'mongodb', 'mongosh', 'config')
        : path.resolve(homedir, '.mongodb', 'mongosh', 'config');
    readConfig = async () => EJSON.parse(await fs.readFile(configPath, 'utf8'));

    env = { ...homeInfo.env };
  });

  afterEach(async function () {
    try {
      await fs.rm(homedir, { recursive: true, force: true });
    } catch (err: any) {
      // On Windows in CI, this can fail with EPERM for some reason.
      console.error('Could not remove fake home directory:', err);
    }
  });

  /**
   * The in-process equivalents of these assertions live in
   * packages/cli-repl/src/cli-repl-telemetry.spec.ts. These exist to cover what
   * those cannot: that the spawned shell — with its own proxy-aware fetch and
   * process lifecycle, including flush-on-exit — actually puts events on the
   * wire in the expected shape.
   */
  describe('sending events', function () {
    let httpServer: HTTPServer;
    let received: ReceivedEvent[];
    let endpoint: string;

    beforeEach(async function () {
      received = [];
      httpServer = createHTTPServer((req, res) => {
        const url = new URL(req.url ?? '/', 'http://localhost');
        received.push({
          path: url.pathname,
          query: url.searchParams,
          event: decodeTelemetryCookie(req),
        });
        res.writeHead(200);
        res.end();
      });
      httpServer.listen(0);
      await once(httpServer, 'listening');
      endpoint = `http://127.0.0.1:${
        (httpServer.address() as AddressInfo).port
      }`;
    });

    afterEach(async function () {
      httpServer.close();
      await once(httpServer, 'close');
    });

    it('sends events from a spawned shell to the configured endpoint', async function () {
      if (isNightly) return this.skip(); // TODO(MONGOSH-3498): shell does not exit on Node nightly
      const shell = startTestShell(this, {
        args: ['--nodb'],
        env: { ...env, MONGOSH_TELEMETRY_ENDPOINT: endpoint },
        forceTerminal: true, // telemetry is only enabled for interactive sessions
      });
      await shell.waitForPrompt();
      shell.writeInputLine('exit');
      await shell.waitForSuccessfulExit();

      // Events are fire-and-forget, so they may land slightly after exit.
      await eventually(() => {
        expect(received.map((r) => r.event.name)).to.include.members([
          'Identify',
          'Session Ended',
        ]);
      });

      const identify = received.find((r) => r.event.name === 'Identify');
      // Path is `/<schema version>/<dasherized event name>`.
      expect(identify?.path).to.equal('/v1/identify');
      expect(identify?.query.get('sessionId'))
        .to.be.a('string')
        .and.not.equal('');
      expect(identify?.event.payload.session_id).to.equal(
        identify?.query.get('sessionId')
      );
      expect(identify?.event.payload.mongosh_version).to.be.a('string');
    });

    it('sends nothing when the endpoint is empty, but keeps telemetry enabled', async function () {
      if (isNightly) return this.skip(); // TODO(MONGOSH-3498): shell does not exit on Node nightly
      // This is the default every other test in the repo runs under, courtesy
      // of scripts/test-env-setup.js.
      const shell = startTestShell(this, {
        args: ['--nodb'],
        env: { ...env, MONGOSH_TELEMETRY_ENDPOINT: '' },
        forceTerminal: true,
      });
      await shell.waitForPrompt();
      expect(
        await shell.executeLine('config.get("enableTelemetry")')
      ).to.include('true');
      shell.writeInputLine('exit');
      await shell.waitForSuccessfulExit();

      expect(received).to.deep.equal([]);
    });
  });

  describe('telemetry toggling', function () {
    let shell: TestShell;

    beforeEach(async function () {
      // No endpoint override: these tests are about the config/consent surface,
      // not about delivering anything.
      shell = startTestShell(this, {
        args: ['--nodb'],
        env,
        forceTerminal: true,
      });
      await shell.waitForPrompt();
      shell.assertNoErrors();
    });

    it('enableTelemetry() yields a success response', async function () {
      expect(await shell.executeLine('enableTelemetry()')).to.include(
        'Telemetry is now enabled'
      );
      expect((await readConfig()).enableTelemetry).to.equal(true);
    });

    it('disableTelemetry() yields a success response', async function () {
      expect(await shell.executeLine('disableTelemetry();')).to.include(
        'Telemetry is now disabled'
      );
      expect((await readConfig()).enableTelemetry).to.equal(false);
    });

    it('enableTelemetry() returns an error if forceDisableTelemetry is set (but does not throw)', async function () {
      await shell.executeLine(
        'process.env.MONGOSH_FORCE_DISABLE_TELEMETRY_FOR_TESTING = 1'
      );
      expect(await shell.executeLine('enableTelemetry() + "<<<<"')).to.include(
        "Cannot modify telemetry settings while 'forceDisableTelemetry' is set to true<<<<"
      );
      expect((await readConfig()).enableTelemetry).to.equal(true);
    });

    it('disableTelemetry() returns an error if forceDisableTelemetry is set (but does not throw)', async function () {
      await shell.executeLine(
        'process.env.MONGOSH_FORCE_DISABLE_TELEMETRY_FOR_TESTING = 1'
      );
      expect(await shell.executeLine('disableTelemetry() + "<<<<"')).to.include(
        "Cannot modify telemetry settings while 'forceDisableTelemetry' is set to true<<<<"
      );
      expect((await readConfig()).enableTelemetry).to.equal(true);
    });
  });
});
