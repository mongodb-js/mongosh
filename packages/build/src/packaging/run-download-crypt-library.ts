import { constants as fsConstants, promises as fs } from 'fs';
import path from 'path';
import type { Config } from '../config';
import { validatePackageVariant } from '../config';
import { downloadCryptLibrary } from './download-crypt-library';

export async function runDownloadCryptLibrary(config: Config): Promise<void> {
  const packageVariant = config.packageVariant;
  validatePackageVariant(packageVariant);

  await fs.mkdir(path.dirname(config.cryptSharedLibPath), { recursive: true });
  const { cryptLibrary, version: cryptLibraryVersion } =
    await downloadCryptLibrary(packageVariant);
  await fs.copyFile(
    cryptLibrary,
    config.cryptSharedLibPath,
    fsConstants.COPYFILE_FICLONE
  );
  await fs.writeFile(
    path.join(
      path.dirname(config.cryptSharedLibPath),
      `.${path.basename(config.cryptSharedLibPath)}.version`
    ),
    cryptLibraryVersion
  );
}
