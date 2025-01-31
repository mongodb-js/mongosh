import { Octokit } from '@octokit/rest';
import { writeBuildInfo } from './build-info';
import { Barque } from './barque';
import { runCompile } from './compile';
import type { Config } from './config';
import { getReleaseVersionFromTag, redactConfig } from './config';
import {
  createAndPublishDownloadCenterConfig,
  uploadArtifactToDownloadCenter,
} from './download-center';
import {
  downloadArtifactFromEvergreen,
  uploadArtifactToEvergreen,
} from './evergreen';
import { GithubRepo } from '@mongodb-js/devtools-github-repo';
import { publishToHomebrew } from './homebrew';
import { bumpAuxiliaryPackages, publishToNpm, pushTags } from './npm-packages';
import { runPackage } from './packaging';
import { runDraft } from './run-draft';
import { publishMongosh } from './publish-mongosh';
import { runUpload } from './run-upload';
import { runSign } from './packaging/run-sign';
import { runDownloadAndListArtifacts } from './run-download-and-list-artifacts';
import { runDownloadCryptLibrary } from './packaging/run-download-crypt-library';
import { bumpMongoshReleasePackages } from './npm-packages/bump';
import { publishAuxiliaryPackages } from './publish-auxiliary';

export type ReleaseCommand =
  | 'bump'
  | 'compile'
  | 'package'
  | 'sign'
  | 'upload'
  | 'download-crypt-shared-library'
  | 'download-and-list-artifacts'
  | 'draft'
  | 'publish';

/**
 * Run release specific commands.
 * @param command The command to run
 * @param config The configuration, usually config/build.config.js.
 */
export async function release(
  command: ReleaseCommand,
  config: Config
): Promise<void> {
  config = {
    ...config,
    version:
      getReleaseVersionFromTag(config.triggeringGitTag) || config.version,
  };

  console.info(
    `mongosh: running command '${command}' with config:`,
    redactConfig(config)
  );

  if (command === 'bump') {
    bumpAuxiliaryPackages();
    if (!config.useAuxiliaryPackagesOnly) {
      await bumpMongoshReleasePackages(config.version);
    }
    return;
  }

  const octokit = new Octokit({
    auth: config.githubToken,
  });

  if (config.isDryRun) {
    octokit.hook.wrap('request', (request, options) => {
      if (options.method === 'GET') {
        return request(options);
      }

      return {
        headers: {},
        data: {
          content: { sha: '0'.repeat(40) },
          commit: { sha: '0'.repeat(40) },
        },
      };
    });
  }

  const githubRepo = new GithubRepo(config.repo, octokit);
  const homebrewCoreRepo = new GithubRepo(
    { owner: 'Homebrew', repo: 'homebrew-core' },
    octokit
  );
  const mongoHomebrewForkRepo = new GithubRepo(
    { owner: 'mongodb-js', repo: 'homebrew-core' },
    octokit
  );

  if (command === 'compile') {
    await runCompile(config);
  } else if (command === 'package') {
    await runPackage(config);
  } else if (command === 'download-crypt-shared-library') {
    await runDownloadCryptLibrary(config);
  } else if (command === 'sign') {
    await runSign(config);
  } else if (command === 'upload') {
    await runUpload(config, uploadArtifactToEvergreen);
  } else if (command === 'draft') {
    await runDraft(
      config,
      githubRepo,
      uploadArtifactToDownloadCenter,
      downloadArtifactFromEvergreen
    );
  } else if (command === 'download-and-list-artifacts') {
    await runDownloadAndListArtifacts(config);
  } else if (command === 'publish') {
    if (config.useAuxiliaryPackagesOnly) {
      publishAuxiliaryPackages(config);
    } else {
      await publishMongosh(
        config,
        githubRepo,
        mongoHomebrewForkRepo,
        homebrewCoreRepo,
        new Barque(config),
        createAndPublishDownloadCenterConfig,
        publishToNpm,
        pushTags,
        writeBuildInfo,
        publishToHomebrew
      );
    }
  } else {
    throw new Error(`Unknown command: ${command}`);
  }
}
