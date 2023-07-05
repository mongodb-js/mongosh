import { expect } from 'chai';
import { promises as fs } from 'fs';
import path from 'path';
import rimraf from 'rimraf';
import { promisify } from 'util';
import { downloadArtifactFromEvergreen } from './artifacts';

describe('evergreen artifacts', function () {
  describe('downloadArtifactFromEvergreen', function () {
    let tmpDir: string;

    before(async function () {
      tmpDir = path.join(__dirname, `tmp-${Date.now()}`);
      await fs.mkdir(tmpDir, { recursive: true });
    });

    after(async function () {
      await promisify(rimraf)(tmpDir);
    });

    it('fails for a non-existing file', async function () {
      try {
        await downloadArtifactFromEvergreen('nope', 'mongosh', 'wrong', tmpDir);
      } catch (e: any) {
        return expect(e).to.not.be.undefined;
      }
      expect.fail('Expected error');
    });
  });
});
