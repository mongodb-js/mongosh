import { Octokit } from '@octokit/rest';
import semver from 'semver';

/**
 * The repo we are working on.
 */
const REPO = Object.freeze({
  owner: 'mongodb-js',
  repo: 'mongosh'
});

/**
 * Determine if this version is releasable.
 *
 * @param {string} version - The current version.
 * @param {Octokit} octokit - The octokit instance.
 *
 * @returns {Promise} The promise of the boolean.
 */
const isReleasable = async(version: string, octokit: Octokit): Promise<boolean> => {
  const latestRelease = await getLatestRelease(octokit);
  return semver.gt(version, latestRelease.tag_name.replace('v', ''));
};

/**
 * Get the latest release from Github.
 *
 * @param {Octokit} octokit - The octokit instance.
 *
 * @returns {Promise} A promise of the release data.
 */
const getLatestRelease = async(octokit: Octokit): Promise<any> => {
  const { data } = await octokit.repos.getLatestRelease(REPO).catch((e) => {
    console.log('Got error getting release', e);
    process.exit(1);
  });
  console.log('mongosh: latest release:', data);
  return data;
};

const createRelease = (version: string, octokit: Octokit): Promise<any> => {
  const params = {
    ...REPO,
    tag_name: `v${version}`,
    name: version,
    body: 'TODO: Generate Release Notes'
  };
  return octokit.repos.createRelease(params);
};

const uploadAsset = (artifact: string, octokit: Octokit): Promise<any> => {
  const params = {
    ...REPO,
    release_id: 1,
    data: ''
  };
  return octokit.repos.uploadReleaseAsset(params);
};

export default createRelease;
export {
  isReleasable,
  createRelease,
  uploadAsset
};
