import { promises as fs } from 'fs';
import path from 'path';
import type { Config } from './config';
import { ALL_PACKAGE_VARIANTS, getReleaseVersionFromTag } from './config';
import { uploadArtifactToDownloadCenter as uploadArtifactToDownloadCenterFn } from './download-center';
import { uploadArtifactToDownloadCenterNew as uploadArtifactToDownloadCenterFnNew } from './download-center';
import { downloadArtifactFromEvergreen as downloadArtifactFromEvergreenFn } from './evergreen';
import { generateChangelog as generateChangelogFn } from './git';
import { getPackageFile } from './packaging';
import type { PackageBumper } from './npm-packages';
import type { GithubRepo } from '@mongodb-js/devtools-github-repo';

export async function runDraft(
  config: Config,
  githubRepo: GithubRepo,
  packageBumper: PackageBumper,
  uploadToDownloadCenter: typeof uploadArtifactToDownloadCenterFn = uploadArtifactToDownloadCenterFn,
  uploadToDownloadCenterNew: typeof uploadArtifactToDownloadCenterFnNew = uploadArtifactToDownloadCenterFnNew,
  downloadArtifactFromEvergreen: typeof downloadArtifactFromEvergreenFn = downloadArtifactFromEvergreenFn,
  ensureGithubReleaseExistsAndUpdateChangelog: typeof ensureGithubReleaseExistsAndUpdateChangelogFn = ensureGithubReleaseExistsAndUpdateChangelogFn
): Promise<void> {
  const { triggeringGitTag } = config;
  const draftReleaseVersion = getReleaseVersionFromTag(triggeringGitTag);
  if (!triggeringGitTag || !draftReleaseVersion) {
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

  packageBumper.bumpAuxiliaryPackages();
  await packageBumper.bumpMongoshReleasePackages(draftReleaseVersion);

  for await (const variant of ALL_PACKAGE_VARIANTS) {
    const tarballFile = getPackageFile(variant, config.packageInformation);
    console.info(
      `mongosh: processing artifact for ${variant} - ${tarballFile.path}`
    );

    await Promise.all(
      (
        [
          [tarballFile.path, tarballFile.contentType, true],
          [tarballFile.path + '.sig', 'application/pgp-signature', false],
        ] as const
      ).map(async ([filename, contentType, required]) => {
        let downloadedArtifact;
        try {
          downloadedArtifact = await downloadArtifactFromEvergreen(
            filename,
            config.project as string,
            triggeringGitTag,
            tmpDir
          );
        } catch (err) {
          if (required) throw err;
          console.warn(`Skipping missing artifact file`, filename);
          return;
        }
        await Promise.all([
          uploadToDownloadCenter(
            downloadedArtifact,
            config.downloadCenterAwsKey as string,
            config.downloadCenterAwsSecret as string
          ),

          githubRepo.uploadReleaseAsset(githubReleaseTag, {
            path: downloadedArtifact,
            contentType,
          }),
        ]);

        await uploadToDownloadCenterNew(
          downloadedArtifact,
          config.downloadCenterAwsKeyNew as string,
          config.downloadCenterAwsSecretNew as string,
          config.downloadCenterAwsSessionTokenNew as string
        );
      })
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
