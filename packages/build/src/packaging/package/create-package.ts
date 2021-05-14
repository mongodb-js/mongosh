import path from 'path';
import { BuildVariant, getDistro, getArch } from '../../config';
import { createDebianPackage as createDebianPackageFn } from './debian';
import { getPackageFile, PackageFile } from './get-package-file';
import { createMsiPackage as createMsiPackageFn } from './msi';
import { PackageInformation } from './package-information';
import { createRedhatPackage as createRedhatPackageFn } from './redhat';
import { createTarballPackage as createTarballPackageFn } from './tarball';
import { createZipPackage as createZipPackageFn } from './zip';

/**
 * Create a packaged archive for the provided options.
 */
export async function createPackage(
  outputDir: string,
  buildVariant: BuildVariant,
  packageInformation: PackageInformation,
  createTarballPackage: typeof createTarballPackageFn = createTarballPackageFn,
  createRedhatPackage: typeof createRedhatPackageFn = createRedhatPackageFn,
  createDebianPackage: typeof createDebianPackageFn = createDebianPackageFn,
  createMsiPackage: typeof createMsiPackageFn = createMsiPackageFn,
  createZipPackage: typeof createZipPackageFn = createZipPackageFn
): Promise<PackageFile> {
  const tarballFile = getPackageFile(buildVariant, packageInformation);
  const fullTarballFilePath = path.join(outputDir, tarballFile.path);
  console.info('mongosh: gzipping:', fullTarballFilePath);

  switch (getDistro(buildVariant)) {
    case 'linux':
      await createTarballPackage(packageInformation, fullTarballFilePath);
      break;
    case 'rhel':
    case 'suse':
    case 'amzn2':
      await createRedhatPackage(packageInformation, packageInformation.rpmTemplateDir, getArch(buildVariant), fullTarballFilePath);
      break;
    case 'debian':
      await createDebianPackage(packageInformation, packageInformation.debTemplateDir, getArch(buildVariant), fullTarballFilePath);
      break;
    case 'win32msi':
      await createMsiPackage(packageInformation, packageInformation.msiTemplateDir, getArch(buildVariant), fullTarballFilePath);
      break;
    case 'darwin':
    case 'win32':
      await createZipPackage(packageInformation, fullTarballFilePath);
      break;
    default:
      throw new Error(`Unhandled build variant: ${buildVariant}`);
  }

  return {
    ...tarballFile,
    path: fullTarballFilePath
  };
}
