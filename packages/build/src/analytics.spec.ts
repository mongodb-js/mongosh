import { expect } from 'chai';
import { promises as fs } from 'fs';
import * as path from 'path';
import rimraf from 'rimraf';
import { promisify } from 'util';
import { createAnalyticsConfig, writeAnalyticsConfig } from './analytics';

describe('analytics', () => {
  describe('createAnalyticsConfig', () => {
    let config: string;

    before(() => {
      config = createAnalyticsConfig('key');
    });

    it('returns the string with the segment key injected', () => {
      expect(config).to.include('SEGMENT_API_KEY: "key"');
    });
  });

  describe('writeAnalyticsConfig', () => {
    const tmpdir = path.resolve(
      __dirname, '..', '..', 'tmp', `test-build-${Date.now()}-${Math.random()}`
    );

    before(async() => {
      await fs.mkdir(tmpdir, { recursive: true });
    });
    after(async() => {
      await promisify(rimraf)(tmpdir);
    });

    it('writes the configuration', async() => {
      const file = path.join(tmpdir, 'analytics.js');
      await writeAnalyticsConfig(
        file,
        'key'
      );
      const content = await fs.readFile(file);
      expect(content.toString('utf8')).to.equal('module.exports = { SEGMENT_API_KEY: "key" };');
    });

    it('fails when file path is missing', async() => {
      try {
        await writeAnalyticsConfig(
          '', 'key'
        );
      } catch (e) {
        return expect(e.message).to.contain('path is required');
      }
      expect.fail('Expected error');
    });

    it('fails when key is missing', async() => {
      try {
        await writeAnalyticsConfig(
          'somepath', ''
        );
      } catch (e) {
        return expect(e.message).to.contain('Segment key is required');
      }
      expect.fail('Expected error');
    });
  });
});
