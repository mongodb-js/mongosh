import path from 'path';
import type { PackageVariant } from '../../config';
import { getDistro, getArch } from '../../config';
import { createDebianPackage as createDebianPackageFn } from './debian';
import type { PackageFile } from './get-package-file';
import { getPackageFile } from './get-package-file';
import { createMsiPackage as createMsiPackageFn } from './msi';
import type { PackageInformation } from './package-information';
import { createRedhatPackage as createRedhatPackageFn } from './redhat';
import { createTarballPackage as createTarballPackageFn } from './tarball';
import { createZipPackage as createZipPackageFn } from './zip';

/**
 * Create a packaged archive for the provided options.
 */
export async function createPackage(
  outputDir: string,
  packageVariant: PackageVariant,
  packageInformation: PackageInformation,
  createTarballPackage: typeof createTarballPackageFn = createTarballPackageFn,
  createRedhatPackage: typeof createRedhatPackageFn = createRedhatPackageFn,
  createDebianPackage: typeof createDebianPackageFn = createDebianPackageFn,
  createMsiPackage: typeof createMsiPackageFn = createMsiPackageFn,
  createZipPackage: typeof createZipPackageFn = createZipPackageFn
): Promise<PackageFile> {
  const tarballFile = getPackageFile(packageVariant, () => packageInformation);
  const fullTarballFilePath = path.join(outputDir, tarballFile.path);
  console.info('mongosh: gzipping:', fullTarballFilePath);

  switch (getDistro(packageVariant)) {
    case 'linux':
      await createTarballPackage(packageInformation, fullTarballFilePath);
      break;
    case 'rpm':
      await createRedhatPackage(
        packageInformation,
        packageInformation.rpmTemplateDir,
        getArch(packageVariant),
        fullTarballFilePath
      );
      break;
    case 'deb':
      await createDebianPackage(
        packageInformation,
        packageInformation.debTemplateDir,
        getArch(packageVariant),
        fullTarballFilePath
      );
      break;
    case 'win32msi':
      await createMsiPackage(
        packageInformation,
        packageInformation.msiTemplateDir,
        getArch(packageVariant),
        fullTarballFilePath
      );
      break;
    case 'darwin':
    case 'win32':
      await createZipPackage(packageInformation, fullTarballFilePath);
      break;
    default:
      throw new Error(`Unhandled build variant: ${packageVariant}`);
  }

  return {
    ...tarballFile,
    path: fullTarballFilePath,
  };
}
