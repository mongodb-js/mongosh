/* eslint-disable camelcase */
import { Octokit } from '@octokit/rest';
import fs from 'fs';
import path from 'path';
import semver from 'semver';
import util from 'util';
import Config from './config';
import { TarballFile } from './tarball';
const readFile = util.promisify(fs.readFile);

type Repo = {
  owner: string;
  repo: string;
};

type Release = {
  name: string;
  tag: string;
  notes: string;
};

type Asset = {
  path: string;
  contentType: string;
};

type Tag = {
  name: string;
};

type ReleaseDetails = {
  draft: boolean;
  upload_url: string;
  id: number;
};

export class GithubRepo {
  private octokit: Octokit;
  private repo: Repo;

  constructor(repo: Repo, octokit: Octokit) {
    this.octokit = octokit;
    this.repo = Object.freeze({ ...repo });
  }

  /**
   * Returns the first tag found for a given commit sha
   *
   * @param {string} sha
   * @returns {Promise<Tag>}
   * @memberof GithubRepo
   */
  async getTagByCommitSha(sha?: string): Promise<Tag | undefined> {
    if (!sha) {
      return undefined;
    }

    const tags = await this.octokit
      .paginate(
        'GET /repos/:owner/:repo/tags',
        this.repo,
      );

    return tags.find(({ commit }) => commit.sha === sha);
  }

  /**
   * Creates a release for a tag on Github, if the release exists
   * the operation fails silently.
   *
   * @param {Release} release
   * @returns {Promise<void>}
   * @memberof GithubRepo
   */
  async createDraftRelease(release: Release): Promise<void> {
    const params = {
      ...this.repo,
      tag_name: release.tag,
      name: release.name,
      body: release.notes,
      draft: true
    };

    await this.octokit.repos.createRelease(params)
      .catch(this._ignoreAlreadyExistsError);
  }

  /**
   * Uploads an asset for a Github release, if the assets already exists
   * the operation fails silently.
   *
   * @param {Release} release
   * @param {Asset} asset
   * @returns {Promise<void>}
   * @memberof GithubRepo
   */
  async uploadReleaseAsset(release: Release, asset: Asset): Promise<void> {
    const releaseDetails = await this.getReleaseByTag(release.tag);

    if (releaseDetails === undefined) {
      throw new Error(`Could not look up release for tag ${release.tag}`);
    }

    const params = {
      method: 'POST',
      url: releaseDetails.upload_url,
      headers: {
        'content-type': asset.contentType
      },
      name: path.basename(asset.path),
      data: await readFile(asset.path)
    };

    await this.octokit.request(params)
      .catch(this._ignoreAlreadyExistsError);
  }

  /**
   * Creates release notes and uploads assets if they are not yet uploaded to Github.
   */
  async releaseToGithub(artifact: TarballFile, config: Config): Promise<void> {
    const tag = `v${config.version}`;

    const githubRelease = {
      name: config.version,
      tag: tag,
      notes: `Release notes [in Jira](${this.jiraReleaseNotesLink(config.version)})`
    };

    const releaseDetails = await this.getReleaseByTag(tag);

    if (!releaseDetails) {
      await this.createDraftRelease(githubRelease);
    }

    await this.uploadReleaseAsset(githubRelease, artifact);
  }

  async getReleaseByTag(tag: string): Promise<ReleaseDetails | undefined> {
    const releases = await this.octokit
      .paginate(
        'GET /repos/:owner/:repo/releases',
        this.repo,
      );

    return releases.find(({ tag_name }) => tag_name === tag);
  }

  async promoteRelease(config: Config): Promise<void> {
    const tag = `v${config.version}`;

    const releaseDetails = await this.getReleaseByTag(tag);

    if (!releaseDetails) {
      throw new Error(`Release for ${tag} not found.`);
    }

    if (!releaseDetails.draft) {
      console.info(`Release for ${tag} is already public.`);
      return;
    }

    const params = {
      ...this.repo,
      release_id: releaseDetails.id,
      draft: false
    };

    await this.octokit.repos.updateRelease(params);
  }

  /**
  * Checks if current build needs to be released to github and the downloads
  * centre.
  * Returns true if current branch is not master, there is a commit tag, and if
  * current version matches current revision.
  */
  async shouldDoPublicRelease(config: Config): Promise<boolean> {
    if (config.isPatch) {
      console.info('mongosh: skip public release: is a patch');
      return false;
    }

    if (config.branch !== 'master') {
      console.info('mongosh: skip public release: is not master');
      return false;
    }

    const commitTag = config.revision && await this.getTagByCommitSha(config.revision);

    if (!commitTag) {
      console.info('mongosh: skip public release: commit is not tagged');
      return false;
    }

    if (semver.neq(commitTag.name, config.version)) {
      console.info(
        'mongosh: skip public release: the commit tag', commitTag.name,
        'is different from the release version', config.version
      );

      return false;
    }

    return true;
  }

  jiraReleaseNotesLink(version: string): string {
    return `https://jira.mongodb.org/issues/?jql=project%20%3D%20MONGOSH%20AND%20fixVersion%20%3D%20${version}`;
  }

  /**
   * Creates a new branch pointing to the latest commit of the given source branch.
   * @param branchName The name of the branch (not including refs/heads/)
   * @param sourceBranch The name of the branch to branch off from (not including refs/heads/)
   */
  async createBranch(branchName: string, sourceBranch: string): Promise<void> {
    const result = await this.octokit.git.getRef({
      ...this.repo,
      ref: `heads/${sourceBranch}`
    });

    await this.octokit.git.createRef({
      ...this.repo,
      ref: `refs/heads/${branchName}`,
      sha: result.data.object.sha
    });
  }

  async deleteBranch(branchName: string): Promise<void> {
    await this.octokit.git.deleteRef({
      ...this.repo,
      ref: `heads/${branchName}`
    });
  }

  /**
   * Gets the content of the given file from the repository.
   * Assumes the loaded file is a utf-8 encoded text file.
   *
   * @param pathInRepo Path to the file from the repository root
   * @param branchOrTag Optional branch/tag name to load content from
   */
  async getFileContent(pathInRepo: string, branchOrTag?: string): Promise<{blobSha: string; content: string;}> {
    const params = {
      ...this.repo,
      path: pathInRepo
    } as any;
    if (branchOrTag) {
      params.ref = branchOrTag;
    }
    const response = await this.octokit.repos.getContents(params);

    if (response.data.type !== 'file') {
      throw new Error(`${pathInRepo} does not reference a file`);
    } else if (response.data.encoding !== 'base64') {
      throw new Error(`Octokit returned unexpected encoding: ${response.data.encoding}`);
    }

    const content = Buffer.from(response.data.content, 'base64').toString('utf-8');
    return {
      blobSha: response.data.sha,
      content
    };
  }

  /**
   * Updates the content of a given file in the repository.
   * Assumes the given file content is utf-8 encoded text.
   *
   * @param message The commit message
   * @param baseSha The blob SHA of the file to update
   * @param pathInRepo Path to the file from the repository root
   * @param newContent New file content
   * @param branch Optional branch name to commit to
   */
  async commitFileUpdate(message: string, baseSha: string, pathInRepo: string, newContent: string, branch?: string): Promise<{blobSha: string; commitSha: string;}> {
    const params = {
      ...this.repo,
      message,
      content: Buffer.from(newContent, 'utf-8').toString('base64'),
      path: pathInRepo,
      sha: baseSha
    } as any;
    if (branch) {
      params.branch = branch;
    }
    const response = await this.octokit.repos.createOrUpdateFile(params);

    return {
      blobSha: response.data.content.sha,
      commitSha: response.data.commit.sha
    };
  }

  async createPullRequest(title: string, fromBranch: string, toBaseBranch: string): Promise<{prNumber: number, url: string}> {
    const response = await this.octokit.pulls.create({
      ...this.repo,
      base: toBaseBranch,
      head: fromBranch,
      title
    });

    return {
      prNumber: response.data.number,
      url: response.data.html_url
    };
  }

  async mergePullRequest(prNumber: number): Promise<void> {
    await this.octokit.pulls.merge({
      ...this.repo,
      pull_number: prNumber
    });
  }

  private _ignoreAlreadyExistsError(): (error: any) => Promise<void> {
    return (error: any): Promise<void> => {
      if (this._isAlreadyExistsError(error)) {
        return Promise.resolve();
      }

      return Promise.reject(error);
    };
  }

  private _isAlreadyExistsError(error: any): boolean {
    return error.name === 'HttpError' &&
      error.status === 422 &&
      error.errors &&
      error.errors.length === 1 &&
      error.errors[0].code === 'already_exists';
  }
}
