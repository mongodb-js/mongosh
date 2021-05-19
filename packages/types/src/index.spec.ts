import { CliUserConfigValidator } from './';
import { expect } from 'chai';

describe('config validation', () => {
  it('validates config option values', async() => {
    const { validate } = CliUserConfigValidator as any;
    expect(await validate('userId', 'foo')).to.equal(null);
    expect(await validate('disableGreetingMessage', 'foo')).to.equal(null);
    expect(await validate('inspectDepth', 'foo')).to.equal('inspectDepth must be a positive integer');
    expect(await validate('inspectDepth', -1)).to.equal('inspectDepth must be a positive integer');
    expect(await validate('inspectDepth', 0)).to.equal(null);
    expect(await validate('inspectDepth', 1)).to.equal(null);
    expect(await validate('inspectDepth', Infinity)).to.equal(null);
    expect(await validate('historyLength', 'foo')).to.equal('historyLength must be a positive integer');
    expect(await validate('historyLength', -1)).to.equal('historyLength must be a positive integer');
    expect(await validate('historyLength', 0)).to.equal(null);
    expect(await validate('historyLength', 1)).to.equal(null);
    expect(await validate('historyLength', Infinity)).to.equal(null);
    expect(await validate('showStackTraces', 'foo')).to.equal('showStackTraces must be a boolean');
    expect(await validate('showStackTraces', -1)).to.equal('showStackTraces must be a boolean');
    expect(await validate('showStackTraces', false)).to.equal(null);
    expect(await validate('showStackTraces', true)).to.equal(null);
    expect(await validate('batchSize', 'foo')).to.equal('batchSize must be a positive integer');
    expect(await validate('batchSize', -1)).to.equal('batchSize must be a positive integer');
    expect(await validate('batchSize', 0)).to.equal('batchSize must be a positive integer');
    expect(await validate('batchSize', 1)).to.equal(null);
    expect(await validate('batchSize', Infinity)).to.equal(null);
    expect(await validate('enableTelemetry', 'foo')).to.equal('enableTelemetry must be a boolean');
    expect(await validate('enableTelemetry', -1)).to.equal('enableTelemetry must be a boolean');
    expect(await validate('enableTelemetry', false)).to.equal(null);
    expect(await validate('enableTelemetry', true)).to.equal(null);
  });
});
