import chai, { expect } from 'chai';
import type { SinonStub } from 'sinon';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import { promises as fs } from 'fs';
import {
  generateShrinkwrap,
  generateShrinkwrapForReleasePackages,
} from './generate-shrinkwrap';
import * as spawnSyncModule from '../helpers/spawn-sync';

chai.use(sinonChai);

describe('generate-shrinkwrap', function () {
  let fsReadFile: SinonStub;
  let fsWriteFile: SinonStub;
  let fsRm: SinonStub;
  let spawnSyncStub: SinonStub;
  const tmpDir = '/tmp/mongosh-shrinkwrap-test';

  const mockPackageJson = {
    name: '@mongosh/cli-repl',
    version: '2.0.0',
    license: 'Apache-2.0',
    dependencies: { 'dep-a': '^1.0.0', '@mongosh/some-pkg': '2.0.0' },
    bin: { mongosh: 'bin/mongosh.js' },
    engines: { node: '>=16' },
  };

  const mockPrunedLockfile = {
    name: '@mongosh/cli-repl',
    version: '2.0.0',
    lockfileVersion: 3,
    packages: {
      '': {
        name: '@mongosh/cli-repl',
        version: '2.0.0',
        dependencies: { 'dep-a': '^1.0.0', '@mongosh/some-pkg': '2.0.0' },
      },
      'node_modules/dep-a': {
        version: '1.2.3',
        resolved: 'https://registry.npmjs.org/dep-a/-/dep-a-1.2.3.tgz',
        integrity: 'sha512-abc123',
      },
      'node_modules/dev-only-pkg': {
        version: '3.0.0',
        dev: true,
      },
      'node_modules/@mongosh/some-pkg': {
        resolved: 'packages/some-pkg',
        link: true,
      },
      'packages/some-pkg': {
        version: '2.0.0',
        license: 'Apache-2.0',
        engines: { node: '>=16' },
        dependencies: { 'dep-b': '^2.0.0' },
        peerDependencies: { bson: '^6.0.0' },
        peerDependenciesMeta: { bson: { optional: true } },
      },
      'configs/tsconfig': { version: '1.0.0' },
    },
  };

  const mockRootLockfile = {
    name: 'mongosh-monorepo',
    version: '0.0.0',
    lockfileVersion: 3,
    packages: { '': { name: 'mongosh-monorepo', version: '0.0.0' } },
  };

  beforeEach(function () {
    fsReadFile = sinon.stub(fs, 'readFile');
    fsWriteFile = sinon.stub(fs, 'writeFile').resolves();
    sinon.stub(fs, 'mkdtemp').resolves(tmpDir);
    fsRm = sinon.stub(fs, 'rm').resolves();
    spawnSyncStub = sinon.stub(spawnSyncModule, 'spawnSync');
    fsReadFile.onFirstCall().resolves(JSON.stringify(mockRootLockfile));
    fsReadFile.onSecondCall().resolves(JSON.stringify(mockPackageJson));
    fsReadFile.onThirdCall().resolves(JSON.stringify(mockPrunedLockfile));
  });

  afterEach(function () {
    sinon.restore();
  });

  function getShrinkwrapOutput(): any {
    const call = fsWriteFile
      .getCalls()
      .find((c: sinon.SinonSpyCall) =>
        String(c.args[0]).includes('npm-shrinkwrap.json')
      );
    expect(call).to.exist;
    return JSON.parse(call!.args[1] as string);
  }

  describe('generateShrinkwrap', function () {
    it('runs npm install --package-lock-only in temp dir', async function () {
      await generateShrinkwrap('/project/packages/cli-repl', '/project');
      expect(spawnSyncStub).to.have.been.calledOnceWith(
        'npm',
        ['install', '--package-lock-only', '--ignore-scripts'],
        sinon.match({ cwd: tmpDir })
      );
    });

    it('removes dev-only entries', async function () {
      await generateShrinkwrap('/project/packages/cli-repl', '/project');
      expect(getShrinkwrapOutput().packages).to.not.have.property(
        'node_modules/dev-only-pkg'
      );
    });

    it('removes workspace path entries', async function () {
      await generateShrinkwrap('/project/packages/cli-repl', '/project');
      const pkgs = getShrinkwrapOutput().packages;
      expect(pkgs).to.not.have.property('packages/some-pkg');
      expect(pkgs).to.not.have.property('configs/tsconfig');
    });

    it('converts workspace links to registry-compatible entries', async function () {
      await generateShrinkwrap('/project/packages/cli-repl', '/project');
      const converted =
        getShrinkwrapOutput().packages['node_modules/@mongosh/some-pkg'];
      expect(converted).to.deep.equal({
        version: '2.0.0',
        license: 'Apache-2.0',
        engines: { node: '>=16' },
        dependencies: { 'dep-b': '^2.0.0' },
        peerDependencies: { bson: '^6.0.0' },
        peerDependenciesMeta: { bson: { optional: true } },
      });
    });

    it('keeps regular production dependencies', async function () {
      await generateShrinkwrap('/project/packages/cli-repl', '/project');
      expect(
        getShrinkwrapOutput().packages['node_modules/dep-a']
      ).to.deep.equal({
        version: '1.2.3',
        resolved: 'https://registry.npmjs.org/dep-a/-/dep-a-1.2.3.tgz',
        integrity: 'sha512-abc123',
      });
    });

    it('writes correct top-level shrinkwrap fields', async function () {
      await generateShrinkwrap('/project/packages/cli-repl', '/project');
      const sw = getShrinkwrapOutput();
      expect(sw.name).to.equal('@mongosh/cli-repl');
      expect(sw.version).to.equal('2.0.0');
      expect(sw.lockfileVersion).to.equal(3);
      expect(sw.requires).to.equal(true);
    });

    it('cleans up temp directory', async function () {
      await generateShrinkwrap('/project/packages/cli-repl', '/project');
      expect(fsRm).to.have.been.calledOnceWith(tmpDir, {
        recursive: true,
        force: true,
      });
    });

    it('cleans up temp directory even on error', async function () {
      spawnSyncStub.throws(new Error('npm failed'));
      try {
        await generateShrinkwrap('/project/packages/cli-repl', '/project');
      } catch {
        // expected
      }
      expect(fsRm).to.have.been.calledOnceWith(tmpDir, {
        recursive: true,
        force: true,
      });
    });
  });

  describe('generateShrinkwrapForReleasePackages', function () {
    it('generates shrinkwrap for each release package', async function () {
      fsReadFile.reset();
      for (let i = 0; i < 2; i++) {
        fsReadFile.onCall(i * 3).resolves(JSON.stringify(mockRootLockfile));
        fsReadFile.onCall(i * 3 + 1).resolves(JSON.stringify(mockPackageJson));
        fsReadFile
          .onCall(i * 3 + 2)
          .resolves(JSON.stringify(mockPrunedLockfile));
      }

      await generateShrinkwrapForReleasePackages('/project');

      expect(spawnSyncStub).to.have.been.calledTwice;
      const shrinkwrapWrites = fsWriteFile
        .getCalls()
        .filter((c: sinon.SinonSpyCall) =>
          String(c.args[0]).includes('npm-shrinkwrap.json')
        );
      expect(shrinkwrapWrites).to.have.length(2);
      expect(String(shrinkwrapWrites[0].args[0])).to.include(
        'packages/mongosh/npm-shrinkwrap.json'
      );
      expect(String(shrinkwrapWrites[1].args[0])).to.include(
        'packages/cli-repl/npm-shrinkwrap.json'
      );
    });
  });
});
