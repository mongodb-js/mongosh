import path from 'path';
import { BuildVariant } from '../../config';
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
  const tarballFile = getPackageFile(buildVariant, packageInformation.metadata.version, packageInformation.metadata.name);
  const fullTarballFilePath = path.join(outputDir, tarballFile.path);
  console.info('mongosh: gzipping:', fullTarballFilePath);

  switch (buildVariant) {
    case BuildVariant.Linux:
      await createTarballPackage(packageInformation, fullTarballFilePath);
      break;
    case BuildVariant.Redhat:
      await createRedhatPackage(packageInformation, packageInformation.rpmTemplateDir, fullTarballFilePath);
      break;
    case BuildVariant.Debian:
      await createDebianPackage(packageInformation, packageInformation.debTemplateDir, fullTarballFilePath);
      break;
    case BuildVariant.WindowsMSI:
      await createMsiPackage(packageInformation, packageInformation.msiTemplateDir, fullTarballFilePath);
      break;
    case BuildVariant.MacOs:
    case BuildVariant.Windows:
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
