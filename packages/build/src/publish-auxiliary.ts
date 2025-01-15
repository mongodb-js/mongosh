import type { Config } from './config';
import { publishToNpm } from './npm-packages';

export function publishAuxiliaryPackages(config: Config) {
  if (!config.useAuxiliaryPackagesOnly) {
    throw new Error(
      'This should only be used when publishing auxiliary packages'
    );
  }
  publishToNpm(config);
}
