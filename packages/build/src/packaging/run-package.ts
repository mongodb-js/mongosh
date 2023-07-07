import { constants as fsConstants, promises as fs } from 'fs';
import path from 'path';
import type { Config } from '../config';
import { validatePackageVariant } from '../config';
import { downloadCryptLibrary } from './download-crypt-library';
import { downloadManpage } from './download-manpage';
import { notarizeArtifact } from './notary-service';
import type { PackageFile } from './package';
import { createPackage } from './package';

export async function runPackage(config: Config): Promise<PackageFile> {
  const packageVariant = config.packageVariant;
  validatePackageVariant(packageVariant);

  await fs.mkdir(path.dirname(config.cryptSharedLibPath), { recursive: true });
  await fs.copyFile(
    await downloadCryptLibrary(packageVariant),
    config.cryptSharedLibPath,
    fsConstants.COPYFILE_FICLONE
  );

  const { manpage } = config;
  if (manpage) {
    await downloadManpage(
      manpage.sourceUrl,
      manpage.downloadPath,
      manpage.fileName
    );
  }

  const runCreatePackage = async (): Promise<PackageFile> => {
    return await createPackage(
      config.outputDir,
      packageVariant,
      (config.packageInformation as Required<Config>['packageInformation'])(
        packageVariant
      )
    );
  };

  const packaged = await runCreatePackage();

  if (packageVariant === 'win32msi-x64') {
    await notarizeArtifact(packaged.path, {
      signingKeyName: config.notarySigningKeyName || '',
      authToken: config.notaryAuthToken || '',
      signingComment: 'Evergreen Automatic Signing (mongosh)',
    });
  }

  return packaged;
}
