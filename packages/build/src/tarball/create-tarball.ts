import path from 'path';
import { BuildVariant } from '../config';
import { tarballDebian as tarballDebianFn } from './debian';
import { getTarballFile, TarballFile } from './get-tarball-file';
import { PackageInformation } from './package-information';
import { tarballPosix as tarballPosixFn } from './posix';
import { tarballRedhat as tarballRedhatFn } from './redhat';
import { tarballWindows as tarballWindowsFn, tarballWindowsMSI as tarballWindowsMSIFn } from './windows';

/**
 * Create a packaged archive for the provided options.
 */
export async function createTarball(
  outputDir: string,
  buildVariant: BuildVariant,
  packageInformation: PackageInformation,
  tarballPosix: typeof tarballPosixFn = tarballPosixFn,
  tarballRedhat: typeof tarballRedhatFn = tarballRedhatFn,
  tarballDebian: typeof tarballDebianFn = tarballDebianFn,
  tarballWindowsMSI: typeof tarballWindowsMSIFn = tarballWindowsMSIFn,
  tarballWindows: typeof tarballWindowsFn = tarballWindowsFn,
): Promise<TarballFile> {
  const tarballFile = getTarballFile(buildVariant, packageInformation.metadata.version, packageInformation.metadata.name);
  const fullTarballFilePath = path.join(outputDir, tarballFile.path);
  console.info('mongosh: gzipping:', fullTarballFilePath);

  switch (buildVariant) {
    case BuildVariant.Linux:
      await tarballPosix(packageInformation, fullTarballFilePath);
      break;
    case BuildVariant.Redhat:
      await tarballRedhat(packageInformation, packageInformation.rpmTemplateDir, fullTarballFilePath);
      break;
    case BuildVariant.Debian:
      await tarballDebian(packageInformation, packageInformation.debTemplateDir, fullTarballFilePath);
      break;
    case BuildVariant.WindowsMSI:
      await tarballWindowsMSI(packageInformation, packageInformation.msiTemplateDir, fullTarballFilePath);
      break;
    case BuildVariant.MacOs:
    case BuildVariant.Windows:
      await tarballWindows(packageInformation, fullTarballFilePath);
      break;
    default:
      throw new Error(`Unhandled build variant: ${buildVariant}`);
  }

  return {
    ...tarballFile,
    path: fullTarballFilePath
  };
}
