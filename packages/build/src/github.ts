import fs from 'fs';
import path from 'path';
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
 * Release mongosh to Github releases.
 *
 * @param {string} version - The current version.
 * @param {string} artifact - The artifact path.
 * @param {Octokit} octokit - The octokit instance.
 */
const releaseToGithub = async(version: string, artifact: string, octokit: Octokit): Promise<any> => {
  const latestRelease = await getLatestRelease(octokit);
  if (semver.gt(version, latestRelease.tag_name.replace('v', ''))) {
    // Create a new release if our version is higher than latest.
    const newRelease = await createRelease(version, octokit);
    await uploadAsset(artifact, newRelease.id, octokit);
  } else {
    await uploadAsset(artifact, latestRelease.id, octokit);
  }
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
    tag_name: `v${version}`,
    name: version,
    body: 'TODO: Generate Release Notes'
  };
  const { data } = await octokit.repos.createRelease(params);
  console.log('mongosh: created release:', data);
  return data;
};

/**
 * Upload the asset to the release.
 *
 * @param {string} artifact - The artifact.
 * @param {number} releaseId - The release id.
 * @param {Octokit} octokit - The octokit instance.
 */
const uploadAsset = (artifact: string, releaseId: number, octokit: Octokit): Promise<any> => {
  const params = {
    ...REPO,
    release_id: releaseId,
    name: path.basename(artifact),
    data: artifact
  };
  console.log('mongosh: uploading asset:', artifact);
  return octokit.repos.uploadReleaseAsset(params).catch((e) => {
    // If the asset already exists it will throw, but we just log
    // it since we don't want to overwrite assets.
    console.error(e);
  });
};

export default releaseToGithub;
export {
  getLatestRelease,
  createRelease,
  uploadAsset
};
