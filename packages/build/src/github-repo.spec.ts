import { GithubRepo } from './github-repo';
import { Octokit } from '@octokit/rest';
import { expect } from 'chai';
import sinon from 'ts-sinon' ;
import path from 'path';
import fs from 'fs';
import os from 'os';
import {
  zip,
  zipPath,
} from './zip';

describe('GithubRepo', () => {
  let githubRepo: GithubRepo;
  let octokit: Octokit;
  let repo;

  beforeEach(() => {
    octokit = new Octokit();

    repo = {
      owner: 'mongodb-js',
      repo: 'mongosh'
    };

    githubRepo = new GithubRepo(repo, octokit);
  });

  describe('shouldDoPublicRelease', () => {
    it('skips public release when branch is master', async() => {
      const config = { branch: 'master' };
      expect(await githubRepo.shouldDoPublicRelease(config)).to.be.false;
    });

    it('skips public release when there is no commit tag', async() => {
      const config = { branch: 'master', revision: 'cats' };
      expect(await githubRepo.shouldDoPublicRelease(config)).to.be.false;
    });

    it('skips public release when current version does not match commit tag', async() => {
      const config = { branch: 'master', revision: '169e0d00bc4153b5687551e44cdd259afded699b', version: '0.0.4' };
      expect(await githubRepo.shouldDoPublicRelease(config)).to.be.false;
    });

    it('publishes when version matches commit tag', async() => {
      const config = { branch: 'master', revision: '169e0d00bc4153b5687551e44cdd259afded699b', version: '0.0.6' };
      expect(await githubRepo.shouldDoPublicRelease(config)).to.be.true;
    });
  });

  describe('getTagByCommitSha', () => {
    it('returns tag info for a commit that has a tag', async() => {
      const taggedCommit = '169e0d00bc4153b5687551e44cdd259afded699b';
      expect(
        await githubRepo.getTagByCommitSha(taggedCommit)
      ).to.haveOwnProperty('name', 'v0.0.6');
    });

    it('returns undefined for a commit that does not have a tag', async() => {
      const nonTaggedCommit = '5888211d6f80228b9cfbcb11bce9dafa16a5dc9d';
      expect(
        await githubRepo.getTagByCommitSha(nonTaggedCommit)
      ).to.be.undefined;
    });
  });

  describe('releaseToGithub', () => {
    const platform = os.platform();
    const version = '1.0.0';
    const expectedZip = zipPath(__dirname, platform, version);
    const inputFile = path.join(__dirname, '..', 'examples', 'input.js');

    after((done) => {
      fs.unlink(expectedZip, done);
    });

    it('calls createRelease when running releaseToGithub', async() => {
      githubRepo.createRelease = sinon.stub().resolves();
      githubRepo.uploadReleaseAsset = sinon.stub().resolves();

      const zipFile = await zip(inputFile, __dirname, platform, version);

      githubRepo.releaseToGithub(zipFile, { version: '0.0.6' })
      expect(githubRepo.createRelease).to.have.been.called;
    });
  });
});
