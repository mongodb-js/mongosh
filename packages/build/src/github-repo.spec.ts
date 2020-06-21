import { expect } from 'chai';
import { Octokit } from '@octokit/rest';
import { GithubRepo } from './github-repo';

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
});
