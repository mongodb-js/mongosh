import type { Config } from './config';
import { PackagePublisher } from './npm-packages';

export async function publishAuxiliaryPackages(config: Config) {
  if (!config.useAuxiliaryPackagesOnly) {
    throw new Error(
      'This should only be used when publishing auxiliary packages'
    );
  }
  const publisher = new PackagePublisher({
    useAuxiliaryPackagesOnly: true,
    isDryRun: config.isDryRun || false,
  });

  publisher.pushTags();
  await publisher.publishToNpm();
}
