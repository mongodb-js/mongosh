import { expect } from 'chai';
import setupLoggerAndTelemetry from './setup-logger-and-telemetry';
import { EventEmitter } from 'events';
import pino from 'pino';
import { MongoshInvalidInputError } from '@mongosh/errors';

describe('setupLoggerAndTelemetry', () => {
  let logOutput: any[];
  let analyticsOutput: ['identify'|'track'|'log', any][];
  let bus: EventEmitter;

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
    expect(logOutput).to.be.empty;
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
      });
      bus.emit('mongosh:error', new MongoshInvalidInputError('meow', 'CLIREPL-1005', { cause: 'x' }));
      bus.emit('mongosh:help');
      bus.emit('mongosh:use', { db: 'admin' });
      bus.emit('mongosh:show', { method: 'dbs' });
    }

    bus.emit('mongosh:setCtx', { method: 'setCtx' });
    bus.emit('mongosh:api-call', { method: 'auth', class: 'Database', db: 'test-1603986682000', arguments: { } });
    bus.emit('mongosh:api-call', { method: 'redactable', arguments: { email: 'mongosh@example.com' } });
    bus.emit('mongosh:rewritten-async-input', { original: '1+1', rewritten: '2' });

    expect(logOutput).to.have.lengthOf(16);
    expect(logOutput[0].msg).to.equal('mongosh:update-user {"enableTelemetry":false}');
    expect(logOutput[1].msg).to.match(/^mongosh:connect/);
    expect(logOutput[1].msg).to.match(/"session_id":"5fb3c20ee1507e894e5340f3"/);
    expect(logOutput[1].msg).to.match(/"userId":"53defe995fa47e6c13102d9d"/);
    expect(logOutput[1].msg).to.match(/"connectionUri":"mongodb:\/\/localhost\/"/);
    expect(logOutput[1].msg).to.match(/"is_localhost":true/);
    expect(logOutput[1].msg).to.match(/"is_atlas":false/);
    expect(logOutput[1].msg).to.match(/"node_version":"v12\.19\.0"/);
    expect(logOutput[2].type).to.equal('Error');
    expect(logOutput[2].msg).to.match(/meow/);
    expect(logOutput[3].msg).to.equal('mongosh:help');
    expect(logOutput[4].msg).to.equal('mongosh:use {"db":"admin"}');
    expect(logOutput[5].msg).to.equal('mongosh:show {"method":"dbs"}');
    expect(logOutput[6].msg).to.equal('mongosh:update-user {"enableTelemetry":true}');
    expect(logOutput[7].msg).to.match(/^mongosh:connect/);
    expect(logOutput[8].type).to.equal('Error');
    expect(logOutput[8].msg).to.match(/meow/);
    expect(logOutput[9].msg).to.equal('mongosh:help');
    expect(logOutput[10].msg).to.equal('mongosh:use {"db":"admin"}');
    expect(logOutput[11].msg).to.equal('mongosh:show {"method":"dbs"}');
    expect(logOutput[12].msg).to.equal('mongosh:setCtx {"method":"setCtx"}');
    expect(logOutput[13].msg).to.match(/^mongosh:api-call/);
    expect(logOutput[13].msg).to.match(/"db":"test-1603986682000"/);
    expect(logOutput[14].msg).to.match(/^mongosh:api-call/);
    expect(logOutput[14].msg).to.match(/"email":"<email>"/);
    expect(logOutput[15].msg).to.match(/^mongosh:rewritten-async-input/);
    expect(logOutput[15].msg).to.match(/"original":"1\+1"/);
    expect(logOutput[15].msg).to.match(/"rewritten":"2"/);
    expect(analyticsOutput).to.deep.equal([
      [ 'identify', { userId: '53defe995fa47e6c13102d9d' } ],
      [ 'identify', { userId: '53defe995fa47e6c13102d9d' } ],
      [
        'track',
        {
          userId: '53defe995fa47e6c13102d9d',
          event: 'New Connection',
          properties: {
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
          properties: { name: 'MongoshInvalidInputError', code: 'CLIREPL-1005', scope: 'CLIREPL', metadata: { cause: 'x' } }
        }
      ],
      [ 'track', { userId: '53defe995fa47e6c13102d9d', event: 'Help' } ],
      [ 'track', { userId: '53defe995fa47e6c13102d9d', event: 'Use' } ],
      [
        'track',
        {
          userId: '53defe995fa47e6c13102d9d',
          event: 'Show',
          properties: { method: 'dbs' }
        }
      ]
    ]);
  });

  it('works when analytics are not available', () => {
    setupLoggerAndTelemetry('5fb3c20ee1507e894e5340f3', bus, () => logger, () => { throw new Error(); });
    bus.emit('mongosh:new-user', userId, true);
    expect(analyticsOutput).to.be.empty;
    expect(logOutput).to.have.lengthOf(1);
    expect(logOutput[0].type).to.equal('Error');
    expect(logOutput[0].name).to.equal('mongosh');
    bus.emit('mongosh:help');
    expect(analyticsOutput).to.be.empty;
    expect(logOutput).to.have.lengthOf(2);
  });
});
