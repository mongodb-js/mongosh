import { expect } from 'chai';
import { Config } from './config';
import { redactConfig } from './redact-config';

describe('config redact-config', () => {
  const redactedKeys: Array<keyof Config> = [
    'evgAwsKey',
    'evgAwsSecret',
    'downloadCenterAwsKey',
    'downloadCenterAwsSecret',
    'githubToken'
  ];

  const config: Config = {} as Config;

  beforeEach(() => {
    redactedKeys.forEach(k => {
      (config as any)[k] = 'asecret';
    });
  });

  redactedKeys.forEach(k => {
    it(`removes ${k} from the config`, () => {
      const redacted = redactConfig(config);
      expect(redacted[k]).to.be.undefined;
    });
  });
});
