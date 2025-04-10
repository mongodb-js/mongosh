import { Octokit } from '@octokit/rest';
import { runCompile } from './compile';
import type { Config } from './config';
import { getReleaseVersionFromTag, redactConfig } from './config';
import {
  uploadArtifactToDownloadCenter,
  uploadArtifactToDownloadCenterNew,
} from './download-center';
import {
  downloadArtifactFromEvergreen,
  uploadArtifactToEvergreen,
} from './evergreen';
import { runPackage } from './packaging';
import { runDraft } from './run-draft';
import { publishMongosh } from './publish-mongosh';
import { runUpload } from './run-upload';
import { runSign } from './packaging/run-sign';
import { runDownloadAndListArtifacts } from './run-download-and-list-artifacts';
import { runDownloadCryptLibrary } from './packaging/run-download-crypt-library';
import { PackageBumper } from './npm-packages/bump';
import { publishAuxiliaryPackages } from './publish-auxiliary';
import { GithubRepo } from '@mongodb-js/devtools-github-repo';

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
    const packageBumper = new PackageBumper();
    packageBumper.bumpAuxiliaryPackages();
    if (!config.useAuxiliaryPackagesOnly) {
      await packageBumper.bumpMongoshReleasePackages(config.version);
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
        status: 200,
        url: options.url,
      };
    });
  }
  const githubRepo = new GithubRepo(config.repo, octokit);

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
      new PackageBumper(),
      uploadArtifactToDownloadCenter,
      uploadArtifactToDownloadCenterNew,
      downloadArtifactFromEvergreen
    );
  } else if (command === 'download-and-list-artifacts') {
    await runDownloadAndListArtifacts(config);
  } else if (command === 'publish') {
    if (config.useAuxiliaryPackagesOnly) {
      publishAuxiliaryPackages(config);
    } else {
      await publishMongosh(config, octokit);
    }
  } else {
    throw new Error(`Unknown command: ${command}`);
  }
}
