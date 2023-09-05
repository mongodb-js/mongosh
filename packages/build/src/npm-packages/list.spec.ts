import { expect } from 'chai';
import path from 'path';
import type { SinonStub } from 'sinon';
import sinon from 'sinon';
import type { LernaPackageDescription } from './list';
import { listNpmPackages } from './list';
import { markBumpedFilesAsAssumeUnchanged } from './publish';

describe('npm-packages list', function () {
  describe('listNpmPackages', function () {
    it('lists packages', function () {
      const packages = listNpmPackages();
      expect(packages.length).to.be.greaterThan(1);
      for (const { name, version } of packages) {
        expect(name).to.be.a('string');
        expect(version).to.be.a('string');
      }
    });
  });

  describe('markBumpedFilesAsAssumeUnchanged', function () {
    let packages: LernaPackageDescription[];
    let expectedFiles: string[];
    let spawnSync: SinonStub;

    beforeEach(function () {
      expectedFiles = [
        path.resolve(__dirname, '..', '..', '..', '..', 'lerna.json'),
        path.resolve(__dirname, '..', '..', '..', '..', 'package.json'),
        path.resolve(__dirname, '..', '..', '..', '..', 'package-lock.json'),
      ];
      packages = listNpmPackages();
      for (const { location } of packages) {
        expectedFiles.push(path.resolve(location, 'package.json'));
      }

      spawnSync = sinon.stub();
    });

    it('marks files with --assume-unchanged', function () {
      markBumpedFilesAsAssumeUnchanged(packages, true, spawnSync);
      expectedFiles.forEach((f) => {
        expect(spawnSync).to.have.been.calledWith(
          'git',
          ['update-index', '--assume-unchanged', f],
          sinon.match.any
        );
      });
    });

    it('marks files with --no-assume-unchanged', function () {
      markBumpedFilesAsAssumeUnchanged(packages, false, spawnSync);
      expectedFiles.forEach((f) => {
        expect(spawnSync).to.have.been.calledWith(
          'git',
          ['update-index', '--no-assume-unchanged', f],
          sinon.match.any
        );
      });
    });
  });
});
