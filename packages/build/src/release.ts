import { Octokit } from '@octokit/rest';
import { promises as fs } from 'fs';
import path from 'path';
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
import { bumpNpmPackages, publishNpmPackages } from './npm-packages';
import { PackageFile, runPackage } from './packaging';
import { runDraft } from './run-draft';
import { runPublish } from './run-publish';
import { runUpload } from './run-upload';

export type ReleaseCommand =
  | 'bump'
  | 'compile'
  | 'package'
  | 'upload'
  | 'draft'
  | 'publish';
export class ArtifactMetadata {
  constructor(public artifacts: PackageFile[]) {}

  static fromJSON(json: string): ArtifactMetadata {
    const jsonObject = JSON.parse(json);

    if (!('artifacts' in jsonObject)) {
      throw new Error('missing key artifacts in JSON' + json);
    }

    const { artifacts } = jsonObject;
    if (!Array.isArray(artifacts)) {
      throw new Error('must be array');
    }

    return new ArtifactMetadata(
      artifacts.map((o) => PackageFile.fromObject(o))
    );
  }
}
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
    // updates the version of internal packages to reflect the tagged one
    await bumpNpmPackages(config.version);
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
    const tarballFile = await runPackage(config);
    await fs.writeFile(
      path.join(config.outputDir, '.artifact_metadata'),
      JSON.stringify(tarballFile)
    );
  } else if (command === 'upload') {
    const artifactMetadata = ArtifactMetadata.fromJSON(
      await fs.readFile(
        path.join(config.outputDir, '.artifact_metadata'),
        'utf8'
      )
    );
    for (const file of artifactMetadata.artifacts) {
      await runUpload(config, file, uploadArtifactToEvergreen);
    }
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
      mongoHomebrewForkRepo,
      homebrewCoreRepo,
      barque,
      createAndPublishDownloadCenterConfig,
      publishNpmPackages,
      writeBuildInfo,
      publishToHomebrew
    );
  } else {
    throw new Error(`Unknown command: ${command}`);
  }
}
