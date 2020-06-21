/* eslint-disable @typescript-eslint/camelcase */
import { Octokit } from '@octokit/rest';
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
  async createReleaseIfNotExists(release: Release): Promise<void> {
    const params = {
      ...this.repo,
      tag_name: release.tag,
      name: release.name,
      body: release.notes
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
  async uploadReleaseAssetIfNotExists(release: Release, asset: Asset): Promise<void> {
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
