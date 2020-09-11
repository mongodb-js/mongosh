/* eslint-disable @typescript-eslint/camelcase */
import { Octokit } from '@octokit/rest';
import { TarballFile } from './tarball';
import Config from './config';
import semver from 'semver';
import path from 'path';
import util from 'util';
import fs from 'fs';
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
  async getTagByCommitSha(sha: string): Promise<Tag> {
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
    const { data: releaseDetails } = await this.octokit.repos.getReleaseByTag({
      ...this.repo,
      tag: release.tag
    });

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

  // Creates release notes and uploads assets if they are not yet uploaded to
  // Github.
  async releaseToGithub(artifact: TarballFile, config: Config): Promise<void> {
    const githubRelease = {
      name: config.version,
      tag: `v${config.version}`,
      notes: `Release notes [in Jira](${this.jiraReleaseNotesLink(config.version)})`
    };
    await this.createDraftRelease(githubRelease);
    await this.uploadReleaseAsset(githubRelease, artifact);
  }

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  async getReleaseByTag(tag: string) {
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
    if (config.branch !== 'master') {
      console.info('mongosh: skip public release: is not master');
      return false;
    }

    const commitTag = await this.getTagByCommitSha(config.revision);

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

  private _ignoreAlreadyExistsError(): (error: any) => Promise<void> {
    return (error: any): Promise<void> => {
      if (this._isAlreadyExistsError(error)) {
        return;
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
