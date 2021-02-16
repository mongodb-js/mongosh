import { expect } from 'chai';
import sinon from 'sinon';
import { getRepositoryStatus } from './repository-status';

describe('local repository-status', () => {
  let spawnSync: sinon.SinonStub;

  beforeEach(() => {
    spawnSync = sinon.stub();
  });

  describe('getRepositoryStatus', () => {
    it('parses a clean repository correctly', () => {
      spawnSync.returns({
        stdout: '## master...origin/master\n'
      });
      spawnSync.onSecondCall().returns({
        stdout: 'Everything up-to-date'
      });

      const status = getRepositoryStatus('somePath', spawnSync);
      expect(status).to.deep.equal({
        branch: {
          local: 'master',
          tracking: 'origin/master',
          diverged: false
        },
        clean: true,
        hasUnpushedTags: false
      });
    });

    it('detectes pending file changes', () => {
      spawnSync.onFirstCall().returns({
        stdout: [
          '## master...origin/master',
          'A  packages/build/src/helpers/index.ts',
          'A  packages/build/src/helpers/spawn-sync.spec.ts',
          '?? packages/build/src/helpers/test',
        ].join('\n')
      });
      spawnSync.onSecondCall().returns({
        stdout: 'Everything up-to-date'
      });

      const status = getRepositoryStatus('somePath', spawnSync);
      expect(status).to.deep.equal({
        branch: {
          local: 'master',
          tracking: 'origin/master',
          diverged: false
        },
        clean: false,
        hasUnpushedTags: false
      });
    });

    it('detectes diverging branches', () => {
      spawnSync.returns({
        stdout: [
          '## master...origin/something [ahead 5, behind 3]',
          'A  packages/build/src/helpers/index.ts',
          'A  packages/build/src/helpers/spawn-sync.spec.ts',
          '?? packages/build/src/helpers/test',
        ].join('\n')
      });
      spawnSync.onSecondCall().returns({
        stdout: 'Everything up-to-date'
      });

      const status = getRepositoryStatus('somePath', spawnSync);
      expect(status).to.deep.equal({
        branch: {
          local: 'master',
          tracking: 'origin/something',
          diverged: true
        },
        clean: false,
        hasUnpushedTags: false
      });
    });

    it('detectes missing origin', () => {
      spawnSync.returns({
        stdout: [
          '## master'
        ].join('\n')
      });
      spawnSync.onSecondCall().returns({
        stdout: 'Everything up-to-date'
      });

      const status = getRepositoryStatus('somePath', spawnSync);
      expect(status).to.deep.equal({
        branch: {
          local: 'master',
          tracking: undefined,
          diverged: false
        },
        clean: true,
        hasUnpushedTags: false
      });
    });

    it('detects unpushed tags', () => {
      spawnSync.onFirstCall().returns({
        stdout: [
          '## master...origin/master'
        ].join('\n')
      });
      spawnSync.onSecondCall().returns({
        stdout: [
          'To github.com:mongodb-js/mongosh.git',
          '* [new tag]           vxxx -> vxxx'
        ].join('\n')
      });

      const status = getRepositoryStatus('somePath', spawnSync);
      expect(status).to.deep.equal({
        branch: {
          local: 'master',
          tracking: 'origin/master',
          diverged: false
        },
        clean: true,
        hasUnpushedTags: true
      });
    });
  });
});
