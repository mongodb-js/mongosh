import type { Config } from '../config';
import { validatePackageVariant } from '../config';
import { downloadManpage } from './download-manpage';
import type { PackageFile } from './package';
import { createPackage } from './package';

export async function runPackage(config: Config): Promise<PackageFile> {
  const packageVariant = config.packageVariant;
  validatePackageVariant(packageVariant);

  const { manpage } = config;
  if (manpage) {
    await downloadManpage(
      manpage.sourceUrl,
      manpage.downloadPath,
      manpage.fileName
    );
  }

  return await createPackage(
    config.outputDir,
    packageVariant,
    (config.packageInformation as Required<Config>['packageInformation'])(
      packageVariant
    )
  );
}
