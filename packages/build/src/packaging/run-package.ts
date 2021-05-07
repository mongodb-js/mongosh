import { constants as fsConstants, promises as fs } from 'fs';
import os from 'os';
import { BuildVariant, Config, Platform } from '../config';
import { downloadMongocrypt } from './download-mongocryptd';
import { macOSSignAndNotarize } from './macos-sign';
import { notarizeMsi } from './msi-sign';
import { createPackage, PackageFile } from './package';

export async function runPackage(
  config: Config,
): Promise<PackageFile> {
  const distributionBuildVariant = config.distributionBuildVariant;
  if (!distributionBuildVariant) {
    throw new Error('distributionBuildVariant is missing in configuration - make sure the expansion is present');
  }

  await fs.copyFile(await downloadMongocrypt(), config.mongocryptdPath, fsConstants.COPYFILE_FICLONE);

  const runCreatePackage = async(): Promise<PackageFile> => {
    return await createPackage(
      config.outputDir,
      distributionBuildVariant,
      config.packageInformation as (Required<Config>['packageInformation'])
    );
  };

  if (os.platform() === Platform.MacOs) {
    return await macOSSignAndNotarize(
      [
        config.executablePath,
        config.mongocryptdPath
      ],
      config,
      runCreatePackage
    );
  }

  const packaged = await runCreatePackage();

  if (distributionBuildVariant === BuildVariant.WindowsMSI) {
    await notarizeMsi(
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
