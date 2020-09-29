/* eslint-disable no-shadow */
import uploadToDownloadCenter from './upload-to-download-center';
import compileAndZipExecutable from './compile-and-zip-executable';
import uploadDownloadCenterConfig from './download-center';
import uploadArtifactToEvergreen from './evergreen';
import buildAndUpload from './build-and-upload';
import { GithubRepo } from './github-repo';
import { Octokit } from '@octokit/rest';
import { Barque } from './barque';
import publish from './publish';
import Config from './config';

/**
 * Run the release process.
 * zip, release internally on evergreen, and, if applicable do a public release
 * (download centre and github.
 * @param {Config} config - the configuration, usually config/build.config.js.
 */
export default async function release(
  command: 'package' | 'publish',
  config: Config
): Promise<void> {
  const octokit = new Octokit({
    auth: config.githubToken
  });

  const githubRepo = new GithubRepo(config.repo, octokit);
  const barque = new Barque(config);

  if (command === 'package') {
    await buildAndUpload(
      config,
      githubRepo,
      barque,
      compileAndZipExecutable,
      uploadArtifactToEvergreen,
      uploadToDownloadCenter
    );
  } else if (command === 'publish') {
    await publish(
      config,
      githubRepo,
      uploadDownloadCenterConfig
    );
  } else {
    throw new Error(`Unknown command: ${command}`);
  }
}
