import { Octokit } from '@octokit/rest';
import { promises as fs } from 'fs';
import path, { dirname } from 'path';
import { writeBuildInfo } from './build-info';
import { Barque } from './barque';
import { runCompile } from './compile';
import type { Config } from './config';
import { Platform } from './config';
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
import * as joi from 'joi';
import { mkdir, readFile, writeFile } from 'fs/promises';
import { sign } from '@mongodb-js/signing-utils';
import { inspect } from 'util';

export type ReleaseCommand =
  | 'bump'
  | 'compile'
  | 'package'
  | 'upload'
  | 'draft'
  | 'publish'
  | 'sign';

function ArtifactMetadataStorage(config: Config) {
  const PackageFileSchema = joi.object({
    path: joi.string().required(),
    contentType: joi.string().required(),
  });
  const ArtifactMetadataSchema = joi.object<{ artifacts: PackageFile[] }>({
    artifacts: joi.array().items(PackageFileSchema).required(),
  });

  const location = path.join(config.outputDir, '.artifact_metadata');

  let _artifacts: PackageFile[] = [];
  async function read() {
    const contents = JSON.parse(await readFile(location, 'utf-8'));
    const value = joi.attempt(contents, ArtifactMetadataSchema);
    _artifacts = value.artifacts;
    return value;
  }

  function addArtifact(artifact: PackageFile) {
    joi.assert(artifact, PackageFileSchema);
    _artifacts.push(artifact);
  }

  async function write() {
    const payload = { artifacts: _artifacts };
    joi.assert(payload, ArtifactMetadataSchema);
    await mkdir(dirname(location), { recursive: true });
    await writeFile(location, JSON.stringify({ artifacts: _artifacts }));
  }

  function artifacts() {
    return _artifacts.slice();
  }

  return { read, write, addArtifact, artifacts };
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

  const artifactMetadataStorage = ArtifactMetadataStorage(config);
  console.info(
    `mongosh: running command '${command}' with config:`,
    inspect(redactConfig(config), { depth: Infinity })
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
    const artifact = await runPackage(config);
    artifactMetadataStorage.addArtifact(artifact);
    await artifactMetadataStorage.write();
  } else if (command === 'upload') {
    const { artifacts } = await artifactMetadataStorage.read();
    console.error('received artifacts: ', artifacts);
    const files = [];
    for (const file of artifacts) {
      console.error('uploading artifact', file);

      files.push(await runUpload(config, file, uploadArtifactToEvergreen));
    }
    console.error('successfully uploaded files: ', files);
    if (config.artifactUrlFile && files.length > 0) {
      await writeFile(config.artifactUrlFile, files.join('\n'));
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
  } else if (command === 'sign') {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    require('debug').enable('signing-utils');
    const { artifacts } = await artifactMetadataStorage.read();
    console.error('received artifacts: ', artifacts);
    const signedArtifacts: PackageFile[] = [];
    for (const packageFile of artifacts) {
      console.error('uploading artifact', packageFile.path);
      const clientOptions = {
        host: process.env.SIGNING_SERVER_HOSTNAME,
        username: process.env.SIGNING_SERVER_USERNAME,
        port: Number(process.env.SIGNING_SERVER_PORT),
        privateKey: process.env.SIGNING_SERVER_PRIVATE_KEY,
        signingMethod: 'gpg' as const,
        client: 'remote' as const,
      };

      if (config.platform === Platform.Linux) {
        await sign(packageFile.path, clientOptions).catch((error) => {
          console.error({
            ERROR_ERROR_ERROR: error,
          });
          throw error;
        });

        console.error({
          contents: await fs.readdir(dirname(packageFile.path)),
        });

        signedArtifacts.push(
          PackageFile({
            path: `${packageFile.path}.sig`,
            contentType: 'signature file',
          })
        );
      }
    }
    for (const artifact of signedArtifacts) {
      artifactMetadataStorage.addArtifact(artifact);
    }
    console.error('finished: ', artifactMetadataStorage.artifacts);
    await artifactMetadataStorage.write();
  } else {
    throw new Error(`Unknown command: ${command}`);
  }
}
