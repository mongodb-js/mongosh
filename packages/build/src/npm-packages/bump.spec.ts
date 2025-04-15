import { expect } from 'chai';
import type { SinonStub } from 'sinon';
import sinon from 'sinon';
import { PackageBumper } from './bump';
import { promises as fs } from 'fs';
import path from 'path';
import { PROJECT_ROOT } from './constants';

describe('PackageBumper', function () {
  let fsWriteFile: SinonStub;
  const shellApiSrc = path.join(
    PROJECT_ROOT,
    'packages',
    'shell-api',
    'src',
    'mongosh-version.ts'
  );

  let testBumper: PackageBumper;
  let getPackagesInTopologicalOrder: sinon.SinonStub;

  beforeEach(function () {
    fsWriteFile = sinon.stub(fs, 'writeFile');
    fsWriteFile.resolves();

    const spawnSync = sinon.stub();
    spawnSync.resolves();

    getPackagesInTopologicalOrder = sinon.stub();

    testBumper = new PackageBumper({
      spawnSync,
      getPackagesInTopologicalOrder,
    });
  });

  afterEach(function () {
    sinon.restore();
  });

  describe('bumpMongoshReleasePackages', function () {
    let fsReadFile: SinonStub;
    beforeEach(function () {
      fsReadFile = sinon.stub(fs, 'readFile');
    });

    it('warns and does not run if version is not set', async function () {
      const consoleWarnSpy = sinon.spy(console, 'warn');
      await testBumper.bumpMongoshReleasePackages('');
      expect(consoleWarnSpy).calledOnceWith(
        'mongosh: Release version not specified. Skipping mongosh bump.'
      );
      expect(fsReadFile).not.called;
      expect(fsWriteFile).not.called;
      consoleWarnSpy.restore();
    });

    it('bumps only mongosh packages', async function () {
      const mongoshPath = path.join(PROJECT_ROOT, 'packages', 'mongosh');
      const autocompletePath = path.join(
        PROJECT_ROOT,
        'packages',
        'autocomplete'
      );

      const rootProjectJson = path.join(PROJECT_ROOT, 'package.json');
      const mongoshProjectJson = path.join(mongoshPath, 'package.json');
      const autocompleteProjectJson = path.join(
        autocompletePath,
        'package.json'
      );
      const mockPackageJson = [
        [
          rootProjectJson,
          {
            name: 'mongosh',
            devDependencies: {
              mongosh: '0.1.2',
              '@mongosh/cli-repl': '0.1.2',
              '@mongosh/autocomplete': '1.2.3',
            },
          },
        ],
        [
          mongoshProjectJson,
          {
            name: 'mongosh',
            version: '0.1.2',
            devDependencies: {
              '@mongosh/cli-repl': '9.9.9',
              '@mongosh/autocomplete': '1.2.3',
            },
          },
        ],
        [
          autocompleteProjectJson,
          {
            name: '@mongosh/autocomplete',
            version: '1.2.3',
            devDependencies: {
              '@mongosh/cli-repl': '0.1.2',
              '@mongosh/config': '3.3.3',
            },
          },
        ],
      ];

      fsReadFile.throws('Unknown file');
      for (const [file, json] of mockPackageJson) {
        fsReadFile.withArgs(file, 'utf8').resolves(JSON.stringify(json));
      }

      getPackagesInTopologicalOrder.resolves([
        { name: 'mongosh', location: mongoshPath },
        { name: '@mongosh/autocomplete', location: autocompletePath },
      ]);

      sinon.stub(testBumper, 'updateShellApiMongoshVersion').resolves();

      await testBumper.bumpMongoshReleasePackages('9.9.9');
      expect(fsWriteFile).callCount(3);

      expect(
        JSON.parse(
          fsWriteFile.withArgs(rootProjectJson).firstCall.args[1] as string
        )
      ).deep.equals({
        name: 'mongosh',
        devDependencies: {
          mongosh: '9.9.9',
          '@mongosh/cli-repl': '9.9.9',
          '@mongosh/autocomplete': '1.2.3',
        },
      });

      expect(
        JSON.parse(
          fsWriteFile.withArgs(mongoshProjectJson).firstCall.args[1] as string
        )
      ).deep.equals({
        name: 'mongosh',
        version: '9.9.9',
        devDependencies: {
          '@mongosh/cli-repl': '9.9.9',
          '@mongosh/autocomplete': '1.2.3',
        },
      });

      expect(
        JSON.parse(
          fsWriteFile.withArgs(autocompleteProjectJson).firstCall
            .args[1] as string
        )
      ).deep.equals({
        name: '@mongosh/autocomplete',
        version: '1.2.3',
        devDependencies: {
          '@mongosh/cli-repl': '9.9.9',
          '@mongosh/config': '3.3.3',
        },
      });
    });
  });

  describe('updateShellApiMongoshVersion', function () {
    let fsReadFile: SinonStub;
    beforeEach(function () {
      fsReadFile = sinon.stub(fs, 'readFile');
    });

    it('updates the file to the set version', async function () {
      fsReadFile.resolves(`
    /** Current mongosh cli-repl version. */
    export const MONGOSH_VERSION = '2.3.8';`);

      const newVersion = '3.0.0';
      await testBumper.updateShellApiMongoshVersion(newVersion);

      expect(fsWriteFile).calledWith(
        shellApiSrc,
        `
    /** Current mongosh cli-repl version. */
    export const MONGOSH_VERSION = '${newVersion}';`,
        'utf-8'
      );
    });
  });
});
