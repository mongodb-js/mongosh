import { expect } from 'chai';
import type { Config } from './config';
import { redactConfig } from './redact-config';

describe('config redact-config', function () {
  const redactedKeys: Array<keyof Config> = [
    'evgAwsKey',
    'evgAwsSecret',
    'downloadCenterAwsKeyConfig',
    'downloadCenterAwsSecretConfig',
    'downloadCenterAwsKeyArtifacts',
    'downloadCenterAwsSecretArtifacts',
    'downloadCenterAwsSessionTokenArtifacts',
    'githubToken',
  ];

  const config: Config = {} as Config;

  beforeEach(function () {
    redactedKeys.forEach((k) => {
      (config as any)[k] = 'asecret';
    });
  });

  redactedKeys.forEach((k) => {
    it(`removes ${k} from the config`, function () {
      const redacted = redactConfig(config);
      expect(redacted[k]).to.be.undefined;
    });
  });
});
