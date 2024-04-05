import { constants as fsConstants, promises as fs } from 'fs';
import path from 'path';
import type { Config } from '../config';
import { validatePackageVariant } from '../config';
import type { PackageFile } from './package';
import { getPackageFile } from './package';
import { sign as signArtifactFn } from '@mongodb-js/signing-utils';

export async function runSign(
  config: Config,
  signArtifact: typeof signArtifactFn = signArtifactFn
): Promise<PackageFile> {
  const packageVariant = config.packageVariant;
  validatePackageVariant(packageVariant);

  const packageInformation = (
    config.packageInformation as Required<Config>['packageInformation']
  )(packageVariant);
  const packageFileInfo = getPackageFile(
    packageVariant,
    () => packageInformation
  );
  const tarballFilename = path.join(config.outputDir, packageFileInfo.path);

  const clientOptions = {
    client: 'local' as const,
    signingMethod: getSigningMethod(tarballFilename),
  };

  await signArtifact(tarballFilename, clientOptions);

  let signatureFile: string | undefined;
  try {
    signatureFile = tarballFilename + '.sig';
    await fs.access(signatureFile, fsConstants.R_OK);
  } catch (err: any) {
    console.warn(
      `Could not generate expected signature file for ${tarballFilename}: ${err.message}`
    );
  }

  return packageFileInfo;
}

function getSigningMethod(src: string) {
  switch (path.extname(src)) {
    case '.exe':
    case '.msi':
      return 'jsign' as const;
    case '.rpm':
      return 'rpm_gpg' as const;
    default:
      return 'gpg' as const;
  }
}
