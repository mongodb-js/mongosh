import { constants as fsConstants, promises as fs } from 'fs';
import path from 'path';
import { inspect } from 'util';
import type { Config } from '../config';
import { getDistro } from '../config';
import { validatePackageVariant } from '../config';
import { ArtifactMetadata } from '../release';
import { downloadCryptLibrary } from './download-crypt-library';
import { downloadManpage } from './download-manpage';
import { notarizeArtifact } from './notary-service';
import { PackageFile } from './package';
import { createPackage } from './package';

export async function runPackage(config: Config): Promise<ArtifactMetadata> {
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
  const filesToUpload = [packaged];

  if (packageVariant === 'win32msi-x64') {
    // windows builds are signed in-place
    await notarizeArtifact(packaged.path, {
      signingKeyName: config.notarySigningKeyName || '',
      authToken: config.notaryAuthToken || '',
      signingComment: 'Evergreen Automatic Signing (mongosh)',
    });
  }

  const arch = getDistro(
    config.packageVariant ??
      (() => {
        throw new Error(
          'Undefined package variant in config\n' +
            inspect(config, { depth: Infinity })
        );
      })()
  );
  if (['linux', 'deb', 'rpm'].includes(arch)) {
    const expectedSignatureFile = packaged.path + '.sig';

    console.error({
      message: `signing file - ${packaged.path} ${expectedSignatureFile}`,
    });

    await notarizeArtifact(packaged.path, {
      signingKeyName: config.notarySigningKeyName || '',
      authToken: config.notaryAuthToken || '',
      signingComment: 'Evergreen Automatic Signing (mongosh)',
    });

    await fs.access(expectedSignatureFile, fsConstants.R_OK);
    console.error({
      message: `successfully signed file - ${packaged.path} ${expectedSignatureFile}`,
    });
    filesToUpload.push(
      new PackageFile(expectedSignatureFile, 'gpg signature file')
    );
  }

  console.error({ filesToUpload });
  return new ArtifactMetadata(filesToUpload);
}
