import { promises as fs } from 'fs';
import path from 'path';
import { ALL_BUILD_VARIANTS, Config, getReleaseVersionFromTag } from './config';
import { uploadArtifactToDownloadCenter as uploadArtifactToDownloadCenterFn } from './download-center';
import { downloadArtifactFromEvergreen as downloadArtifactFromEvergreenFn } from './evergreen';
import { notarizeArtifact as notarizeArtifactFn } from './packaging';
import { generateChangelog as generateChangelogFn } from './git';
import { GithubRepo } from '@mongodb-js/devtools-github-repo';
import { getPackageFile } from './packaging';

export async function runDraft(
  config: Config,
  githubRepo: GithubRepo,
  uploadToDownloadCenter: typeof uploadArtifactToDownloadCenterFn = uploadArtifactToDownloadCenterFn,
  downloadArtifactFromEvergreen: typeof downloadArtifactFromEvergreenFn = downloadArtifactFromEvergreenFn,
  ensureGithubReleaseExistsAndUpdateChangelog: typeof ensureGithubReleaseExistsAndUpdateChangelogFn = ensureGithubReleaseExistsAndUpdateChangelogFn,
  notarizeArtifact: typeof notarizeArtifactFn = notarizeArtifactFn
): Promise<void> {
  if (!config.triggeringGitTag || !getReleaseVersionFromTag(config.triggeringGitTag)) {
    console.error('mongosh: skipping draft as not triggered by a git tag that matches a draft/release tag');
    return;
  }

  if (!config.packageInformation) {
    throw new Error('Missing package information from config');
  }

  const githubReleaseTag = `v${config.version}`;
  await ensureGithubReleaseExistsAndUpdateChangelog(
    config.version, githubReleaseTag, githubRepo
  );

  const tmpDir = path.join(__dirname, '..', '..', '..', 'tmp', `draft-${Date.now()}`);
  await fs.mkdir(tmpDir, { recursive: true });

  for await (const variant of ALL_BUILD_VARIANTS) {
    const tarballFile = getPackageFile(variant, config.packageInformation);
    console.info(`mongosh: processing artifact for ${variant} - ${tarballFile.path}`);

    const downloadedArtifact = await downloadArtifactFromEvergreen(
      tarballFile.path,
      config.project as string,
      config.triggeringGitTag,
      tmpDir
    );

    await notarizeArtifact(
      tarballFile.path,
      {
        signingKeyName: config.notarySigningKeyName || '',
        authToken: config.notaryAuthToken || '',
        signingComment: 'Evergreen Automatic Signing (mongosh)'
      }
    );
    const signatureFile = tarballFile.path + '.sig';

    await Promise.all([
      [ downloadedArtifact, tarballFile.contentType ],
      [ signatureFile, 'application/pgp-signature' ]
    ].flatMap(([ path, contentType ]) => [
      uploadToDownloadCenter(
        path,
        config.downloadCenterAwsKey as string,
        config.downloadCenterAwsSecret as string
      ),

      githubRepo.uploadReleaseAsset(
        githubReleaseTag,
        { path, contentType }
      )
    ]));
  }
}

export async function ensureGithubReleaseExistsAndUpdateChangelogFn(
  releaseVersion: string,
  releaseTag: string,
  githubRepo: GithubRepo,
  generateChangelog: typeof generateChangelogFn = generateChangelogFn
): Promise<void> {
  const previousReleaseTag = await githubRepo.getPreviousReleaseTag(releaseVersion);
  console.info(`mongosh: Detected previous release tag ${previousReleaseTag?.name}`);

  let changelog = `See an overview of all solved issues [in Jira](https://jira.mongodb.org/issues/?jql=project%20%3D%20MONGOSH%20AND%20fixVersion%20%3D%20${releaseVersion})`;
  if (previousReleaseTag) {
    const generatedChangelog = generateChangelog(previousReleaseTag.name);
    if (generatedChangelog) {
      changelog = `${generatedChangelog}\n\n${changelog}`;
    }
  }

  console.info(`mongosh: Updating release ${releaseTag}, changelog:\n${changelog}`);
  await githubRepo.updateDraftRelease({
    name: releaseVersion,
    tag: releaseTag,
    notes: changelog
  });
}
