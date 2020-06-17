import fs from 'fs';
import path from 'path';
import { Octokit } from '@octokit/rest';
import semver from 'semver';
import Platform from './platform';

/**
 * The repo we are working on.
 */
const REPO = Object.freeze({
  owner: 'mongodb-js',
  repo: 'mongosh'
});

/**
 * Release mongosh to Github releases.
 *
 * @param {string} version - The current version.
 * @param {string} artifact - The artifact path.
 * @param {string} platform - The platform.
 * @param {Octokit} octokit - The octokit instance.
 */
const releaseToGithub = async(version: string, artifact: string, platform: string, octokit: Octokit): Promise<boolean> => {
  const latestRelease = await getLatestRelease(octokit);
  if (semver.gt(version, latestRelease.tag_name.replace('v', ''))) {
    // Create a new release if our version is higher than latest.
    const newRelease = await createRelease(version, octokit);
    // TODO: Durran - Sign and notarize for MacOS here instead of before.
    await uploadAsset(artifact, platform, newRelease.upload_url, octokit);
    return true;
  }
  await uploadAsset(artifact, platform, latestRelease.upload_url, octokit);
  return false;
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

/**
 * Create a new release.
 *
 * @param {string} version - The release version.
 * @param {Octokit} octokit - The octokit instance.
 */
const createRelease = async(version: string, octokit: Octokit): Promise<any> => {
  const params = {
    ...REPO,
    // eslint-disable-next-line @typescript-eslint/camelcase
    tag_name: `v${version}`,
    name: version,
    body: `Release notes [in Jira](https://jira.mongodb.org/issues/?jql=project%20%3D%20MONGOSH%20AND%20fixVersion%20%3D%20${version})`
  };
  const { data } = await octokit.repos.createRelease(params);
  console.log('mongosh: created release:', data);
  return data;
};

/**
 * Upload the asset to the release.
 *
 * @param {string} artifact - The artifact.
 * @param {string} platform - The platform.
 * @param {string} uploadUrl - The release endpoint.
 * @param {Octokit} octokit - The octokit instance.
 */
const uploadAsset = async(artifact: string, platform: string, uploadUrl: string, octokit: Octokit): Promise<any> => {
  const params = {
    method: 'POST',
    url: uploadUrl,
    headers: {
      'content-type': platform === Platform.Linux ? 'application/gzip' : 'application/zip'
    },
    name: path.basename(artifact),
    data: fs.readFileSync(artifact)
  };
  console.log('mongosh: uploading asset to github:', artifact);
  await octokit.request(params).catch((e) => {
    // If the asset already exists it will throw, but we just log
    // it since we don't want to overwrite assets.
    console.log('mongosh: asset already exists:', e);
  });
};

export default releaseToGithub;
export {
  getLatestRelease,
  createRelease,
  uploadAsset,
  REPO
};
