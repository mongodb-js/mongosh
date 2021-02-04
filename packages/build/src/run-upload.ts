import fs from 'fs';
import Config from './config';
import { uploadArtifactToEvergreen as uploadArtifactToEvergreenFn } from './evergreen';
import getReleaseVersionFromTag from './get-release-version-from-tag';
import { TarballFile } from './tarball';

export async function runUpload(
  config: Config,
  tarballFile: TarballFile,
  uploadToEvergreen: typeof uploadArtifactToEvergreenFn,
): Promise<void> {
  for (const key of [
    'evgAwsKey', 'evgAwsSecret', 'project', 'revision'
  ]) {
    if (typeof (config as any)[key] !== 'string') {
      throw new Error(`Missing build config key: ${key}`);
    }
  }

  // When we are tagged with a release tag (draft or public) we use the tag directly as version
  // to allow sharing artifacts between preparation steps and final publishing
  const revisionOrVersion = getReleaseVersionFromTag(config.triggeringGitTag)
    ? config.triggeringGitTag as string
    : config.revision as string;

  // we uploaded to evergreen to have a common place to grab the packaged artifact from
  const uploadedArtifactUrl = await uploadToEvergreen(
    tarballFile.path,
    config.evgAwsKey as string,
    config.evgAwsSecret as string,
    config.project as string,
    revisionOrVersion
  );

  if (config.artifactUrlFile) {
    await fs.promises.writeFile(config.artifactUrlFile, uploadedArtifactUrl);
  }
}
