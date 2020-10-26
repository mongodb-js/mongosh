/* eslint-disable camelcase */
import { GithubRepo } from './github-repo';
import { expect } from 'chai';
import sinon from 'ts-sinon';
import path from 'path';
import fs from 'fs';
import os from 'os';
import {
  createTarball,
  tarballPath,
} from './tarball';

function getTestGithubRepo(octokitStub: any = {}): GithubRepo {
  const repo = {
    owner: 'mongodb-js',
    repo: 'mongosh'
  };

  return new GithubRepo(repo, octokitStub);
}

describe('GithubRepo', () => {
  let githubRepo: GithubRepo;

  beforeEach(() => {
    githubRepo = getTestGithubRepo();
  });

  describe('shouldDoPublicRelease', () => {
    it('returns false when isPatch is true', async() => {
      const config = { isPatch: true };
      expect(await githubRepo.shouldDoPublicRelease(config as any)).to.be.false;
    });


    it('returns false when branch is not master', async() => {
      const config = { branch: 'feature' };
      expect(await githubRepo.shouldDoPublicRelease(config as any)).to.be.false;
    });

    it('returns false when branch is master but not tagged', async() => {
      githubRepo.getTagByCommitSha = sinon.stub().resolves();

      const config = { branch: 'master', revision: 'sha' };
      expect(await githubRepo.shouldDoPublicRelease(config as any)).to.be.false;
      expect(await githubRepo.getTagByCommitSha).to.have.been.calledWith('sha');
    });

    it('returns false when current version does not match commit tag', async() => {
      githubRepo.getTagByCommitSha = sinon.stub().resolves({ name: '0.0.3' });

      const config = { branch: 'master', revision: 'sha', version: '0.0.4' };
      expect(await githubRepo.shouldDoPublicRelease(config as any)).to.be.false;
    });

    it('returns true when version matches commit tag', async() => {
      githubRepo.getTagByCommitSha = sinon.stub().resolves({ name: '0.0.3' });

      const config = { branch: 'master', revision: 'sha', version: '0.0.3' };
      expect(await githubRepo.shouldDoPublicRelease(config as any)).to.be.true;
    });
  });

  describe('getTagByCommitSha', () => {
    it('returns tag info for a commit that has a tag', async() => {
      githubRepo = getTestGithubRepo({
        paginate: sinon.stub().resolves([{ name: 'v0.0.6', commit: { sha: 'sha' } }])
      });

      expect(
        await githubRepo.getTagByCommitSha('sha')
      ).to.haveOwnProperty('name', 'v0.0.6');
    });

    it('returns undefined for a commit that does not have a tag', async() => {
      githubRepo = getTestGithubRepo({
        paginate: sinon.stub().resolves([{ name: 'v0.0.6', commit: { sha: 'sha1' } }])
      });

      expect(
        await githubRepo.getTagByCommitSha('sha2')
      ).to.be.undefined;
    });
  });

  describe('releaseToGithub', () => {
    const platform = os.platform();
    const version = '1.0.0';
    const expectedTarball = tarballPath(__dirname, platform, version);
    const inputFile = path.join(__dirname, '..', 'examples', 'input.js');
    const rootDir = path.join(__dirname, '../../..');

    after((done) => {
      fs.unlink(expectedTarball, done);
    });

    it('calls createDraftRelease when running releaseToGithub', async() => {
      githubRepo.getReleaseByTag = sinon.stub().resolves();
      githubRepo.createDraftRelease = sinon.stub().resolves();
      githubRepo.uploadReleaseAsset = sinon.stub().resolves();

      const tarballFile = await createTarball(inputFile, __dirname, platform, version, rootDir);

      await githubRepo.releaseToGithub(tarballFile, { version: '0.0.6' } as any);
      expect(githubRepo.createDraftRelease).to.have.been.calledWith({
        name: '0.0.6',
        notes: 'Release notes [in Jira](https://jira.mongodb.org/issues/?jql=project%20%3D%20MONGOSH%20AND%20fixVersion%20%3D%200.0.6)',
        tag: 'v0.0.6'
      });
    });

    it('does not call createDraftRelease if the release already exists', async() => {
      githubRepo.getReleaseByTag = sinon.stub().resolves();
      githubRepo.createDraftRelease = sinon.stub().resolves();
      githubRepo.uploadReleaseAsset = sinon.stub().resolves();

      const tarballFile = await createTarball(inputFile, __dirname, platform, version, rootDir);

      await githubRepo.releaseToGithub(tarballFile, { version: '0.0.6' } as any);
      expect(githubRepo.createDraftRelease).to.have.been.calledWith({
        name: '0.0.6',
        notes: 'Release notes [in Jira](https://jira.mongodb.org/issues/?jql=project%20%3D%20MONGOSH%20AND%20fixVersion%20%3D%200.0.6)',
        tag: 'v0.0.6'
      });
    });
  });

  describe('promoteRelease', () => {
    describe('when release exists and is in draft', () => {
      let octokit: any;

      beforeEach(() => {
        octokit = {
          paginate: sinon.stub().resolves([{ id: '123', tag_name: 'v0.0.6', draft: true }]),
          repos: {
            updateRelease: sinon.stub().resolves()
          }
        };
        githubRepo = getTestGithubRepo(octokit);
      });

      it('finds the release corresponding to config.version and sets draft to false', async() => {
        await githubRepo.promoteRelease({ version: '0.0.6' } as any);

        expect(octokit.repos.updateRelease).to.have.been.calledWith({
          draft: false,
          owner: 'mongodb-js',
          // eslint-disable-next-line camelcase
          release_id: '123',
          repo: 'mongosh'
        });
      });
    });

    describe('when release exists but is not in draft', () => {
      let octokit: any;

      beforeEach(() => {
        octokit = {
          paginate: sinon.stub().resolves([{ id: '123', tag_name: 'v0.0.6', draft: false }]),
          repos: {
            updateRelease: sinon.stub().resolves()
          }
        };

        githubRepo = getTestGithubRepo(octokit);
      });

      it('does nothing', async() => {
        await githubRepo.promoteRelease({ version: '0.0.6' } as any);

        expect(octokit.repos.updateRelease).not.to.have.been.called;
      });
    });
  });
});
