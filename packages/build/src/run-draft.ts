import { promises as fs } from 'fs';
import path from 'path';
import type { Config } from './config';
import { ALL_PACKAGE_VARIANTS, getReleaseVersionFromTag } from './config';
import { uploadArtifactToDownloadCenter as uploadArtifactToDownloadCenterFn } from './download-center';
import { downloadArtifactFromEvergreen as downloadArtifactFromEvergreenFn } from './evergreen';
import { generateChangelog as generateChangelogFn } from './git';
import type { GithubRepo } from '@mongodb-js/devtools-github-repo';
import type { PackageFile } from './packaging';
import { getPackageFile } from './packaging';

/**
 *
 * @param config The `Config` for the current CI run.
 * @param packageInfo The `PackageInfo` for the artifact to download.
 * @param downloadDirectory The directory into which to download artifacts.
 * @param downloadArtifactFromEvergreen The function to use to download artifacts.  Used for testing.
 * @returns A Promise.allSettled() result with the format [artifact promise result, signature file promise result]
 */
function downloadArtifacts(
  config: Config,
  packageInfo: PackageFile,
  downloadDirectory: string,
  downloadArtifactFromEvergreen: typeof downloadArtifactFromEvergreenFn = downloadArtifactFromEvergreenFn
) {
  const downloadedArtifact$ = downloadArtifactFromEvergreen(
    packageInfo.path,
    config.project as string,
    config.triggeringGitTag!,
    downloadDirectory
  ).catch((e) => {
    console.warn(
      `Failed to download artifact ${packageInfo.path}: ${e.message}`
    );
    throw e;
  });

  const signatureFilePath = `${packageInfo.path}.sig`;
  const signatureFile$ = downloadArtifactFromEvergreen(
    signatureFilePath,
    config.project as string,
    config.triggeringGitTag!,
    downloadDirectory
  ).catch((e) => {
    console.warn(
      `Failed to download signature file for ${signatureFilePath}: ${e.message}`
    );
    throw e;
  });

  return Promise.allSettled([downloadedArtifact$, signatureFile$]);
}

export async function runDraft(
  config: Config,
  githubRepo: GithubRepo,
  uploadToDownloadCenter: typeof uploadArtifactToDownloadCenterFn = uploadArtifactToDownloadCenterFn,
  downloadArtifactFromEvergreen: typeof downloadArtifactFromEvergreenFn = downloadArtifactFromEvergreenFn,
  ensureGithubReleaseExistsAndUpdateChangelog: typeof ensureGithubReleaseExistsAndUpdateChangelogFn = ensureGithubReleaseExistsAndUpdateChangelogFn
): Promise<void> {
  if (
    !config.triggeringGitTag ||
    !getReleaseVersionFromTag(config.triggeringGitTag)
  ) {
    console.error(
      'mongosh: skipping draft as not triggered by a git tag that matches a draft/release tag'
    );
    return;
  }

  if (!config.packageInformation) {
    throw new Error('Missing package information from config');
  }

  const githubReleaseTag = `v${config.version}`;
  await ensureGithubReleaseExistsAndUpdateChangelog(
    config.version,
    githubReleaseTag,
    githubRepo
  );

  const tmpDir = path.join(
    __dirname,
    '..',
    '..',
    '..',
    'tmp',
    `draft-${Date.now()}`
  );
  await fs.mkdir(tmpDir, { recursive: true });

  for await (const variant of ALL_PACKAGE_VARIANTS) {
    const packageInfo = getPackageFile(variant, config.packageInformation);

    const [artifact, signatureFile] = await downloadArtifacts(
      config,
      packageInfo,
      tmpDir,
      downloadArtifactFromEvergreen
    );

    if (artifact.status === 'rejected') {
      // If we fail to download an artifact, we continue
      continue;
    }
    const downloadedArtifact = artifact.value;

    await Promise.all(
      [
        [downloadedArtifact, packageInfo.contentType],
        [
          // If we fail to download a signature file, we've already logged a message but we just continue.
          // Some artifacts have signatures embedded, so it's expected that some will not be present.
          signatureFile.status === 'fulfilled'
            ? signatureFile.value
            : undefined,
          'application/pgp-signature',
        ],
      ].flatMap(([path, contentType]) =>
        typeof path === 'string'
          ? [
              uploadToDownloadCenter(
                path,
                config.downloadCenterAwsKey as string,
                config.downloadCenterAwsSecret as string
              ),

              githubRepo.uploadReleaseAsset(githubReleaseTag, {
                path,
                contentType,
              }),
            ]
          : []
      )
    );
  }
}

export async function ensureGithubReleaseExistsAndUpdateChangelogFn(
  releaseVersion: string,
  releaseTag: string,
  githubRepo: GithubRepo,
  generateChangelog: typeof generateChangelogFn = generateChangelogFn
): Promise<void> {
  const previousReleaseTag = await githubRepo.getPreviousReleaseTag(
    releaseVersion
  );
  console.info(
    `mongosh: Detected previous release tag ${previousReleaseTag?.name}`
  );

  let changelog = `See an overview of all solved issues [in Jira](https://jira.mongodb.org/issues/?jql=project%20%3D%20MONGOSH%20AND%20fixVersion%20%3D%20${releaseVersion})`;
  if (previousReleaseTag) {
    const generatedChangelog = generateChangelog(previousReleaseTag.name);
    if (generatedChangelog) {
      changelog = `${generatedChangelog}\n\n${changelog}`;
    }
  }

  console.info(
    `mongosh: Updating release ${releaseTag}, changelog:\n${changelog}`
  );
  await githubRepo.updateDraftRelease({
    name: releaseVersion,
    tag: releaseTag,
    notes: changelog,
  });
}
