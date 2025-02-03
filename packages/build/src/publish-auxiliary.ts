import type { Config } from './config';
import { publishToNpm, pushTags } from './npm-packages';

export function publishAuxiliaryPackages(config: Config) {
  if (!config.useAuxiliaryPackagesOnly) {
    throw new Error(
      'This should only be used when publishing auxiliary packages'
    );
  }
  publishToNpm(config);
  pushTags({
    useAuxiliaryPackagesOnly: true,
    isDryRun: config.isDryRun || false,
  });
}
