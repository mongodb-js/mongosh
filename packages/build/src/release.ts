import { Octokit } from '@octokit/rest';
import { promises as fs } from 'fs';
import path from 'path';
import { runCompile } from './compile';
import type { Config } from './config';
import { getReleaseVersionFromTag, redactConfig } from './config';
import { uploadArtifactToDownloadCenter } from './download-center';
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
import { writeBuildInfo } from './build-info';
import { PackageBumper } from './npm-packages/bump';
import { PackagePublisher } from './npm-packages';
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
  | 'publish'
  | 'npm-publish';

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
        status: 200,
        url: options.url,
        data: {
          content: { sha: '0'.repeat(40) },
          commit: { sha: '0'.repeat(40) },
        },
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
  } else if (command === 'npm-publish') {
    // Same build metadata the evergreen publish path writes before its npm
    // publish, so published tarballs report their packaged build info. The
    // lib directory is not committed and only gets created by the build
    // (which runs inside publishToNpm), so create it here first.
    if (config.buildInfoFilePath) {
      await fs.mkdir(path.dirname(config.buildInfoFilePath), {
        recursive: true,
      });
    }
    await writeBuildInfo(config, 'packaged');
    new PackagePublisher({
      useAuxiliaryPackagesOnly: false,
      isDryRun: config.isDryRun || false,
    }).publishToNpm();
  } else {
    throw new Error(`Unknown command: ${command}`);
  }
}
