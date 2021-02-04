import { expect } from 'chai';
import { promises as fs } from 'fs';
import os from 'os';
import * as path from 'path';
import sinon from 'ts-sinon';
import { GithubRepo } from './github-repo';

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
  describe('getMostRecentDraftTag', () => {
    it('returns undefined if the release version is undefined or empty', async() => {
      expect(
        await githubRepo.getMostRecentDraftTagForRelease('')
      ).to.be.undefined;

      expect(
        await githubRepo.getMostRecentDraftTagForRelease(undefined)
      ).to.be.undefined;
    });

    it('returns undefined if there is no matching tag', async() => {
      githubRepo = getTestGithubRepo({
        paginate: sinon.stub().resolves([
          { name: 'v0.0.6', commit: { sha: 'sha-1' } },
          { name: 'v0.0.3-draft.0', commit: { sha: 'sha-2' } },
          { name: 'v0.0.3-draft.1', commit: { sha: 'sha-3' } },
          { name: 'v0.1.3-draft.8', commit: { sha: 'sha-4' } },
        ])
      });

      expect(
        await githubRepo.getMostRecentDraftTagForRelease('0.0.7')
      ).to.be.undefined;
    });

    it('returns the latest draft for a release version if there are multiple', async() => {
      githubRepo = getTestGithubRepo({
        paginate: sinon.stub().resolves([
          { name: 'v0.0.6', commit: { sha: 'sha-1' } },
          { name: 'v0.0.30', commit: { sha: 'sha-2' } },
          { name: 'v0.0.30-draft.12', commit: { sha: 'sha-3' } },
          { name: 'v0.0.3-draft.11', commit: { sha: 'sha-4' } },
          { name: 'v0.0.3-draft.2', commit: { sha: 'sha-5' } },
          { name: 'v0.1.3-draft.0', commit: { sha: 'sha-6' } },
        ])
      });

      expect(
        await githubRepo.getMostRecentDraftTagForRelease('0.0.3')
      ).to.deep.equal({ name: 'v0.0.3-draft.11', sha: 'sha-4' });
    });

    it('returns the draft for a release version if there is only one draft', async() => {
      githubRepo = getTestGithubRepo({
        paginate: sinon.stub().resolves([
          { name: 'v0.0.6', commit: { sha: 'sha-1' } },
          { name: 'v0.0.30', commit: { sha: 'sha-2' } },
          { name: 'v0.0.30-draft.11', commit: { sha: 'sha-3' } },
          { name: 'v0.0.3-draft.11', commit: { sha: 'sha-4' } },
          { name: 'v0.0.3-draft.2', commit: { sha: 'sha-5' } },
          { name: 'v0.1.3-draft.0', commit: { sha: 'sha-6' } },
          { name: 'v0.1.3-test', commit: { sha: 'sha-7' } },
        ])
      });

      expect(
        await githubRepo.getMostRecentDraftTagForRelease('0.1.3')
      ).to.deep.equal({ name: 'v0.1.3-draft.0', sha: 'sha-6' });
    });
  });

  describe('releaseToGithub', () => {
    const platform = os.platform();
    const dummyTarballPath = path.join(__dirname, `mongosh_1.0.0_${platform}.zip`);
    const tarballFile = { path: dummyTarballPath, contentType: 'application/zip' };

    before(async() => {
      await fs.writeFile(dummyTarballPath, 'not a real tarball but 🤷‍♀️');
    });

    after(async() => {
      await fs.unlink(dummyTarballPath);
    });

    it('calls createDraftRelease when running releaseToGithub', async() => {
      githubRepo.getReleaseByTag = sinon.stub().resolves();
      githubRepo.createDraftRelease = sinon.stub().resolves();
      githubRepo.uploadReleaseAsset = sinon.stub().resolves();

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

  describe('createBranch', () => {
    let octokit: any;
    let getRef: sinon.SinonStub;
    let createRef: sinon.SinonStub;

    beforeEach(() => {
      getRef = sinon.stub().rejects();
      createRef = sinon.stub().rejects();
      octokit = {
        git: {
          getRef, createRef
        }
      };
      githubRepo = getTestGithubRepo(octokit);
    });

    it('creates the branch based on the given base', async() => {
      getRef.withArgs({
        ...githubRepo.repo,
        ref: 'heads/base'
      }).resolves({
        data: {
          object: {
            sha: 'sha'
          }
        }
      });

      createRef.withArgs({
        ...githubRepo.repo,
        ref: 'refs/heads/newBranch',
        sha: 'sha'
      }).resolves();

      await githubRepo.createBranch('newBranch', 'base');
      expect(getRef).to.have.been.called;
      expect(createRef).to.have.been.called;
    });
  });

  describe('deleteBranch', () => {
    let octokit: any;
    let deleteRef: sinon.SinonStub;

    beforeEach(() => {
      deleteRef = sinon.stub().rejects();
      octokit = {
        git: {
          deleteRef
        }
      };
      githubRepo = getTestGithubRepo(octokit);
    });

    it('deletes the branch', async() => {
      deleteRef.withArgs({
        ...githubRepo.repo,
        ref: 'heads/branch'
      }).resolves();

      await githubRepo.deleteBranch('branch');
      expect(deleteRef).to.have.been.called;
    });
  });

  describe('getFileContent', () => {
    let octokit: any;
    let getContents: sinon.SinonStub;

    beforeEach(() => {
      getContents = sinon.stub();
      getContents.rejects();

      octokit = {
        repos: {
          getContents
        }
      };
      githubRepo = getTestGithubRepo(octokit);
    });

    it('loads the file content and decodes it', async() => {
      getContents.withArgs({
        ...githubRepo.repo,
        path: 'file/path',
        ref: 'branch'
      }).resolves({
        data: {
          type: 'file',
          encoding: 'base64',
          content: Buffer.from('🎉', 'utf-8').toString('base64'),
          sha: 'sha'
        }
      });

      const result = await githubRepo.getFileContent('file/path', 'branch');
      expect(result.content).to.equal('🎉');
      expect(result.blobSha).to.equal('sha');
    });

    it('fails when data type is not file', async() => {
      getContents.withArgs({
        ...githubRepo.repo,
        path: 'file/path',
        ref: 'branch'
      }).resolves({
        data: {
          type: 'directory'
        }
      });

      try {
        await githubRepo.getFileContent('file/path', 'branch');
      } catch (e) {
        return expect(e.message).to.equal('file/path does not reference a file');
      }
      expect.fail('expected error');
    });

    it('fails when data encoding is not base64', async() => {
      getContents.withArgs({
        ...githubRepo.repo,
        path: 'file/path',
        ref: 'branch'
      }).resolves({
        data: {
          type: 'file',
          encoding: 'whatever'
        }
      });

      try {
        await githubRepo.getFileContent('file/path', 'branch');
      } catch (e) {
        return expect(e.message).to.equal('Octokit returned unexpected encoding: whatever');
      }
      expect.fail('expected error');
    });
  });

  describe('commitFileUpdate', () => {
    let octokit: any;
    let createOrUpdateFile: sinon.SinonStub;

    beforeEach(() => {
      createOrUpdateFile = sinon.stub();
      createOrUpdateFile.rejects();

      octokit = {
        repos: {
          createOrUpdateFile
        }
      };
      githubRepo = getTestGithubRepo(octokit);
    });

    it('commits the file with new content', async() => {
      createOrUpdateFile.withArgs({
        ...githubRepo.repo,
        message: 'Commit Message',
        content: Buffer.from('🎉', 'utf-8').toString('base64'),
        path: 'file/path',
        sha: 'base',
        branch: 'branch'
      }).resolves({
        data: {
          content: {
            sha: 'contentSha'
          },
          commit: {
            sha: 'commitSha'
          }
        }
      });

      const result = await githubRepo.commitFileUpdate('Commit Message', 'base', 'file/path', '🎉', 'branch');
      expect(result.blobSha).to.equal('contentSha');
      expect(result.commitSha).to.equal('commitSha');
    });
  });

  describe('createPullRequest', () => {
    let octokit: any;
    let createPullRequest: sinon.SinonStub;

    beforeEach(() => {
      createPullRequest = sinon.stub();
      createPullRequest.rejects();

      octokit = {
        pulls: {
          create: createPullRequest
        }
      };
      githubRepo = getTestGithubRepo(octokit);
    });

    it('creates a proper PR', async() => {
      createPullRequest.withArgs({
        ...githubRepo.repo,
        base: 'toBase',
        head: 'fromBranch',
        title: 'PR'
      }).resolves({
        data: {
          number: 42,
          html_url: 'url'
        }
      });

      const result = await githubRepo.createPullRequest('PR', 'fromBranch', 'toBase');
      expect(result.prNumber).to.equal(42);
      expect(result.url).to.equal('url');
    });
  });

  describe('mergePullRequest', () => {
    let octokit: any;
    let mergePullRequest: sinon.SinonStub;

    beforeEach(() => {
      mergePullRequest = sinon.stub();
      mergePullRequest.rejects();

      octokit = {
        pulls: {
          merge: mergePullRequest
        }
      };
      githubRepo = getTestGithubRepo(octokit);
    });

    it('creates a proper PR', async() => {
      mergePullRequest.withArgs({
        ...githubRepo.repo,
        pull_number: 42
      }).resolves();

      await githubRepo.mergePullRequest(42);
    });
  });
});
