import { constants as fsConstants, promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { Config, Platform, validateBuildVariant } from '../config';
import { downloadMongocrypt } from './download-mongocryptd';
import { macOSSignAndNotarize } from './macos-sign';
import { notarizeMsi } from './msi-sign';
import { createPackage, PackageFile } from './package';

export async function runPackage(
  config: Config,
): Promise<PackageFile> {
  const distributionBuildVariant = config.distributionBuildVariant;
  validateBuildVariant(distributionBuildVariant);

  await fs.mkdir(path.dirname(config.mongocryptdPath), { recursive: true });
  // TODO: add mongocryptd and E2E tests for darwin-arm64 once server builds
  // are available for that platform.
  if (distributionBuildVariant !== 'darwin-arm64') {
    await fs.copyFile(
      await downloadMongocrypt(distributionBuildVariant),
      config.mongocryptdPath,
      fsConstants.COPYFILE_FICLONE);
  } else {
    await fs.copyFile(
      path.resolve(__dirname, '..', '..', '..', '..', 'scripts', 'no-mongocryptd.sh'),
      config.mongocryptdPath,
      fsConstants.COPYFILE_FICLONE);
  }

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

  if (distributionBuildVariant === 'win32msi-x64') {
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
