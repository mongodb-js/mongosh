/* eslint-disable camelcase */
import { expect } from 'chai';
import setupLoggerAndTelemetry from './setup-logger-and-telemetry';
import { EventEmitter } from 'events';
import pino from 'pino';
import { MongoshInvalidInputError } from '@mongosh/errors';
import { MongoshBus } from '@mongosh/types';

describe('setupLoggerAndTelemetry', () => {
  let logOutput: any[];
  let analyticsOutput: ['identify'|'track'|'log', any][];
  let bus: MongoshBus;

  const logger = pino({ name: 'mongosh' }, {
    write(chunk: string) { logOutput.push(JSON.parse(chunk)); }
  });
  const analytics = {
    identify(info: any) { analyticsOutput.push(['identify', info]); },
    track(info: any) { analyticsOutput.push(['track', info]); }
  };

  const userId = '53defe995fa47e6c13102d9d';
  const logId = '5fb3c20ee1507e894e5340f3';

  beforeEach(() => {
    logOutput = [];
    analyticsOutput = [];
    bus = new EventEmitter();
  });

  it('works', () => {
    setupLoggerAndTelemetry(logId, bus, () => logger, () => analytics);
    expect(logOutput).to.have.lengthOf(1);
    expect(analyticsOutput).to.be.empty;

    bus.emit('mongosh:new-user', userId, false);
    bus.emit('mongosh:new-user', userId, true);

    // Test some events with and without telemetry enabled
    for (const telemetry of [ false, true ]) {
      bus.emit('mongosh:update-user', userId, telemetry);
      bus.emit('mongosh:connect', {
        uri: 'mongodb://localhost/',
        is_localhost: true,
        is_atlas: false,
        node_version: 'v12.19.0'
      } as any);
      bus.emit('mongosh:error', new MongoshInvalidInputError('meow', 'CLIREPL-1005', { cause: 'x' }));
      bus.emit('mongosh:use', { db: 'admin' });
      bus.emit('mongosh:show', { method: 'dbs' });
    }

    bus.emit('mongosh:setCtx', { method: 'setCtx' });
    bus.emit('mongosh:api-call', { method: 'auth', class: 'Database', db: 'test-1603986682000', arguments: { } });
    bus.emit('mongosh:api-call', { method: 'redactable', arguments: { filter: { email: 'mongosh@example.com' } } });
    bus.emit('mongosh:evaluate-input', { input: '1+1' });
    bus.emit('mongosh:driver-initialized', { driver: { name: 'nodejs', version: '3.6.1' } });

    bus.emit('mongosh:start-loading-cli-scripts', { usesShellOption: true });
    bus.emit('mongosh:api-load-file', { nested: true, filename: 'foobar.js' });
    bus.emit('mongosh:start-mongosh-repl', { version: '1.0.0' });
    bus.emit('mongosh:api-load-file', { nested: false, filename: 'foobar.js' });
    bus.emit('mongosh:mongoshrc-load');
    bus.emit('mongosh:mongoshrc-mongorc-warn');
    bus.emit('mongosh:eval-cli-script');

    bus.emit('mongosh-snippets:loaded', { installdir: '/' });
    bus.emit('mongosh-snippets:npm-lookup', { existingVersion: 'v1.2.3' });
    bus.emit('mongosh-snippets:npm-lookup-stopped');
    bus.emit('mongosh-snippets:npm-download-failed', { npmMetadataURL: 'https://example.com' });
    bus.emit('mongosh-snippets:npm-download-active', { npmMetadataURL: 'https://example.com', npmTarballURL: 'https://example.net' });
    bus.emit('mongosh-snippets:fetch-index', { refreshMode: 'always' });
    bus.emit('mongosh-snippets:fetch-cache-invalid');
    bus.emit('mongosh-snippets:fetch-index-error', { action: 'fetch', url: 'https://localhost' });
    bus.emit('mongosh-snippets:fetch-index-done');
    bus.emit('mongosh-snippets:package-json-edit-error', { error: 'failed' });
    bus.emit('mongosh-snippets:spawn-child', { args: ['npm', 'install'] });
    bus.emit('mongosh-snippets:load-snippet', { source: 'load-all', name: 'foo' });
    bus.emit('mongosh-snippets:snippet-command', { args: ['install', 'foo'] });
    bus.emit('mongosh-snippets:transform-error', { error: 'failed', addition: 'oh no', name: 'foo' });

    let i = 0;
    expect(logOutput[i++].msg).to.match(/^mongosh:start-logging \{"version":".+","execPath":".+","isCompiledBinary":.+\}$/);
    expect(logOutput[i++].msg).to.equal('mongosh:update-user {"enableTelemetry":false}');
    expect(logOutput[i].msg).to.match(/^mongosh:connect/);
    expect(logOutput[i].msg).to.match(/"session_id":"5fb3c20ee1507e894e5340f3"/);
    expect(logOutput[i].msg).to.match(/"userId":"53defe995fa47e6c13102d9d"/);
    expect(logOutput[i].msg).to.match(/"connectionUri":"mongodb:\/\/localhost\/"/);
    expect(logOutput[i].msg).to.match(/"is_localhost":true/);
    expect(logOutput[i].msg).to.match(/"is_atlas":false/);
    expect(logOutput[i++].msg).to.match(/"node_version":"v12\.19\.0"/);
    expect(logOutput[i].type).to.equal('Error');
    expect(logOutput[i++].msg).to.match(/meow/);
    expect(logOutput[i++].msg).to.equal('mongosh:use {"db":"admin"}');
    expect(logOutput[i++].msg).to.equal('mongosh:show {"method":"dbs"}');
    expect(logOutput[i++].msg).to.equal('mongosh:update-user {"enableTelemetry":true}');
    expect(logOutput[i++].msg).to.match(/^mongosh:connect/);
    expect(logOutput[i].type).to.equal('Error');
    expect(logOutput[i++].msg).to.match(/meow/);
    expect(logOutput[i++].msg).to.equal('mongosh:use {"db":"admin"}');
    expect(logOutput[i++].msg).to.equal('mongosh:show {"method":"dbs"}');
    expect(logOutput[i++].msg).to.equal('mongosh:setCtx {"method":"setCtx"}');
    expect(logOutput[i].msg).to.match(/^mongosh:api-call/);
    expect(logOutput[i++].msg).to.match(/"db":"test-1603986682000"/);
    expect(logOutput[i].msg).to.match(/^mongosh:api-call/);
    expect(logOutput[i++].msg).to.match(/"email":"<email>"/);
    expect(logOutput[i].msg).to.match(/^mongosh:evaluate-input/);
    expect(logOutput[i++].msg).to.match(/"input":"1\+1"/);
    expect(logOutput[i++].msg).to.match(/"version":"3.6.1"/);
    expect(logOutput[i++].msg).to.equal('mongosh:start-loading-cli-scripts');
    expect(logOutput[i].msg).to.match(/^mongosh:api-load-file/);
    expect(logOutput[i].msg).to.match(/"nested":true/);
    expect(logOutput[i++].msg).to.match(/"filename":"foobar.js"/);
    expect(logOutput[i++].msg).to.equal('mongosh:start-mongosh-repl {"version":"1.0.0"}');
    expect(logOutput[i].msg).to.match(/"nested":false/);
    expect(logOutput[i++].msg).to.match(/"filename":"foobar.js"/);
    expect(logOutput[i++].msg).to.equal('mongosh:mongoshrc-load');
    expect(logOutput[i++].msg).to.equal('mongosh:mongoshrc-mongorc-warn');
    expect(logOutput[i++].msg).to.equal('mongosh:eval-cli-script');
    expect(logOutput[i++].msg).to.equal('mongosh-snippets:loaded {"installdir":"/"}');
    expect(logOutput[i++].msg).to.equal('mongosh-snippets:npm-lookup {"existingVersion":"v1.2.3"}');
    expect(logOutput[i++].msg).to.equal('mongosh-snippets:npm-lookup-stopped');
    expect(logOutput[i].msg).to.match(/^mongosh-snippets:npm-download-failed/);
    expect(logOutput[i++].msg).to.match(/"npmMetadataURL":"https:\/\/example.com"/);
    expect(logOutput[i].msg).to.match(/^mongosh-snippets:npm-download-active/);
    expect(logOutput[i].msg).to.match(/"npmMetadataURL":"https:\/\/example.com"/);
    expect(logOutput[i++].msg).to.match(/"npmTarballURL":"https:\/\/example.net"/);
    expect(logOutput[i++].msg).to.equal('mongosh-snippets:fetch-index {"refreshMode":"always"}');
    expect(logOutput[i++].msg).to.equal('mongosh-snippets:fetch-cache-invalid');
    expect(logOutput[i++].msg).to.equal('mongosh-snippets:fetch-index-error {"action":"fetch","url":"https://localhost"}');
    expect(logOutput[i++].msg).to.equal('mongosh-snippets:fetch-index-done');
    expect(logOutput[i++].msg).to.equal('mongosh-snippets:package-json-edit-error {"error":"failed"}');
    expect(logOutput[i++].msg).to.equal('mongosh-snippets:spawn-child {"args":["npm","install"]}');
    expect(logOutput[i++].msg).to.equal('mongosh-snippets:load-snippet {"source":"load-all","name":"foo"}');
    expect(logOutput[i++].msg).to.equal('mongosh-snippets:snippet-command {"args":["install","foo"]}');
    expect(logOutput[i++].msg).to.equal('mongosh-snippets:transform-error {"error":"failed","addition":"oh no","name":"foo"}');
    expect(i).to.equal(logOutput.length);


    const mongosh_version = require('../package.json').version;
    expect(analyticsOutput).to.deep.equal([
      [
        'identify',
        {
          userId: '53defe995fa47e6c13102d9d',
          traits: {
            platform: process.platform,
            arch: process.arch
          }
        }
      ],
      [
        'identify',
        {
          userId: '53defe995fa47e6c13102d9d',
          traits: {
            platform: process.platform,
            arch: process.arch
          }
        }
      ],
      [
        'track',
        {
          userId: '53defe995fa47e6c13102d9d',
          event: 'New Connection',
          properties: {
            mongosh_version,
            session_id: '5fb3c20ee1507e894e5340f3',
            is_localhost: true,
            is_atlas: false,
            node_version: 'v12.19.0'
          }
        }
      ],
      [
        'track',
        {
          userId: '53defe995fa47e6c13102d9d',
          event: 'Error',
          properties: {
            mongosh_version,
            name: 'MongoshInvalidInputError',
            code: 'CLIREPL-1005',
            scope: 'CLIREPL',
            metadata: { cause: 'x' }
          }
        }
      ],
      [
        'track',
        {
          userId: '53defe995fa47e6c13102d9d',
          event: 'Use',
          properties: { mongosh_version }
        }
      ],
      [
        'track',
        {
          userId: '53defe995fa47e6c13102d9d',
          event: 'Show',
          properties: {
            mongosh_version,
            method: 'dbs'
          }
        }
      ],
      [
        'track',
        {
          event: 'Script Loaded CLI',
          properties: {
            mongosh_version,
            nested: true,
            shell: true
          },
          userId: '53defe995fa47e6c13102d9d'
        }
      ],
      [
        'track',
        {
          event: 'Script Loaded',
          properties: {
            mongosh_version,
            nested: false
          },
          userId: '53defe995fa47e6c13102d9d'
        }
      ],
      [
        'track',
        {
          event: 'Mongoshrc Loaded',
          properties: {
            mongosh_version,
          },
          userId: '53defe995fa47e6c13102d9d'
        }
      ],
      [
        'track',
        {
          event: 'Mongorc Warning',
          properties: {
            mongosh_version,
          },
          userId: '53defe995fa47e6c13102d9d'
        }
      ],
      [
        'track',
        {
          event: 'Script Evaluated',
          properties: {
            mongosh_version,
            shell: true
          },
          userId: '53defe995fa47e6c13102d9d'
        }
      ],
      [
        'track',
        {
          userId: '53defe995fa47e6c13102d9d',
          event: 'Snippet Install',
          properties: {
            mongosh_version
          }
        }
      ]
    ]);
  });

  it('buffers deprecated API calls', () => {
    setupLoggerAndTelemetry(logId, bus, () => logger, () => analytics);
    expect(logOutput).to.have.lengthOf(1);
    expect(analyticsOutput).to.be.empty;

    const mongosh_version = require('../package.json').version;
    bus.emit('mongosh:new-user', userId, true);

    logOutput = [];
    analyticsOutput = [];

    bus.emit('mongosh:deprecated-api-call', { method: 'cloneDatabase', class: 'Database' });
    bus.emit('mongosh:deprecated-api-call', { method: 'cloneDatabase', class: 'Database' });
    bus.emit('mongosh:deprecated-api-call', { method: 'copyDatabase', class: 'Database' });
    bus.emit('mongosh:deprecated-api-call', { method: 'cloneDatabase', class: 'Database' });

    expect(logOutput).to.be.empty;
    expect(analyticsOutput).to.be.empty;

    bus.emit('mongosh:evaluate-finished');
    expect(logOutput).to.have.length(2);
    expect(analyticsOutput).to.have.length(2);

    expect(logOutput[0].msg).to.equal('mongosh:deprecated-api-call {"class":"Database","method":"cloneDatabase"}');
    expect(logOutput[1].msg).to.equal('mongosh:deprecated-api-call {"class":"Database","method":"copyDatabase"}');
    expect(analyticsOutput).to.deep.equal([
      [
        'track',
        {
          userId: '53defe995fa47e6c13102d9d',
          event: 'Deprecated Method',
          properties: {
            mongosh_version,
            class: 'Database',
            method: 'cloneDatabase',
          }
        }
      ],
      [
        'track',
        {
          userId: '53defe995fa47e6c13102d9d',
          event: 'Deprecated Method',
          properties: {
            mongosh_version,
            class: 'Database',
            method: 'copyDatabase',
          }
        }
      ]
    ]);

    bus.emit('mongosh:new-user', userId, false);
    logOutput = [];
    analyticsOutput = [];

    bus.emit('mongosh:deprecated-api-call', { method: 'cloneDatabase', class: 'Database' });

    expect(logOutput).to.be.empty;
    expect(analyticsOutput).to.be.empty;

    bus.emit('mongosh:evaluate-finished');
    expect(logOutput).to.have.length(1);
    expect(logOutput[0].msg).to.equal('mongosh:deprecated-api-call {"class":"Database","method":"cloneDatabase"}');
    expect(analyticsOutput).to.be.empty;
  });

  it('works when analytics are not available', () => {
    setupLoggerAndTelemetry('5fb3c20ee1507e894e5340f3', bus, () => logger, () => { throw new Error(); });
    bus.emit('mongosh:new-user', userId, true);
    expect(analyticsOutput).to.be.empty;
    expect(logOutput).to.have.lengthOf(2);
    expect(logOutput[1].type).to.equal('Error');
    expect(logOutput[1].name).to.equal('mongosh');
  });
});
