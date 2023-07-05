import { CliUserConfig, CliUserConfigValidator } from './';
import { expect } from 'chai';

describe('config validation', function () {
  it('validates config option values', async function () {
    const { validate } = CliUserConfigValidator as any;
    expect(await validate('userId', 'foo')).to.equal(null);
    expect(await validate('telemetryAnonymousId', 'foo')).to.equal(null);
    expect(await validate('disableGreetingMessage', 'foo')).to.equal(null);
    expect(await validate('inspectDepth', 'foo')).to.equal(
      'inspectDepth must be a positive integer'
    );
    expect(await validate('inspectDepth', -1)).to.equal(
      'inspectDepth must be a positive integer'
    );
    expect(await validate('inspectDepth', 0)).to.equal(null);
    expect(await validate('inspectDepth', 1)).to.equal(null);
    expect(await validate('inspectDepth', Infinity)).to.equal(null);
    expect(await validate('historyLength', 'foo')).to.equal(
      'historyLength must be a positive integer'
    );
    expect(await validate('historyLength', -1)).to.equal(
      'historyLength must be a positive integer'
    );
    expect(await validate('historyLength', 0)).to.equal(null);
    expect(await validate('historyLength', 1)).to.equal(null);
    expect(await validate('historyLength', Infinity)).to.equal(null);
    expect(await validate('showStackTraces', 'foo')).to.equal(
      'showStackTraces must be a boolean'
    );
    expect(await validate('showStackTraces', -1)).to.equal(
      'showStackTraces must be a boolean'
    );
    expect(await validate('showStackTraces', false)).to.equal(null);
    expect(await validate('showStackTraces', true)).to.equal(null);
    expect(await validate('redactHistory', 'foo')).to.equal(
      "redactHistory must be one of 'keep', 'remove', or 'remove-redact'"
    );
    expect(await validate('redactHistory', -1)).to.equal(
      "redactHistory must be one of 'keep', 'remove', or 'remove-redact'"
    );
    expect(await validate('redactHistory', false)).to.equal(
      "redactHistory must be one of 'keep', 'remove', or 'remove-redact'"
    );
    expect(await validate('redactHistory', 'keep')).to.equal(null);
    expect(await validate('redactHistory', 'remove')).to.equal(null);
    expect(await validate('redactHistory', 'remove-redact')).to.equal(null);
    expect(await validate('displayBatchSize', 'foo')).to.equal(
      'displayBatchSize must be a positive integer'
    );
    expect(await validate('displayBatchSize', -1)).to.equal(
      'displayBatchSize must be a positive integer'
    );
    expect(await validate('displayBatchSize', 0)).to.equal(
      'displayBatchSize must be a positive integer'
    );
    expect(await validate('displayBatchSize', 1)).to.equal(null);
    expect(await validate('displayBatchSize', Infinity)).to.equal(null);
    expect(await validate('maxTimeMS', 'foo')).to.equal(
      'maxTimeMS must be null or a positive integer'
    );
    expect(await validate('maxTimeMS', -1)).to.equal(
      'maxTimeMS must be null or a positive integer'
    );
    expect(await validate('maxTimeMS', 0)).to.equal(
      'maxTimeMS must be null or a positive integer'
    );
    expect(await validate('maxTimeMS', 1)).to.equal(null);
    expect(await validate('maxTimeMS', null)).to.equal(null);
    expect(await validate('enableTelemetry', 'foo')).to.equal(
      'enableTelemetry must be a boolean'
    );
    expect(await validate('enableTelemetry', -1)).to.equal(
      'enableTelemetry must be a boolean'
    );
    expect(await validate('enableTelemetry', false)).to.equal(null);
    expect(await validate('enableTelemetry', true)).to.equal(null);
    expect(await validate('inspectCompact', 'foo')).to.equal(
      'inspectCompact must be a boolean or a positive integer'
    );
    expect(await validate('inspectCompact', -1)).to.equal(
      'inspectCompact must be a boolean or a positive integer'
    );
    expect(await validate('inspectCompact', false)).to.equal(null);
    expect(await validate('inspectCompact', true)).to.equal(null);
    expect(await validate('inspectCompact', 32)).to.equal(null);
    expect(
      await validate('snippetIndexSourceURLs', 'https://example.com/')
    ).to.equal(null);
    expect(await validate('snippetIndexSourceURLs', 'foo')).to.equal(
      'snippetIndexSourceURLs must be a ;-separated list of valid URLs'
    );
    expect(
      await validate('snippetIndexSourceURLs', 'https://xyz/;foo')
    ).to.equal(
      'snippetIndexSourceURLs must be a ;-separated list of valid URLs'
    );
    expect(await validate('snippetIndexSourceURLs', ';')).to.equal(null);
    expect(await validate('snippetIndexSourceURLs', 0)).to.equal(
      'snippetIndexSourceURLs must be a ;-separated list of valid URLs'
    );
    expect(await validate('snippetRegistryURL', ';')).to.equal(
      'snippetRegistryURL must be a valid URL'
    );
    expect(
      await validate('snippetRegistryURL', 'https://registry.npmjs.org')
    ).to.equal(null);
    expect(await validate('snippetRegistryURL', 0)).to.equal(
      'snippetRegistryURL must be a valid URL'
    );
    expect(await validate('snippetAutoload', 'foo')).to.equal(
      'snippetAutoload must be a boolean'
    );
    expect(await validate('snippetAutoload', -1)).to.equal(
      'snippetAutoload must be a boolean'
    );
    expect(await validate('snippetAutoload', false)).to.equal(null);
    expect(await validate('snippetAutoload', true)).to.equal(null);
    expect(
      await validate('oidcRedirectURI', 'http://localhost:123456/foo')
    ).to.equal('oidcRedirectURI must be undefined or a valid URL');
    expect(await validate('oidcRedirectURI', undefined)).to.equal(null);
    expect(await validate('oidcRedirectURI', 'http://localhost:0/')).to.equal(
      null
    );
    expect(
      await validate('oidcRedirectURI', 'http://localhost:12345/foo')
    ).to.equal(null);
    expect(await validate('oidcTrustedEndpoints', 'localhost')).to.equal(
      'oidcTrustedEndpoints must be undefined or an array of hostnames'
    );
    expect(await validate('oidcTrustedEndpoints', [1, 2, 3])).to.equal(
      'oidcTrustedEndpoints must be undefined or an array of hostnames'
    );
    expect(
      await validate('oidcTrustedEndpoints', [
        '::1',
        '127.0.0.1',
        'foo.bar.com',
        '*.net',
      ])
    ).to.equal(null);
    expect(await validate('oidcTrustedEndpoints', undefined)).to.equal(null);
    expect(await validate('browser', 1234)).to.equal(
      'browser must be undefined, false, or a command string'
    );
    expect(await validate('browser', undefined)).to.equal(null);
    expect(await validate('browser', false)).to.equal(null);
    expect(await validate('browser', 'foo bar')).to.equal(null);
  });

  it('allows default CliUserConfig values', async function () {
    const userConfig = new CliUserConfig();
    for (const key of Object.keys(userConfig) as (keyof CliUserConfig)[]) {
      expect(
        await CliUserConfigValidator.validate(key, userConfig[key])
      ).to.equal(null);
    }
  });
});
