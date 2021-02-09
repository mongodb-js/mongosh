import { promises as fs } from 'fs';
import path from 'path';
import { ALL_BUILD_VARIANTS } from './build-variant';
import Config from './config';
import { downloadArtifactFromEvergreen as downloadArtifactFromEvergreenFn } from './evergreen';
import getReleaseVersionFromTag from './get-release-version-from-tag';
import { GithubRepo } from './github-repo';
import { redactConfig } from './redact-config';
import { getTarballFile } from './tarball';
import { uploadToDownloadCenter as uploadToDownloadCenterFn } from './upload-to-download-center';

export async function runDraft(
  config: Config,
  githubRepo: GithubRepo,
  uploadToDownloadCenter: typeof uploadToDownloadCenterFn = uploadToDownloadCenterFn,
  downloadArtifactFromEvergreen: typeof downloadArtifactFromEvergreenFn = downloadArtifactFromEvergreenFn
): Promise<void> {
  console.info(
    'mongosh: beginning draft release with config:',
    redactConfig(config)
  );

  if (!config.triggeringGitTag || !getReleaseVersionFromTag(config.triggeringGitTag)) {
    console.error('mongosh: skipping draft as not triggered by a git tag that matches a draft/release tag');
    return;
  }

  if (!config.packageInformation) {
    throw new Error('Missing package information from config');
  }

  const tmpDir = path.join(__dirname, '..', '..', '..', 'tmp', `draft-${Date.now()}`);
  await fs.mkdir(tmpDir, { recursive: true });

  for await (const variant of ALL_BUILD_VARIANTS) {
    const tarballFile = getTarballFile(variant, config.packageInformation.metadata.version, config.packageInformation.metadata.name);
    console.info(`mongosh: processing artifact for ${variant} - ${tarballFile.path}`);

    const downloadedArtifact = await downloadArtifactFromEvergreen(
      tarballFile.path,
      config.project as string,
      config.triggeringGitTag,
      tmpDir
    );

    await uploadToDownloadCenter(
      downloadedArtifact,
      config.downloadCenterAwsKey as string,
      config.downloadCenterAwsSecret as string
    );

    await githubRepo.releaseToGithub({
      path: downloadedArtifact,
      contentType: tarballFile.contentType
    }, config);
  }
}
