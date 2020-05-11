import os from 'os';
import Config from './config';
import compileExec from './compile-exec';
import createDownloadCenterConfig from './download-center';
import Platform from './platform';
import zip from './zip';

/**
 * Run the release process.
 *
 * @param {Config} config - the configuration, usually a package.json.
 */
const release = async(config: Config) => {
  const platform = os.platform();

  // 1. Build the executable.
  await compileExec(config.input, config.outputDir, platform);

  // 2. Sign the executable for each OS.

  // 3. Zip the executable.
  await zip(config.input, config.outputDir, platform, config.version);

  // 4. Create & sign the .deb (only on linux)
  // 5. Create & sign the .rpm (only on linux)
  // 6. Create & sign the .msi (only on win)
  // 
  // If this is a new release tag.
  //
  // 1. Publish the .deb (only on linux)
  // 2. Publish the .rpm (only on linux)
  // 3. Create PR for Homebrew (only on macos)

  // 4. Upload artifacts to S3 for Evergreen and downloads. (Handled in .evergreen.yml)

  // 5. Create download center config. (only on macos)
  if (platform === Platform.MacOs) {
    await createDownloadCenterConfig(config.version, config.outputDir);
  }

  // 6. Upload download center config. (Handled in .evergreen.yml);

  // 7. Create Github release.
  // 8. Publish to NPM. (only on macos)
}; 

export default release;
