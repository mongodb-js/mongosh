import { Octokit } from '@octokit/rest';
import { promises as fs } from 'fs';
import path from 'path';
import writeAnalyticsConfig from './analytics';
import { Barque } from './barque';
import Config from './config';
import { createAndPublishDownloadCenterConfig, uploadArtifactToDownloadCenter } from './download-center';
import { downloadArtifactFromEvergreen, uploadArtifactToEvergreen } from './evergreen';
import getReleaseVersionFromTag from './get-release-version-from-tag';
import { GithubRepo } from './github-repo';
import { publishToHomebrew } from './homebrew';
import { bumpNpmPackages, publishNpmPackages } from './npm-packages';
import { redactConfig } from './redact-config';
import { runCompile } from './run-compile';
import { runDraft } from './run-draft';
import { runPackage } from './run-package';
import { runPublish } from './run-publish';
import { runUpload } from './run-upload';

/**
 * Run release specific commands.
 * @param command The command to run
 * @param config The configuration, usually config/build.config.js.
 */
export default async function release(
  command: 'bump' | 'compile' | 'package' | 'upload' | 'draft' | 'publish',
  config: Config
): Promise<void> {
  config = {
    ...config,
    version: await getReleaseVersionFromTag(config.triggeringGitTag) || config.version
  };

  console.info(
    `mongosh: running command '${command}' with config:`,
    redactConfig(config)
  );

  if (command === 'bump') {
    // updates the version of internal packages to reflect the tagged one
    bumpNpmPackages(config.version);
    return;
  }

  const octokit = new Octokit({
    auth: config.githubToken
  });

  const githubRepo = new GithubRepo(config.repo, octokit);
  const mongoHomebrewRepo = new GithubRepo({ owner: 'mongodb', repo: 'homebrew-brew' }, octokit);

  if (command === 'compile') {
    await runCompile(
      config.input,
      config.execInput,
      config.executablePath,
      config.execNodeVersion,
      config.analyticsConfigFilePath ?? '',
      config.segmentKey ?? ''
    );
  } else if (command === 'package') {
    const tarballFile = await runPackage(
      config
    );
    await fs.writeFile(path.join(config.outputDir, '.artifact_metadata'), JSON.stringify(tarballFile));
  } else if (command === 'upload') {
    const tarballFile = JSON.parse(await fs.readFile(path.join(config.outputDir, '.artifact_metadata'), 'utf8'));
    await runUpload(
      config,
      tarballFile,
      uploadArtifactToEvergreen
    );
  } else if (command === 'draft') {
    await runDraft(
      config,
      githubRepo,
      uploadArtifactToDownloadCenter,
      downloadArtifactFromEvergreen
    );
  } else if (command === 'publish') {
    const barque = new Barque(config);
    await runPublish(
      config,
      githubRepo,
      mongoHomebrewRepo,
      barque,
      createAndPublishDownloadCenterConfig,
      publishNpmPackages,
      writeAnalyticsConfig,
      publishToHomebrew
    );
  } else {
    throw new Error(`Unknown command: ${command}`);
  }
}
