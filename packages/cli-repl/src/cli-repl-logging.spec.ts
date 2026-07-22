import path from 'path';
import type { Duplex } from 'stream';
import { PassThrough } from 'stream';
import { startSharedTestServer } from '@mongosh/testing';
import { expect, readReplLogFile, useTmpdir } from '../test/repl-helpers';
import type { CliReplOptions } from './cli-repl';
import { CliRepl } from './cli-repl';
import { KNOWN_AGENT_ENV_VARS } from '@mongosh/logging';
import type { DevtoolsConnectOptions } from '@mongosh/service-provider-node-driver';
import sinon from 'sinon';
import { MongoLogWriter, MongoLogManager } from 'mongodb-log-writer';

describe('CliRepl logging', function () {
  let cliReplOptions: CliReplOptions;
  let cliRepl: CliRepl & {
    start(
      cstr: string,
      options: Partial<DevtoolsConnectOptions>
    ): Promise<void>;
  };
  let input: Duplex;
  let outputStream: Duplex;
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

  beforeEach(function () {
    input = new PassThrough();
    outputStream = new PassThrough();

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

    beforeEach(async function () {
      cliReplOptions.shellCliOptions.connectionSpecifier =
        await testServer.connectionString();
      cliRepl = new CliRepl(cliReplOptions);
      // These tests exercise log file behavior, not REPL history. Disabling
      // persistent history avoids opening a history file handle per test.
      sinon.stub(cliRepl, 'getHistoryFilePath').returns('');
    });

    afterEach(async function () {
      await cliRepl.mongoshRepl.close();
      sinon.restore();
    });

    context('logging configuration', function () {
      it('logging is enabled by default and event is called', async function () {
        const onLogInitialized = sinon.stub();
        cliRepl.bus.on('mongosh:log-initialized', onLogInitialized);

        await cliRepl.start(await testServer.connectionString(), {});

        expect(await cliRepl.getConfig('disableLogging')).is.false;

        expect(onLogInitialized).calledOnce;
        expect(cliRepl.logWriter).is.instanceOf(MongoLogWriter);
      });

      it('does not initialize logging when it is disabled', async function () {
        cliRepl.config.disableLogging = true;
        const onLogInitialized = sinon.stub();
        cliRepl.bus.on('mongosh:log-initialized', onLogInitialized);

        await cliRepl.start(await testServer.connectionString(), {});

        expect(await cliRepl.getConfig('disableLogging')).is.true;
        expect(onLogInitialized).not.called;

        expect(cliRepl.logWriter).is.undefined;
      });

      it('logs cleanup errors', async function () {
        sinon
          .stub(MongoLogManager.prototype, 'cleanupOldLogFiles')
          .rejects(new Error('Method not implemented'));
        await cliRepl.start(await testServer.connectionString(), {});
        expect(
          (await log()).filter(
            (entry) =>
              entry.ctx === 'log' &&
              entry.msg === 'Error: Method not implemented'
          )
        ).to.have.lengthOf(1);
      });

      it('can get a log path', async function () {
        await cliRepl.start(await testServer.connectionString(), {});
        expect(cliRepl.getLogPath()).equals(
          path.join(tmpdir.path, (cliRepl.logWriter?.logId as string) + '_log')
        );
      });

      const customLogLocation = useTmpdir();
      it('can set the log location and uses a prefix', async function () {
        cliRepl.config.logLocation = customLogLocation.path;
        await cliRepl.start(await testServer.connectionString(), {});

        expect(await cliRepl.getConfig('logLocation')).equals(
          customLogLocation.path
        );
        expect(cliRepl.logWriter?.logFilePath).equals(
          path.join(
            customLogLocation.path,
            'mongosh_' + (cliRepl.logWriter?.logId as string) + '_log'
          )
        );
      });

      it('uses a prefix even if the custom location is the same as the home location', async function () {
        // This is a corner case where the custom location is the same as the home location.
        // The prefix is still added to the log file name for consistency. If the user needs
        // the default behavior for the log names, they should instead set the location to undefined.
        const customLogHomePath = cliRepl.shellHomeDirectory.localPath('.');
        cliRepl.config.logLocation = customLogHomePath;
        await cliRepl.start(await testServer.connectionString(), {});

        expect(await cliRepl.getConfig('logLocation')).equals(
          customLogHomePath
        );
        const logName = path.join(
          customLogHomePath,
          'mongosh_' + (cliRepl.logWriter?.logId as string) + '_log'
        );
        expect(cliRepl.logWriter?.logFilePath).equals(logName);
        expect(cliRepl.getLogPath()).equals(path.join(logName));
      });

      it('can set log retention days, retention GB, max file count, and compression', async function () {
        const testRetentionDays = 123;
        const testLogRetentionGB = 10;
        const testMaxFileCount = 123;
        cliRepl.config.logRetentionDays = testRetentionDays;
        cliRepl.config.logRetentionGB = testLogRetentionGB;
        cliRepl.config.logMaxFileCount = testMaxFileCount;
        cliRepl.config.logCompressionEnabled = true;
        await cliRepl.start(await testServer.connectionString(), {});

        expect(await cliRepl.getConfig('logRetentionDays')).equals(
          testRetentionDays
        );
        expect(cliRepl.logManager?._options.retentionDays).equals(
          testRetentionDays
        );

        expect(await cliRepl.getConfig('logRetentionGB')).equals(
          testLogRetentionGB
        );
        expect(cliRepl.logManager?._options.retentionGB).equals(
          testLogRetentionGB
        );

        expect(await cliRepl.getConfig('logMaxFileCount')).equals(
          testMaxFileCount
        );
        expect(cliRepl.logManager?._options.maxLogFileCount).equals(
          testMaxFileCount
        );

        expect(await cliRepl.getConfig('logCompressionEnabled')).equals(true);
        expect(cliRepl.logManager?._options.gzip).equals(true);
      });
    });
  });
});
