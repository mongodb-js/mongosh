import { expect } from 'chai';
import path from 'path';
import sinon, { SinonStub } from 'sinon';
import { LernaPackageDescription, listNpmPackages } from './list';
import { markBumpedFilesAsAssumeUnchanged } from './publish';

describe('npm-packages list', () => {
  describe('listNpmPackages', () => {
    it('lists packages', () => {
      const packages = listNpmPackages();
      expect(packages.length).to.be.greaterThan(1);
      for (const { name, version } of packages) {
        expect(name).to.be.a('string');
        expect(version).to.be.a('string');
      }
    });
  });


  describe('markBumpedFilesAsAssumeUnchanged', () => {
    let packages: LernaPackageDescription[];
    let expectedFiles: string[];
    let spawnSync: SinonStub;

    beforeEach(() => {
      expectedFiles = [
        path.resolve(__dirname, '..', '..', '..', '..', 'lerna.json')
      ];
      packages = listNpmPackages();
      packages.forEach(({ location }) => {
        expectedFiles.push(path.resolve(location, 'package.json'));
        expectedFiles.push(path.resolve(location, 'package-lock.json'));
      });

      spawnSync = sinon.stub();
    });

    it('marks files with --assume-unchanged', () => {
      markBumpedFilesAsAssumeUnchanged(packages, true, spawnSync);
      expectedFiles.forEach(f => {
        expect(spawnSync).to.have.been.calledWith(
          'git', ['update-index', '--assume-unchanged', f], sinon.match.any
        );
      });
    });

    it('marks files with --no-assume-unchanged', () => {
      markBumpedFilesAsAssumeUnchanged(packages, false, spawnSync);
      expectedFiles.forEach(f => {
        expect(spawnSync).to.have.been.calledWith(
          'git', ['update-index', '--no-assume-unchanged', f], sinon.match.any
        );
      });
    });
  });
});
