import { promises as fs } from 'fs';
import path from 'path';
import { ALL_BUILD_VARIANTS, Config, getReleaseVersionFromTag } from './config';
import { uploadArtifactToDownloadCenter as uploadArtifactToDownloadCenterFn } from './download-center';
import { downloadArtifactFromEvergreen as downloadArtifactFromEvergreenFn } from './evergreen';
import { GithubRepo } from './github-repo';
import { getTarballFile } from './tarball';

export async function runDraft(
  config: Config,
  githubRepo: GithubRepo,
  uploadToDownloadCenter: typeof uploadArtifactToDownloadCenterFn = uploadArtifactToDownloadCenterFn,
  downloadArtifactFromEvergreen: typeof downloadArtifactFromEvergreenFn = downloadArtifactFromEvergreenFn
): Promise<void> {
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
