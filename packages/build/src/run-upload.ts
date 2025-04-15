import { promises as fs, constants as fsConstants } from 'fs';
import path from 'path';
import type { Config } from './config';
import { getReleaseVersionFromTag } from './config';
import type { uploadArtifactToEvergreen as uploadArtifactToEvergreenFn } from './evergreen';
import { getPackageFile } from './packaging';
import { validatePackageVariant } from './config';

export async function runUpload(
  config: Config,
  uploadToEvergreen: typeof uploadArtifactToEvergreenFn,
  fsAccess: typeof fs.access = fs.access
): Promise<void> {
  const requiredConfigKeys: (keyof Config)[] = [
    'evgAwsKey',
    'evgAwsSecret',
    'project',
    'revision',
    'packageVariant',
    'outputDir',
  ];
  for (const key of requiredConfigKeys) {
    if (typeof config[key] !== 'string') {
      throw new Error(`Missing build config key: ${key}`);
    }
  }

  const packageVariant = config.packageVariant;
  validatePackageVariant(packageVariant);

  const packageInformation = (
    config.packageInformation as Required<Config>['packageInformation']
  )(packageVariant);
  const tarballFile = path.join(
    config.outputDir,
    getPackageFile(packageVariant, () => packageInformation).path
  );

  await fsAccess(tarballFile, fsConstants.R_OK);
  let signatureFile: string | undefined = tarballFile + '.sig';
  try {
    await fsAccess(signatureFile, fsConstants.R_OK);
    console.info('Signature file present, uploading with tarball', tarballFile);
  } catch (err: any) {
    if (err?.code === 'ENOENT') {
      console.info(
        'No signature file present, only uploading tarball',
        tarballFile
      );
      signatureFile = undefined;
    } else {
      throw err;
    }
  }

  // When we are tagged with a release tag (draft or public) we use the tag directly as version
  // to allow sharing artifacts between preparation steps and final publishing
  const revisionOrVersion = getReleaseVersionFromTag(config.triggeringGitTag)
    ? (config.triggeringGitTag as string)
    : (config.revision as string);

  // we uploaded to evergreen to have a common place to grab the packaged artifact from
  const upload = async (file: string) =>
    await uploadToEvergreen(
      file,
      config.evgAwsKey as string,
      config.evgAwsSecret as string,
      config.project as string,
      revisionOrVersion,
      config.artifactUrlExtraTag
    );
  const uploadedArtifactUrl = await upload(tarballFile);
  if (signatureFile) await upload(signatureFile);

  if (config.artifactUrlFile) {
    await fs.writeFile(config.artifactUrlFile, uploadedArtifactUrl);
  }
}
