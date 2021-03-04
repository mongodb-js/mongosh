import type { PackageInformation } from '../tarball';
import { generateBundle } from './generate-bundle';
import { SignableCompiler } from './signable-compiler';

/**
 * Compile the executable. This builds the thing that ends up in `dist/`
 * that we will zip up and send off to userland.
 */
export async function runCompile(
  input: string,
  execInput: string,
  executablePath: string,
  execNodeVersion: string,
  analyticsConfigFilePath: string,
  segmentKey: string,
  executableMetadata: PackageInformation['metadata']
): Promise<string> {
  // We use Parcel to bundle up everything into a single JS under
  // cli-repl/dist/mongosh.js that the executable generator can use as input.
  // This JS also takes care of the analytics config file being written.
  await generateBundle(input, execInput, analyticsConfigFilePath, segmentKey);

  console.info('mongosh: creating binary:', executablePath);

  await new SignableCompiler(execInput, executablePath, execNodeVersion, executableMetadata)
    .compile();

  return executablePath;
}
