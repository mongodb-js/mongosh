/* eslint-disable mocha/max-top-level-suites */
import { expect } from 'chai';
import { MongoLogWriter } from 'mongodb-log-writer';
import { EventEmitter } from 'events';
import { MongoshInvalidInputError } from '@mongosh/errors';
import type { MongoshBus } from '@mongosh/types';
import type { Writable } from 'stream';
import type { MongoshLoggingAndTelemetry } from '.';
import { setupLoggingAndTelemetry } from '.';
import type { LoggingAndTelemetry } from './logging-and-telemetry';
import sinon from 'sinon';
import type { MongoshLoggingAndTelemetryArguments } from './types';
import { getDeviceId } from '@mongodb-js/device-id';
import { getMachineId } from 'native-machine-id';

describe('MongoshLoggingAndTelemetry', function () {
  let logOutput: any[];
  let analyticsOutput: ['identify' | 'track' | 'log', any][];
  let bus: MongoshBus;

  const userId = '53defe995fa47e6c13102d9d';
  const logId = '5fb3c20ee1507e894e5340f3';
  const deviceId = 'test-device';

  let logger: MongoLogWriter;

  const analytics = {
    identify(info: any) {
      analyticsOutput.push(['identify', info]);
    },
    track(info: any) {
      analyticsOutput.push(['track', info]);
    },
    async flush() {
      return Promise.resolve();
    },
  };

  let loggingAndTelemetry: MongoshLoggingAndTelemetry;

  const testLoggingArguments: Omit<MongoshLoggingAndTelemetryArguments, 'bus'> =
    {
      analytics,
      userTraits: {
        platform: process.platform,
        arch: process.arch,
      },
      mongoshVersion: '1.0.0',
    };

  beforeEach(function () {
    logOutput = [];
    analyticsOutput = [];
    bus = new EventEmitter();

    loggingAndTelemetry = setupLoggingAndTelemetry({
      ...testLoggingArguments,
      deviceId,
      bus,
    });

    logger = new MongoLogWriter(logId, `/tmp/${logId}_log`, {
      write(chunk: string, cb: () => void) {
        if (chunk.trim()) {
          logOutput.push(JSON.parse(chunk));
        }
        cb();
      },
      end(cb: () => void) {
        cb();
      },
    } as Writable);
  });

  afterEach(async function () {
    await loggingAndTelemetry.detachLogger();
    logger.destroy();
  });

  it('throws when running attachLogger twice without detaching', function () {
    loggingAndTelemetry.attachLogger(logger);
    expect(() => loggingAndTelemetry.attachLogger(logger)).throws(
      'Previously set logger has not been detached. Run detachLogger() before setting.'
    );
  });

  it('does not throw when attaching and detaching loggers', async function () {
    loggingAndTelemetry.attachLogger(logger);
    await loggingAndTelemetry.detachLogger();
    expect(() => loggingAndTelemetry.attachLogger(logger)).does.not.throw();
  });

  it('tracks new local connection events', async function () {
    loggingAndTelemetry.attachLogger(logger);

    await (loggingAndTelemetry as LoggingAndTelemetry).setupTelemetryPromise;

    expect(logOutput).to.have.lengthOf(0);
    expect(analyticsOutput).to.be.empty;

    bus.emit('mongosh:new-user', { userId, anonymousId: userId });
    bus.emit('mongosh:log-initialized');

    bus.emit('mongosh:connect', {
      uri: 'mongodb://localhost/',
      is_localhost: true,
      is_atlas: false,
      resolved_hostname: 'localhost',
      node_version: 'v12.19.0',
    });

    expect(logOutput[0].msg).to.equal('Connecting to server');
    expect(logOutput[0].attr.connectionUri).to.equal('mongodb://localhost/');
    expect(logOutput[0].attr.is_localhost).to.equal(true);
    expect(logOutput[0].attr.is_atlas).to.equal(false);
    expect(logOutput[0].attr.atlas_hostname).to.equal(null);
    expect(logOutput[0].attr.node_version).to.equal('v12.19.0');

    expect(analyticsOutput).to.deep.equal([
      [
        'identify',
        {
          anonymousId: userId,
          traits: {
            device_id: deviceId,
            arch: process.arch,
            platform: process.platform,
            session_id: logId,
          },
        },
      ],
      [
        'track',
        {
          anonymousId: userId,
          event: 'New Connection',
          properties: {
            mongosh_version: '1.0.0',
            session_id: logId,
            is_localhost: true,
            is_atlas: false,
            atlas_hostname: null,
            node_version: 'v12.19.0',
          },
        },
      ],
    ]);
  });

  it('tracks new atlas connection events', async function () {
    loggingAndTelemetry.attachLogger(logger);
    await (loggingAndTelemetry as LoggingAndTelemetry).setupTelemetryPromise;

    expect(logOutput).to.have.lengthOf(0);
    expect(analyticsOutput).to.be.empty;

    bus.emit('mongosh:new-user', { userId, anonymousId: userId });
    bus.emit('mongosh:log-initialized');

    bus.emit('mongosh:connect', {
      uri: 'mongodb://test-data-sets-a011bb.mongodb.net/',
      is_localhost: false,
      is_atlas: true,
      resolved_hostname: 'test-data-sets-00-02-a011bb.mongodb.net',
      node_version: 'v12.19.0',
    });

    expect(logOutput[0].msg).to.equal('Connecting to server');
    expect(logOutput[0].attr.connectionUri).to.equal(
      'mongodb://test-data-sets-a011bb.mongodb.net/'
    );
    expect(logOutput[0].attr.is_localhost).to.equal(false);
    expect(logOutput[0].attr.is_atlas).to.equal(true);
    expect(logOutput[0].attr.atlas_hostname).to.equal(
      'test-data-sets-00-02-a011bb.mongodb.net'
    );
    expect(logOutput[0].attr.node_version).to.equal('v12.19.0');

    expect(analyticsOutput).to.deep.equal([
      [
        'identify',
        {
          anonymousId: userId,
          traits: {
            device_id: deviceId,
            arch: process.arch,
            platform: process.platform,
            session_id: logId,
          },
        },
      ],
      [
        'track',
        {
          anonymousId: userId,
          event: 'New Connection',
          properties: {
            mongosh_version: '1.0.0',
            session_id: logId,
            is_localhost: false,
            is_atlas: true,
            atlas_hostname: 'test-data-sets-00-02-a011bb.mongodb.net',
            node_version: 'v12.19.0',
          },
        },
      ],
    ]);
  });

  describe('device ID', function () {
    let bus: EventEmitter;
    beforeEach(function () {
      bus = new EventEmitter();
    });

    afterEach(function () {
      sinon.restore();
    });

    it('uses device ID "unknown" and logs error if it fails to resolve it', async function () {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      sinon
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        .stub(require('native-machine-id'), 'getMachineId')
        .rejects(new Error('Test'));
      const loggingAndTelemetry = setupLoggingAndTelemetry({
        ...testLoggingArguments,
        bus,
        deviceId: undefined,
      });
      loggingAndTelemetry.attachLogger(logger);
      await (loggingAndTelemetry as LoggingAndTelemetry).setupTelemetryPromise;

      bus.emit('mongosh:new-user', { userId, anonymousId: userId });

      expect(analyticsOutput).deep.equal([
        [
          'identify',
          {
            anonymousId: userId,
            traits: {
              device_id: 'unknown',
              platform: process.platform,
              arch: process.arch,
              session_id: logId,
            },
          },
        ],
      ]);
      expect(logOutput[0]).contains({
        c: 'MONGOSH',
        id: 1000000006,
        ctx: 'telemetry',
        msg: 'Error: Test',
      });
    });

    it('automatically sets up device ID for telemetry', async function () {
      const abortController = new AbortController();
      const loggingAndTelemetry = setupLoggingAndTelemetry({
        ...testLoggingArguments,
        bus,
        deviceId: undefined,
      });

      loggingAndTelemetry.attachLogger(logger);

      bus.emit('mongosh:new-user', { userId, anonymousId: userId });

      const deviceId = await getDeviceId({
        getMachineId: () => getMachineId({ raw: true }),
        abortSignal: abortController.signal,
      });

      await (loggingAndTelemetry as LoggingAndTelemetry).setupTelemetryPromise;

      expect(analyticsOutput).deep.equal([
        [
          'identify',
          {
            anonymousId: userId,
            traits: {
              device_id: deviceId,
              platform: process.platform,
              arch: process.arch,
              session_id: logId,
            },
          },
        ],
      ]);
    });

    it('resolves device ID setup when flushed', async function () {
      const loggingAndTelemetry = setupLoggingAndTelemetry({
        ...testLoggingArguments,
        bus,
        deviceId: undefined,
      });
      sinon
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        .stub(require('native-machine-id'), 'getMachineId')
        .resolves(
          new Promise((resolve) => setTimeout(resolve, 10_000).unref())
        );

      loggingAndTelemetry.attachLogger(logger);

      // Start the device ID setup
      const setupPromise = (loggingAndTelemetry as LoggingAndTelemetry)
        .setupTelemetryPromise;

      // Flush before it completes
      await loggingAndTelemetry.flush();

      // Emit an event that would trigger analytics
      bus.emit('mongosh:new-user', { userId, anonymousId: userId });

      await setupPromise;

      // Should still identify but with unknown device ID
      expect(analyticsOutput).deep.equal([
        [
          'identify',
          {
            anonymousId: userId,
            traits: {
              device_id: 'unknown',
              platform: process.platform,
              arch: process.arch,
              session_id: logId,
            },
          },
        ],
      ]);
    });

    it('only delays analytic outputs, not logging', async function () {
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      let resolveTelemetry: (value: unknown) => void = () => {};
      const delayedTelemetry = new Promise((resolve) => {
        resolveTelemetry = (value) => resolve(value);
      });
      sinon
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        .stub(require('native-machine-id'), 'getMachineId')
        .resolves(delayedTelemetry);

      const loggingAndTelemetry = setupLoggingAndTelemetry({
        ...testLoggingArguments,
        bus,
        deviceId: undefined,
      }) as LoggingAndTelemetry;

      loggingAndTelemetry.attachLogger(logger);

      // This event has both analytics and logging
      bus.emit('mongosh:use', { db: '' });

      expect(logOutput).to.have.lengthOf(1);
      expect(analyticsOutput).to.have.lengthOf(0);

      resolveTelemetry('1234');
      await loggingAndTelemetry.setupTelemetryPromise;

      expect(logOutput).to.have.lengthOf(1);
      expect(analyticsOutput).to.have.lengthOf(1);

      // Hash created from machine ID 1234
      expect(loggingAndTelemetry['deviceId']).equals(
        '8c9f929608f0ef13bfd5a290e0233f283e2cc25ffefc2ad8d9ef0650eb224a52'
      );
    });
  });

  it('detaching logger leads to no logging but persists analytics', async function () {
    loggingAndTelemetry.attachLogger(logger);
    await (loggingAndTelemetry as LoggingAndTelemetry).setupTelemetryPromise;

    expect(logOutput).to.have.lengthOf(0);
    expect(analyticsOutput).to.have.lengthOf(0);

    await loggingAndTelemetry.detachLogger();

    // This event has both analytics and logging
    bus.emit('mongosh:use', { db: '' });

    expect(logOutput).to.have.lengthOf(0);
    expect(analyticsOutput).to.have.lengthOf(1);
  });

  it('detaching logger applies to devtools-connect events', async function () {
    loggingAndTelemetry.attachLogger(logger);

    bus.emit('devtools-connect:connect-fail-early');
    bus.emit('devtools-connect:connect-fail-early');

    expect(logOutput).to.have.lengthOf(2);
    // No analytics event attached to this
    expect(analyticsOutput).to.have.lengthOf(0);

    await loggingAndTelemetry.detachLogger();
    bus.emit('devtools-connect:connect-fail-early');

    expect(logOutput).to.have.lengthOf(2);
    expect(analyticsOutput).to.have.lengthOf(0);

    loggingAndTelemetry.attachLogger(logger);

    bus.emit('devtools-connect:connect-fail-early');
    bus.emit('devtools-connect:connect-fail-early');
    expect(logOutput).to.have.lengthOf(4);
  });

  it('detaching logger mid-way leads to no logging but persists analytics', async function () {
    loggingAndTelemetry.attachLogger(logger);

    expect(logOutput).to.have.lengthOf(0);
    expect(analyticsOutput).to.have.lengthOf(0);

    // This event has both analytics and logging
    bus.emit('mongosh:use', { db: '' });

    expect(logOutput).to.have.lengthOf(1);

    await (loggingAndTelemetry as LoggingAndTelemetry).setupTelemetryPromise;
    expect(analyticsOutput).to.have.lengthOf(1);

    await loggingAndTelemetry.detachLogger();

    bus.emit('mongosh:use', { db: '' });

    expect(logOutput).to.have.lengthOf(1);

    expect(analyticsOutput).to.have.lengthOf(2);
  });

  it('detaching logger is recoverable', async function () {
    loggingAndTelemetry.attachLogger(logger);

    expect(logOutput).to.have.lengthOf(0);
    expect(analyticsOutput).to.have.lengthOf(0);

    // This event has both analytics and logging
    bus.emit('mongosh:use', { db: '' });

    expect(logOutput).to.have.lengthOf(1);
    await (loggingAndTelemetry as LoggingAndTelemetry).setupTelemetryPromise;

    expect(analyticsOutput).to.have.lengthOf(1);

    await loggingAndTelemetry.detachLogger();

    bus.emit('mongosh:use', { db: '' });

    expect(logOutput).to.have.lengthOf(1);

    expect(analyticsOutput).to.have.lengthOf(2);

    loggingAndTelemetry.attachLogger(logger);

    bus.emit('mongosh:use', { db: '' });

    expect(logOutput).to.have.lengthOf(2);

    expect(analyticsOutput).to.have.lengthOf(3);
  });

  it('tracks a sequence of events', async function () {
    loggingAndTelemetry.attachLogger(logger);
    await (loggingAndTelemetry as LoggingAndTelemetry).setupTelemetryPromise;

    expect(logOutput).to.have.lengthOf(0);
    expect(analyticsOutput).to.be.empty;

    bus.emit('mongosh:new-user', { userId, anonymousId: userId });
    bus.emit('mongosh:log-initialized');

    bus.emit('mongosh:update-user', { userId, anonymousId: userId });
    bus.emit('mongosh:start-session', {
      isInteractive: true,
      jsContext: 'foo',
      timings: {
        'BoxedNode Bindings': 50,
        NodeREPL: 100,
      },
    });

    bus.emit(
      'mongosh:error',
      new MongoshInvalidInputError('meow', 'CLIREPL-1005', { cause: 'x' }),
      'repl'
    );
    bus.emit(
      'mongosh:error',
      new MongoshInvalidInputError('meow', 'CLIREPL-1005', { cause: 'x' }),
      'fatal'
    );
    bus.emit('mongosh:use', { db: 'admin' });
    bus.emit('mongosh:show', { method: 'dbs' });

    bus.emit('mongosh:setCtx', { method: 'setCtx' });
    bus.emit('mongosh:api-call-with-arguments', {
      method: 'auth',
      class: 'Database',
      db: 'test-1603986682000',
      arguments: {},
    });
    bus.emit('mongosh:api-call-with-arguments', {
      method: 'redactable',
      arguments: { filter: { email: 'mongosh@example.com' } },
    });
    bus.emit('mongosh:evaluate-input', { input: '1+1' });

    const circular: any = {};
    circular.circular = circular;
    bus.emit('mongosh:api-call-with-arguments', {
      method: 'circulararg',
      arguments: { options: { circular } },
    });
    expect(circular.circular).to.equal(circular); // Make sure the argument is still intact afterwards

    bus.emit('mongosh:start-loading-cli-scripts', { usesShellOption: true });
    bus.emit('mongosh:api-load-file', { nested: true, filename: 'foobar.js' });
    bus.emit('mongosh:start-mongosh-repl', { version: '1.0.0' });
    bus.emit('mongosh:api-load-file', { nested: false, filename: 'foobar.js' });
    bus.emit('mongosh:mongoshrc-load');
    bus.emit('mongosh:mongoshrc-mongorc-warn');
    bus.emit('mongosh:eval-cli-script');
    bus.emit('mongosh:globalconfig-load', {
      filename: '/etc/mongosh.conf',
      found: true,
    });

    bus.emit('mongosh:crypt-library-load-skip', {
      cryptSharedLibPath: 'path',
      reason: 'reason',
    });
    bus.emit('mongosh:crypt-library-load-found', {
      cryptSharedLibPath: 'path',
      expectedVersion: { versionStr: 'someversion' },
    });

    bus.emit('mongosh-snippets:loaded', { installdir: '/' });
    bus.emit('mongosh-snippets:npm-lookup', { existingVersion: 'v1.2.3' });
    bus.emit('mongosh-snippets:npm-lookup-stopped');
    bus.emit('mongosh-snippets:npm-download-failed', {
      npmMetadataURL: 'https://example.com',
    });
    bus.emit('mongosh-snippets:npm-download-active', {
      npmMetadataURL: 'https://example.com',
      npmTarballURL: 'https://example.net',
    });
    bus.emit('mongosh-snippets:fetch-index', { refreshMode: 'always' });
    bus.emit('mongosh-snippets:fetch-cache-invalid');
    bus.emit('mongosh-snippets:fetch-index-error', {
      action: 'fetch',
      url: 'https://localhost',
    });
    bus.emit('mongosh-snippets:fetch-index-done');
    bus.emit('mongosh-snippets:package-json-edit-error', { error: 'failed' });
    bus.emit('mongosh-snippets:spawn-child', { args: ['npm', 'install'] });
    bus.emit('mongosh-snippets:load-snippet', {
      source: 'load-all',
      name: 'foo',
    });
    bus.emit('mongosh-snippets:snippet-command', { args: ['install', 'foo'] });
    bus.emit('mongosh-snippets:transform-error', {
      error: 'failed',
      addition: 'oh no',
      name: 'foo',
    });

    const connAttemptData = {
      driver: { name: 'nodejs', version: '3.6.1' },
      devtoolsConnectVersion: '1.0.0',
      host: 'localhost',
      uri: 'mongodb://localhost/',
    };
    bus.emit('devtools-connect:connect-attempt-initialized', connAttemptData);
    bus.emit('devtools-connect:connect-heartbeat-failure', {
      connectionId: 'localhost',
      failure: new Error('cause'),
      isFailFast: true,
      isKnownServer: true,
    });
    bus.emit('devtools-connect:connect-heartbeat-succeeded', {
      connectionId: 'localhost',
    });
    bus.emit('devtools-connect:connect-fail-early');
    bus.emit('devtools-connect:connect-attempt-finished', {});
    bus.emit('devtools-connect:resolve-srv-error', {
      from: 'mongodb+srv://foo:bar@hello.world/',
      error: new Error('failed'),
      duringLoad: false,
      resolutionDetails: [],
      durationMs: 1,
    });
    bus.emit('devtools-connect:resolve-srv-succeeded', {
      from: 'mongodb+srv://foo:bar@hello.world/',
      to: 'mongodb://foo:bar@db.hello.world/',
      resolutionDetails: [],
      durationMs: 1,
    });
    bus.emit('devtools-connect:missing-optional-dependency', {
      name: 'kerberos',
      error: new Error('no kerberos'),
    });
    bus.emit('mongosh-sp:reset-connection-options');

    bus.emit('mongosh-editor:run-edit-command', {
      tmpDoc: 'tmpDoc',
      editor: 'editor',
      code: '<code>',
    });
    bus.emit('mongosh-editor:read-vscode-extensions-done', {
      vscodeDir: 'vscodir',
      hasMongodbExtension: false,
    });
    bus.emit('mongosh-editor:read-vscode-extensions-failed', {
      vscodeDir: 'vscodir',
      error: new Error('failed'),
    });

    let i = 0;

    expect(logOutput[i++].msg).to.equal('User updated');
    expect(logOutput[i].s).to.equal('E');
    expect(logOutput[i++].attr.message).to.match(/meow/);
    expect(logOutput[i].s).to.equal('F');
    expect(logOutput[i++].attr.message).to.match(/meow/);
    expect(logOutput[i].msg).to.equal('Used "use" command');
    expect(logOutput[i++].attr).to.deep.equal({ db: 'admin' });
    expect(logOutput[i].msg).to.equal('Used "show" command');
    expect(logOutput[i++].attr).to.deep.equal({ method: 'dbs' });
    expect(logOutput[i++].msg).to.equal('Initialized context');
    expect(logOutput[i].msg).to.equal('Performed API call');
    expect(logOutput[i++].attr.db).to.equal('test-1603986682000');
    expect(logOutput[i].msg).to.equal('Performed API call');
    expect(logOutput[i++].attr.arguments.filter.email).to.equal('<email>');
    expect(logOutput[i].msg).to.equal('Evaluating input');
    expect(logOutput[i++].attr.input).to.equal('1+1');
    expect(logOutput[i].msg).to.equal('Performed API call');
    expect(logOutput[i++].attr._inspected).to.match(/circular/);
    expect(logOutput[i++].msg).to.equal('Start loading CLI scripts');
    expect(logOutput[i].msg).to.equal('Loading file via load()');
    expect(logOutput[i].attr.nested).to.equal(true);
    expect(logOutput[i++].attr.filename).to.equal('foobar.js');
    expect(logOutput[i].msg).to.equal('Started REPL');
    expect(logOutput[i++].attr.version).to.equal('1.0.0');
    expect(logOutput[i].attr.nested).to.equal(false);
    expect(logOutput[i++].attr.filename).to.equal('foobar.js');
    expect(logOutput[i++].msg).to.equal('Loading .mongoshrc.js');
    expect(logOutput[i++].msg).to.equal(
      'Warning about .mongorc.js/.mongoshrc.js mismatch'
    );
    expect(logOutput[i++].msg).to.equal(
      'Evaluating script passed on the command line'
    );
    expect(logOutput[i].msg).to.equal('Loading global configuration file');
    expect(logOutput[i++].attr.filename).to.equal('/etc/mongosh.conf');
    expect(logOutput[i].msg).to.equal('Skipping shared library candidate');
    expect(logOutput[i++].attr).to.deep.equal({
      cryptSharedLibPath: 'path',
      reason: 'reason',
    });
    expect(logOutput[i].msg).to.equal('Accepted shared library candidate');
    expect(logOutput[i++].attr).to.deep.equal({
      cryptSharedLibPath: 'path',
      expectedVersion: 'someversion',
    });
    expect(logOutput[i].msg).to.equal('Loaded snippets');
    expect(logOutput[i++].attr).to.deep.equal({ installdir: '/' });
    expect(logOutput[i].msg).to.equal('Performing npm lookup');
    expect(logOutput[i++].attr).to.deep.equal({ existingVersion: 'v1.2.3' });
    expect(logOutput[i++].msg).to.equal('npm lookup stopped');
    expect(logOutput[i].msg).to.equal('npm download failed');
    expect(logOutput[i++].attr.npmMetadataURL).to.equal('https://example.com');
    expect(logOutput[i].msg).to.equal('npm download active');
    expect(logOutput[i].attr.npmMetadataURL).to.equal('https://example.com');
    expect(logOutput[i++].attr.npmTarballURL).to.equal('https://example.net');
    expect(logOutput[i].msg).to.equal('Fetching snippet index');
    expect(logOutput[i++].attr.refreshMode).to.equal('always');
    expect(logOutput[i++].msg).to.equal('Snippet cache invalid');
    expect(logOutput[i].msg).to.equal('Fetching snippet index failed');
    expect(logOutput[i++].attr).to.deep.equal({
      action: 'fetch',
      url: 'https://localhost',
    });
    expect(logOutput[i++].msg).to.equal('Fetching snippet index done');
    expect(logOutput[i].msg).to.equal('Modifying snippets package.json failed');
    expect(logOutput[i++].attr).to.deep.equal({ error: 'failed' });
    expect(logOutput[i].msg).to.equal('Spawning helper');
    expect(logOutput[i++].attr).to.deep.equal({ args: ['npm', 'install'] });
    expect(logOutput[i].msg).to.equal('Loading snippet');
    expect(logOutput[i++].attr).to.deep.equal({
      source: 'load-all',
      name: 'foo',
    });
    expect(logOutput[i].msg).to.equal('Running snippet command');
    expect(logOutput[i++].attr).to.deep.equal({ args: ['install', 'foo'] });
    expect(logOutput[i].msg).to.equal('Rewrote error message');
    expect(logOutput[i++].attr).to.deep.equal({
      error: 'failed',
      addition: 'oh no',
      name: 'foo',
    });
    expect(logOutput[i].msg).to.equal('Initiating connection attempt');
    expect(logOutput[i++].attr).to.deep.equal(connAttemptData);
    expect(logOutput[i].msg).to.equal('Server heartbeat failure');
    expect(logOutput[i++].attr).to.deep.equal({
      connectionId: 'localhost',
      failure: 'cause',
      isFailFast: true,
      isKnownServer: true,
    });
    expect(logOutput[i].msg).to.equal('Server heartbeat succeeded');
    expect(logOutput[i++].attr).to.deep.equal({ connectionId: 'localhost' });
    expect(logOutput[i++].msg).to.equal(
      'Aborting connection attempt as irrecoverable'
    );
    expect(logOutput[i++].msg).to.equal('Connection attempt finished');
    expect(logOutput[i].msg).to.equal('Resolving SRV record failed');
    expect(logOutput[i++].attr).to.deep.equal({
      from: 'mongodb+srv://<credentials>@hello.world/',
      error: 'failed',
      duringLoad: false,
      resolutionDetails: [],
      durationMs: 1,
    });
    expect(logOutput[i].msg).to.equal('Resolving SRV record succeeded');
    expect(logOutput[i++].attr).to.deep.equal({
      from: 'mongodb+srv://<credentials>@hello.world/',
      to: 'mongodb://<credentials>@db.hello.world/',
      resolutionDetails: [],
      durationMs: 1,
    });
    expect(logOutput[i].msg).to.equal('Missing optional dependency');
    expect(logOutput[i++].attr).to.deep.equal({
      name: 'kerberos',
      error: 'no kerberos',
    });
    expect(logOutput[i++].msg).to.equal(
      'Reconnect because of changed connection options'
    );
    expect(logOutput[i].msg).to.equal('Open external editor');
    expect(logOutput[i++].attr).to.deep.equal({
      tmpDoc: 'tmpDoc',
      editor: 'editor',
      code: '<code>',
    });
    expect(logOutput[i].msg).to.equal(
      'Reading vscode extensions from file system succeeded'
    );
    expect(logOutput[i++].attr).to.deep.equal({
      vscodeDir: 'vscodir',
      hasMongodbExtension: false,
    });
    expect(logOutput[i].msg).to.equal(
      'Reading vscode extensions from file system failed'
    );
    expect(logOutput[i++].attr).to.deep.equal({
      vscodeDir: 'vscodir',
      error: 'failed',
    });
    expect(i).to.equal(logOutput.length);

    expect(analyticsOutput).to.deep.equal([
      [
        'identify',
        {
          anonymousId: userId,
          traits: {
            device_id: deviceId,
            platform: process.platform,
            arch: process.arch,
            session_id: logId,
          },
        },
      ],
      [
        'identify',
        {
          anonymousId: userId,
          traits: {
            device_id: deviceId,
            platform: process.platform,
            arch: process.arch,
            session_id: logId,
          },
        },
      ],
      [
        'track',
        {
          anonymousId: userId,
          event: 'Startup Time',
          properties: {
            is_interactive: true,
            js_context: 'foo',
            boxed_node_bindings: 50,
            node_repl: 100,
            mongosh_version: '1.0.0',
            session_id: logId,
          },
        },
      ],
      [
        'track',
        {
          anonymousId: '53defe995fa47e6c13102d9d',
          event: 'Error',
          properties: {
            mongosh_version: '1.0.0',
            session_id: logId,
            name: 'MongoshInvalidInputError',
            code: 'CLIREPL-1005',
            scope: 'CLIREPL',
            metadata: { cause: 'x' },
          },
        },
      ],
      [
        'track',
        {
          anonymousId: '53defe995fa47e6c13102d9d',
          event: 'Error',
          properties: {
            mongosh_version: '1.0.0',
            session_id: logId,
            name: 'MongoshInvalidInputError',
            code: 'CLIREPL-1005',
            scope: 'CLIREPL',
            metadata: { cause: 'x' },
          },
        },
      ],
      [
        'track',
        {
          anonymousId: '53defe995fa47e6c13102d9d',
          event: 'Use',
          properties: {
            mongosh_version: '1.0.0',
            session_id: logId,
          },
        },
      ],
      [
        'track',
        {
          anonymousId: '53defe995fa47e6c13102d9d',
          event: 'Show',
          properties: {
            mongosh_version: '1.0.0',
            session_id: logId,
            method: 'dbs',
          },
        },
      ],
      [
        'track',
        {
          event: 'Script Loaded CLI',
          properties: {
            mongosh_version: '1.0.0',
            session_id: logId,
            nested: true,
            shell: true,
          },
          anonymousId: '53defe995fa47e6c13102d9d',
        },
      ],
      [
        'track',
        {
          event: 'Script Loaded',
          properties: {
            mongosh_version: '1.0.0',
            session_id: logId,
            nested: false,
          },
          anonymousId: '53defe995fa47e6c13102d9d',
        },
      ],
      [
        'track',
        {
          event: 'Mongoshrc Loaded',
          properties: {
            mongosh_version: '1.0.0',
            session_id: logId,
          },
          anonymousId: '53defe995fa47e6c13102d9d',
        },
      ],
      [
        'track',
        {
          event: 'Mongorc Warning',
          properties: {
            mongosh_version: '1.0.0',
            session_id: logId,
          },
          anonymousId: '53defe995fa47e6c13102d9d',
        },
      ],
      [
        'track',
        {
          event: 'Script Evaluated',
          properties: {
            mongosh_version: '1.0.0',
            session_id: logId,
            shell: true,
          },
          anonymousId: '53defe995fa47e6c13102d9d',
        },
      ],
      [
        'track',
        {
          anonymousId: '53defe995fa47e6c13102d9d',
          event: 'Snippet Install',
          properties: {
            mongosh_version: '1.0.0',
            session_id: logId,
          },
        },
      ],
    ]);
  });

  it('buffers deprecated API calls', async function () {
    loggingAndTelemetry.attachLogger(logger);
    await (loggingAndTelemetry as LoggingAndTelemetry).setupTelemetryPromise;

    expect(logOutput).to.have.lengthOf(0);
    expect(analyticsOutput).to.be.empty;

    bus.emit('mongosh:new-user', { userId, anonymousId: userId });
    bus.emit('mongosh:log-initialized');

    bus.emit('mongosh:evaluate-started');

    logOutput = [];
    analyticsOutput = [];

    bus.emit('mongosh:api-call', {
      method: 'cloneDatabase',
      class: 'Database',
      deprecated: true,
      callDepth: 0,
      isAsync: true,
    });
    bus.emit('mongosh:api-call', {
      method: 'cloneDatabase',
      class: 'Database',
      deprecated: true,
      callDepth: 0,
      isAsync: true,
    });
    bus.emit('mongosh:api-call', {
      method: 'copyDatabase',
      class: 'Database',
      deprecated: true,
      callDepth: 0,
      isAsync: true,
    });
    bus.emit('mongosh:api-call', {
      method: 'cloneDatabase',
      class: 'Database',
      deprecated: true,
      callDepth: 0,
      isAsync: true,
    });
    bus.emit('mongosh:api-call', {
      method: 'mangleDatabase',
      class: 'Database',
      deprecated: true,
      callDepth: 1,
      isAsync: true,
    });
    bus.emit('mongosh:api-call', {
      method: 'getName',
      class: 'Database',
      deprecated: false,
      callDepth: 0,
      isAsync: false,
    });

    expect(logOutput).to.be.empty;
    expect(analyticsOutput).to.be.empty;

    bus.emit('mongosh:evaluate-finished');
    expect(logOutput).to.have.length(3);
    expect(analyticsOutput).to.have.length(5);

    expect(logOutput[0].msg).to.equal('Deprecated API call');
    expect(logOutput[0].attr).to.deep.equal({
      class: 'Database',
      method: 'cloneDatabase',
    });
    expect(logOutput[1].msg).to.equal('Deprecated API call');
    expect(logOutput[1].attr).to.deep.equal({
      class: 'Database',
      method: 'copyDatabase',
    });
    expect(logOutput[2].msg).to.equal('Deprecated API call');
    expect(logOutput[2].attr).to.deep.equal({
      class: 'Database',
      method: 'mangleDatabase',
    });
    expect(analyticsOutput).to.deep.equal([
      [
        'track',
        {
          anonymousId: '53defe995fa47e6c13102d9d',
          event: 'Deprecated Method',
          properties: {
            mongosh_version: '1.0.0',
            session_id: logId,
            class: 'Database',
            method: 'cloneDatabase',
          },
        },
      ],
      [
        'track',
        {
          anonymousId: '53defe995fa47e6c13102d9d',
          event: 'Deprecated Method',
          properties: {
            mongosh_version: '1.0.0',
            session_id: logId,
            class: 'Database',
            method: 'copyDatabase',
          },
        },
      ],
      [
        'track',
        {
          anonymousId: '53defe995fa47e6c13102d9d',
          event: 'Deprecated Method',
          properties: {
            mongosh_version: '1.0.0',
            session_id: logId,
            class: 'Database',
            method: 'mangleDatabase',
          },
        },
      ],
      [
        'track',
        {
          anonymousId: '53defe995fa47e6c13102d9d',
          event: 'API Call',
          properties: {
            mongosh_version: '1.0.0',
            session_id: logId,
            class: 'Database',
            method: 'cloneDatabase',
            count: 3,
          },
        },
      ],
      [
        'track',
        {
          anonymousId: '53defe995fa47e6c13102d9d',
          event: 'API Call',
          properties: {
            mongosh_version: '1.0.0',
            session_id: logId,
            class: 'Database',
            method: 'copyDatabase',
            count: 1,
          },
        },
      ],
    ]);

    bus.emit('mongosh:new-user', { userId, anonymousId: userId });

    logOutput = [];
    analyticsOutput = [];

    bus.emit('mongosh:evaluate-started');
    bus.emit('mongosh:api-call', {
      method: 'cloneDatabase',
      class: 'Database',
      deprecated: true,
      callDepth: 0,
      isAsync: true,
    });

    expect(logOutput).to.be.empty;
    expect(analyticsOutput).to.be.empty;

    bus.emit('mongosh:evaluate-finished');
    expect(logOutput).to.have.length(1);
    expect(logOutput[0].msg).to.equal('Deprecated API call');
    expect(logOutput[0].attr).to.deep.equal({
      class: 'Database',
      method: 'cloneDatabase',
    });

    expect(analyticsOutput).to.have.lengthOf(2);
  });

  it('does not track database calls outside of evaluate-{started,finished}', function () {
    loggingAndTelemetry.attachLogger(logger);

    expect(logOutput).to.have.lengthOf(0);
    expect(analyticsOutput).to.be.empty;

    bus.emit('mongosh:new-user', { userId, anonymousId: userId });

    logOutput = [];
    analyticsOutput = [];

    bus.emit('mongosh:api-call', {
      method: 'cloneDatabase',
      class: 'Database',
      deprecated: true,
      callDepth: 0,
      isAsync: true,
    });
    bus.emit('mongosh:evaluate-finished');

    expect(logOutput).to.have.lengthOf(0);
    expect(analyticsOutput).to.be.empty;
  });

  it('redacts logging of sensitive commands', async function () {
    loggingAndTelemetry.attachLogger(logger);
    await (loggingAndTelemetry as LoggingAndTelemetry).setupTelemetryPromise;

    expect(logOutput).to.have.lengthOf(0);

    // Test that sensitive commands are redacted
    bus.emit('mongosh:evaluate-input', {
      input: 'db.createUser({user: "admin", pwd: "password", roles: []})',
    });
    bus.emit('mongosh:evaluate-input', { input: 'db.auth("user", "pass")' });
    bus.emit('mongosh:evaluate-input', {
      input: 'db.updateUser("user", {pwd: "newpass"})',
    });
    bus.emit('mongosh:evaluate-input', {
      input: 'db.changeUserPassword("user", "newpass")',
    });
    bus.emit('mongosh:evaluate-input', {
      input: 'connect("mongodb://user:pass@localhost/")',
    });
    bus.emit('mongosh:evaluate-input', {
      input: 'new Mongo("mongodb://user:pass@localhost/")',
    });

    // Test that non-sensitive commands are still logged
    bus.emit('mongosh:evaluate-input', { input: 'db.getUsers()' });
    bus.emit('mongosh:evaluate-input', { input: 'show dbs' });

    // Should only have logged the non-sensitive commands
    expect(logOutput).to.have.lengthOf(8);
    expect(logOutput[0].msg).to.equal('Evaluating input');
    expect(logOutput[0].attr.input).to.equal('<sensitive command used>');
    expect(logOutput[1].msg).to.equal('Evaluating input');
    expect(logOutput[1].attr.input).to.equal('<sensitive command used>');
    expect(logOutput[2].msg).to.equal('Evaluating input');
    expect(logOutput[2].attr.input).to.equal('<sensitive command used>');
    expect(logOutput[3].msg).to.equal('Evaluating input');
    expect(logOutput[3].attr.input).to.equal('<sensitive command used>');
    expect(logOutput[4].msg).to.equal('Evaluating input');
    expect(logOutput[4].attr.input).to.equal('<sensitive command used>');
    expect(logOutput[5].msg).to.equal('Evaluating input');
    expect(logOutput[5].attr.input).to.equal('<sensitive command used>');
    expect(logOutput[6].msg).to.equal('Evaluating input');
    expect(logOutput[6].attr.input).to.equal('db.getUsers()');
    expect(logOutput[7].msg).to.equal('Evaluating input');
    expect(logOutput[7].attr.input).to.equal('show dbs');
  });

  it('tracks custom logging events', async function () {
    expect(logOutput).to.have.lengthOf(0);
    expect(analyticsOutput).to.be.empty;

    loggingAndTelemetry.attachLogger(logger);
    await (loggingAndTelemetry as LoggingAndTelemetry).setupTelemetryPromise;

    bus.emit('mongosh:connect', {
      uri: 'mongodb://localhost/',
      is_localhost: true,
      is_atlas: false,
      resolved_hostname: 'localhost',
      node_version: 'v12.19.0',
    });

    bus.emit('mongosh:write-custom-log', {
      method: 'info',
      message: 'This is an info message',
      attr: { some: 'value' },
    });

    bus.emit('mongosh:write-custom-log', {
      method: 'warn',
      message: 'This is a warn message',
    });

    bus.emit('mongosh:write-custom-log', {
      method: 'error',
      message: 'Error!',
    });

    bus.emit('mongosh:write-custom-log', {
      method: 'fatal',
      message: 'Fatal!',
    });

    bus.emit('mongosh:write-custom-log', {
      method: 'debug',
      message: 'Debug with level',
      level: 1,
    });

    bus.emit('mongosh:write-custom-log', {
      method: 'debug',
      message: 'Debug without level',
    });

    expect(logOutput[0].msg).to.equal('Connecting to server');
    expect(logOutput[0].attr.connectionUri).to.equal('mongodb://localhost/');
    expect(logOutput[0].attr.is_localhost).to.equal(true);
    expect(logOutput[0].attr.is_atlas).to.equal(false);
    expect(logOutput[0].attr.atlas_hostname).to.equal(null);
    expect(logOutput[0].attr.node_version).to.equal('v12.19.0');

    expect(logOutput[1].s).to.equal('I');
    expect(logOutput[1].c).to.equal('MONGOSH-SCRIPTS');
    expect(logOutput[1].ctx).to.equal('custom-log');
    expect(logOutput[1].msg).to.equal('This is an info message');
    expect(logOutput[1].attr.some).to.equal('value');

    expect(logOutput[2].s).to.equal('W');
    expect(logOutput[2].c).to.equal('MONGOSH-SCRIPTS');
    expect(logOutput[2].ctx).to.equal('custom-log');
    expect(logOutput[2].msg).to.equal('This is a warn message');

    expect(logOutput[3].s).to.equal('E');
    expect(logOutput[3].c).to.equal('MONGOSH-SCRIPTS');
    expect(logOutput[3].ctx).to.equal('custom-log');
    expect(logOutput[3].msg).to.equal('Error!');

    expect(logOutput[4].s).to.equal('F');
    expect(logOutput[4].c).to.equal('MONGOSH-SCRIPTS');
    expect(logOutput[4].ctx).to.equal('custom-log');
    expect(logOutput[4].msg).to.equal('Fatal!');

    expect(logOutput[5].s).to.equal('D1');
    expect(logOutput[5].c).to.equal('MONGOSH-SCRIPTS');
    expect(logOutput[5].ctx).to.equal('custom-log');
    expect(logOutput[5].msg).to.equal('Debug with level');

    expect(logOutput[6].s).to.equal('D1');
    expect(logOutput[6].c).to.equal('MONGOSH-SCRIPTS');
    expect(logOutput[6].ctx).to.equal('custom-log');
    expect(logOutput[6].msg).to.equal('Debug without level');

    expect(analyticsOutput).to.deep.equal([
      [
        'track',
        {
          anonymousId: undefined,
          event: 'New Connection',
          properties: {
            mongosh_version: '1.0.0',
            session_id: '5fb3c20ee1507e894e5340f3',
            is_localhost: true,
            is_atlas: false,
            atlas_hostname: null,
            node_version: 'v12.19.0',
          },
        },
      ],
    ]);
  });
});
