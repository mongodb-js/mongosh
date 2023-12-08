import { promises as fs, constants as fsConstants } from 'fs';
import path from 'path';
import type { Config } from './config';
import { ALL_PACKAGE_VARIANTS, getReleaseVersionFromTag } from './config';
import { uploadArtifactToDownloadCenter as uploadArtifactToDownloadCenterFn } from './download-center';
import { downloadArtifactFromEvergreen as downloadArtifactFromEvergreenFn } from './evergreen';
import { notarizeArtifact as notarizeArtifactFn } from './packaging';
import { generateChangelog as generateChangelogFn } from './git';
import type { GithubRepo } from '@mongodb-js/devtools-github-repo';
import { getPackageFile } from './packaging';
import { spawnSync } from 'child_process';

function notarizeWithGarasign(
  downloadedArtifact: string,
  env: {
    GARASIGN_USERNAME: string;
    GARASIGN_PASSWORD: string;
    ARTIFACTORY_USERNAME: string;
    ARTIFACTORY_PASSWORD: string;
  }
) {
  const cwd = path.resolve(__dirname, '../../../.evergreen');
  const { stdout, stderr } = spawnSync('', [], {
    env: {
      garasign_username: env.GARASIGN_USERNAME,
      garasign_password: env.GARASIGN_PASSWORD,
      artifactory_username: env.ARTIFACTORY_USERNAME,
      artifactory_password: env.ARTIFACTORY_PASSWORD,
      file: downloadedArtifact,
    },
    encoding: 'utf8',
    cwd,
  });

  console.error({
    stdout,
    stderr,
  });
}

export async function runDraft(
  config: Config,
  githubRepo: GithubRepo,
  uploadToDownloadCenter: typeof uploadArtifactToDownloadCenterFn = uploadArtifactToDownloadCenterFn,
  downloadArtifactFromEvergreen: typeof downloadArtifactFromEvergreenFn = downloadArtifactFromEvergreenFn,
  ensureGithubReleaseExistsAndUpdateChangelog: typeof ensureGithubReleaseExistsAndUpdateChangelogFn = ensureGithubReleaseExistsAndUpdateChangelogFn,
  notarizeArtifact: typeof notarizeArtifactFn = notarizeArtifactFn
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
    const tarballFile = getPackageFile(variant, config.packageInformation);
    console.info(
      `mongosh: processing artifact for ${variant} - ${tarballFile.path}`
    );

    const downloadedArtifact = await downloadArtifactFromEvergreen(
      tarballFile.path,
      config.project as string,
      config.triggeringGitTag,
      tmpDir
    );

    let signatureFile: string | undefined;
    try {
      // await notarizeArtifact(downloadedArtifact, {
      //   signingKeyName: config.notarySigningKeyName || '',
      //   authToken: config.notaryAuthToken || '',
      //   signingComment: 'Evergreen Automatic Signing (mongosh)',
      // });
      notarizeWithGarasign(downloadedArtifact, {
        ...process.env,
      } as any);
      signatureFile = downloadedArtifact + '.sig';
      await fs.access(signatureFile, fsConstants.R_OK);
    } catch (err: any) {
      console.warn(
        `Skipping expected signature file for ${downloadedArtifact}: ${err.message}`
      );
      signatureFile = undefined;
    }

    await Promise.all(
      [
        [downloadedArtifact, tarballFile.contentType],
        [signatureFile, 'application/pgp-signature'],
      ].flatMap(([path, contentType]) =>
        path
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
