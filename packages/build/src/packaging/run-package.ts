import { constants as fsConstants, promises as fs } from 'fs';
import path from 'path';
import { Config, validateBuildVariant } from '../config';
import { downloadCryptLibrary } from './download-crypt-library';
import { downloadManpage } from './download-manpage';
import { notarizeArtifact } from './notary-service';
import { createPackage, PackageFile } from './package';

export async function runPackage(
  config: Config,
): Promise<PackageFile> {
  const distributionBuildVariant = config.distributionBuildVariant;
  validateBuildVariant(distributionBuildVariant);

  await fs.mkdir(path.dirname(config.cryptSharedLibPath), { recursive: true });
  await fs.copyFile(
    await downloadCryptLibrary(distributionBuildVariant),
    config.cryptSharedLibPath,
    fsConstants.COPYFILE_FICLONE);

  const { manpage } = config;
  if (manpage) {
    await downloadManpage(
      manpage.sourceUrl,
      manpage.downloadPath,
      manpage.fileName
    );
  }

  const runCreatePackage = async(): Promise<PackageFile> => {
    return await createPackage(
      config.outputDir,
      distributionBuildVariant,
      config.packageInformation as (Required<Config>['packageInformation'])
    );
  };

  const packaged = await runCreatePackage();

  if (distributionBuildVariant === 'win32msi-x64') {
    await notarizeArtifact(
      packaged.path,
      {
        signingKeyName: config.notarySigningKeyName || '',
        authToken: config.notaryAuthToken || '',
        signingComment: 'Evergreen Automatic Signing (mongosh)'
      }
    );
  }

  return packaged;
}
