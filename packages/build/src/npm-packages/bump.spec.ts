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
    it('warns and does not run if version is not set', async function () {
      const consoleWarnSpy = sinon.spy(console, 'warn');
      await bumpMongoshReleasePackages('');
      expect(consoleWarnSpy).calledOnceWith(
        'mongosh: Release version not specified. Skipping mongosh bump.'
      );
      expect(fsReadFile).not.called;
      expect(fsWriteFile).not.called;
      consoleWarnSpy.restore();
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
