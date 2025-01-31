import { expect } from 'chai';
import type { SinonStub } from 'sinon';
import sinon from 'sinon';
import {
  bumpMongoshReleasePackages,
  updateShellApiMongoshVersion,
} from './bump';
import { promises as fs } from 'fs';
import path from 'path';
import { PROJECT_ROOT } from './constants';

describe('npm-packages bump', function () {
  let fsReadFile: SinonStub;
  let fsWriteFile: SinonStub;

  beforeEach(function () {
    fsReadFile = sinon.stub(fs, 'readFile');

    fsWriteFile = sinon.stub(fs, 'writeFile');
    fsWriteFile.resolves();
  });

  afterEach(function () {
    sinon.restore();
  });

  describe('bumpMongoshReleasePackages', function () {
    it('throws if version is not set', async function () {
      try {
        await bumpMongoshReleasePackages('');
        expect.fail('did not error');
      } catch (error) {
        expect(error).instanceOf(Error);
        expect((error as Error).message).equals(
          'version not specified during mongosh bump'
        );
      }
    });
  });

  describe('updateShellApiMongoshVersion', function () {
    it('updates the file to the set version', async function () {
      fsReadFile.resolves(`
    /** Current mongosh cli-repl version. */
    export const MONGOSH_VERSION = '2.3.8';`);

      const newVersion = '3.0.0';
      await updateShellApiMongoshVersion(newVersion);

      expect(fsWriteFile).calledWith(
        path.join(
          __dirname,
          PROJECT_ROOT,
          'packages',
          'shell-api',
          'src',
          'mongosh-version.ts'
        ),
        `
    /** Current mongosh cli-repl version. */
    export const MONGOSH_VERSION = '${newVersion}';`,
        'utf-8'
      );
    });
  });
});
