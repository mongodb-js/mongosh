import { constants as fsConstants, promises as fs } from 'fs';
import os from 'os';
import { Config, Platform } from '../config';
import { downloadMongocrypt } from './download-mongocryptd';
import { macOSSignAndNotarize } from './macos-sign';
import { createTarball, TarballFile } from '../tarball';

export async function runPackage(
  config: Config,
): Promise<TarballFile> {
  const distributionBuildVariant = config.distributionBuildVariant;
  if (!distributionBuildVariant) {
    throw new Error('distributionBuildVariant is missing in configuration - make sure the expansion is present');
  }

  await fs.copyFile(await downloadMongocrypt(), config.mongocryptdPath, fsConstants.COPYFILE_FICLONE);

  const runCreateTarball = async(): Promise<TarballFile> => {
    return await createTarball(
      config.outputDir,
      distributionBuildVariant,
      config.packageInformation as (Required<Config>['packageInformation'])
    );
  };

  // Zip the executable, or, on macOS, do it as part of the
  // notarization/signing step.
  if (os.platform() === Platform.MacOs) {
    return await macOSSignAndNotarize(
      [
        config.executablePath,
        config.mongocryptdPath
      ],
      config,
      runCreateTarball
    );
  }
  return await runCreateTarball();
}
