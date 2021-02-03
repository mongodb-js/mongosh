import { expect } from 'chai';
import path from 'path';
import sinon, { SinonStub } from 'sinon';
import {
  bumpNpmPackages,
  listNpmPackages,
  markBumpedFilesAsAssumeUnchanged,
  publishNpmPackages,
  spawnSync,
  LernaPackageDescription
} from './npm-packages';


describe('npm-packages', () => {
  describe('spawnSync', () => {
    it('works for a valid command', () => {
      const result = spawnSync('bash', ['-c', 'echo -n works'], { encoding: 'utf8' });
      expect(result.status).to.equal(0);
      expect(result.stdout).to.equal('works');
    });

    it('throws on ENOENT error', () => {
      try {
        spawnSync('notaprogram', [], { encoding: 'utf8' });
      } catch (e) {
        return expect(e).to.not.be.undefined;
      }
      expect.fail('Expected error');
    });

    it('throws on non-zero exit code', () => {
      try {
        spawnSync('bash', ['-c', 'exit 1'], { encoding: 'utf8' });
      } catch (e) {
        return expect(e).to.not.be.undefined;
      }
      expect.fail('Expected error');
    });

    it('ignores errors when asked to for ENOENT', () => {
      const result = spawnSync('notaprogram', [], { encoding: 'utf8' }, true);
      expect(result).to.not.be.undefined;
    });

    it('ignores errors when asked to for non-zero exit code', () => {
      const result = spawnSync('bash', ['-c', 'exit 1'], { encoding: 'utf8' }, true);
      expect(result).to.not.be.undefined;
      expect(result?.status).to.equal(1);
    });
  });

  describe('bumpNpmPackages', () => {
    let spawnSync: SinonStub;

    beforeEach(() => {
      spawnSync = sinon.stub();
    });

    it('does not do anything if no version or placeholder version is specified', () => {
      bumpNpmPackages('', spawnSync);
      bumpNpmPackages('0.0.0-dev.0', spawnSync);
      expect(spawnSync).to.not.have.been.called;
    });

    it('calls lerna to bump package version', () => {
      const lernaBin = path.resolve(__dirname, '..', '..', '..', 'node_modules', '.bin', 'lerna');
      bumpNpmPackages('0.7.0', spawnSync);
      expect(spawnSync).to.have.been.calledWith(
        lernaBin,
        ['version', '0.7.0', '--no-changelog', '--no-push', '--exact', '--no-git-tag-version', '--force-publish', '--yes'],
        sinon.match.any
      );
      expect(spawnSync).to.have.been.calledWith(
        'git',
        ['status', '--porcelain'],
        sinon.match.any
      );
    });
  });

  describe('publishNpmPackages', () => {
    let listNpmPackages: SinonStub;
    let markBumpedFilesAsAssumeUnchanged: SinonStub;
    let spawnSync: SinonStub;

    beforeEach(() => {
      listNpmPackages = sinon.stub();
      markBumpedFilesAsAssumeUnchanged = sinon.stub();
      spawnSync = sinon.stub();
    });

    it('fails if packages have different versions', () => {
      listNpmPackages.returns([
        { name: 'packageA', version: '0.0.1' },
        { name: 'packageB', version: '0.0.2' }
      ]);
      try {
        publishNpmPackages(
          listNpmPackages,
          markBumpedFilesAsAssumeUnchanged,
          spawnSync
        );
      } catch (e) {
        expect(markBumpedFilesAsAssumeUnchanged).to.not.have.been.called;
        expect(spawnSync).to.not.have.been.called;
        return;
      }
      expect.fail('Expected error');
    });

    it('fails if packages have placeholder versions', () => {
      listNpmPackages.returns([
        { name: 'packageA', version: '0.0.0-dev.0' },
        { name: 'packageB', version: '0.0.0-dev.0' }
      ]);
      try {
        publishNpmPackages(
          listNpmPackages,
          markBumpedFilesAsAssumeUnchanged,
          spawnSync
        );
      } catch (e) {
        expect(markBumpedFilesAsAssumeUnchanged).to.not.have.been.called;
        expect(spawnSync).to.not.have.been.called;
        return;
      }
      expect.fail('Expected error');
    });

    it('calls lerna to publish packages for a real version', () => {
      const lernaBin = path.resolve(__dirname, '..', '..', '..', 'node_modules', '.bin', 'lerna');
      const packages = [
        { name: 'packageA', version: '0.7.0' }
      ];
      listNpmPackages.returns(packages);

      publishNpmPackages(
        listNpmPackages,
        markBumpedFilesAsAssumeUnchanged,
        spawnSync
      );

      expect(markBumpedFilesAsAssumeUnchanged).to.have.been.calledWith(packages, true);
      expect(spawnSync).to.have.been.calledWith(
        lernaBin,
        ['publish', 'from-package', '--no-changelog', '--no-push', '--exact', '--no-git-tag-version', '--force-publish', '--yes'],
        sinon.match.any
      );
      expect(markBumpedFilesAsAssumeUnchanged).to.have.been.calledWith(packages, false);
    });

    it('reverts the assume unchanged even on spawn failure', () => {
      const packages = [
        { name: 'packageA', version: '0.7.0' }
      ];
      listNpmPackages.returns(packages);
      spawnSync.throws(new Error('meeep'));

      try {
        publishNpmPackages(
          listNpmPackages,
          markBumpedFilesAsAssumeUnchanged,
          spawnSync
        );
      } catch (e) {
        expect(markBumpedFilesAsAssumeUnchanged).to.have.been.calledWith(packages, true);
        expect(spawnSync).to.have.been.called;
        expect(markBumpedFilesAsAssumeUnchanged).to.have.been.calledWith(packages, false);
        return;
      }
      expect.fail('Expected error');
    });
  });

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
        path.resolve(__dirname, '..', '..', '..', 'lerna.json')
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
