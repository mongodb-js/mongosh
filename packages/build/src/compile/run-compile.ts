import type { Config, PackageVariant } from '../config';
import type { PackageInformation } from '../packaging/package';
import { generateBundle } from './generate-bundle';
import { SignableCompiler } from './signable-compiler';

/**
 * Compile the executable. This builds the thing that ends up in `dist/`
 * that we will zip up and send off to userland.
 */
export async function runCompile(config: Config): Promise<string> {
  // We use Parcel to bundle up everything into a single JS under
  // cli-repl/dist/mongosh.js that the executable generator can use as input.
  // This JS also takes care of the analytics config file being written.
  await generateBundle(config);

  console.info('mongosh: creating binary:', config.executablePath);
  const packageInformation = config.packageInformation?.(
    config.packageVariant as PackageVariant
  );

  await new SignableCompiler(
    config.bundleSinglefileOutput,
    config.executablePath,
    config.execNodeVersion,
    (packageInformation?.metadata ?? {}) as PackageInformation['metadata']
  ).compile();

  return config.executablePath;
}
