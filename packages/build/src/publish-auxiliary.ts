import type { Config } from './config';
import { publishToNpm } from './npm-packages';

export async function publishAuxiliaryPackages(config: Config) {
  if (!config.useAuxiliaryPackagesOnly) {
    throw new Error(
      'This should only be used when publishing auxiliary packages'
    );
  }
  await publishToNpm(config);
}
