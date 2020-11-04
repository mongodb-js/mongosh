import { expect } from 'chai';
import { createAnalyticsConfig } from './analytics';

describe('analytics module', () => {
  describe('.createAnalyticsConfig', () => {
    let config: string;

    before(() => {
      config = createAnalyticsConfig('key');
    });

    it('returns the string with the segment key injected', () => {
      expect(config).to.include('SEGMENT_API_KEY: "key"');
    });
  });
});
