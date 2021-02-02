import { expect } from 'chai';
import sinon, { SinonStub } from 'sinon';
import { listNpmPackages, markBumpedFilesAsAssumeUnchanged, spawnSync } from './npm-packages';


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
    let packages: { name: string; version: string }[];
    let expectedFiles: string[];
    let spawnSync: SinonStub;

    beforeEach(() => {
      expectedFiles = ['.npmrc', 'lerna.json'];
      packages = listNpmPackages();
      packages.forEach(({ name }) => {
        expectedFiles.push(`packages/${name}/package.json`);
        expectedFiles.push(`packages/${name}/package-lock.json`);
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
