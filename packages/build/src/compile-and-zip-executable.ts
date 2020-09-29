import compileExec from './compile-exec';
import { createTarball, TarballFile } from './tarball';
import Config from './config';
import Platform from './platform';
import os from 'os';
import macOSSignAndNotarize from './macos-sign';

export default async function compileAndZipExecutable(config: Config): Promise<TarballFile> {
  const executable = await compileExec(
    config.input,
    config.execInput,
    config.outputDir,
    config.execNodeVersion,
    config.analyticsConfig,
    config.segmentKey,
  );

  const runCreateTarball = async(): Promise<TarballFile> => {
    return await createTarball(
      executable,
      config.outputDir,
      config.buildVariant,
      config.version,
      config.rootDir
    );
  };

  // Zip the executable, or, on macOS, do it as part of the notarization/signing
  // step.
  if (os.platform() === Platform.MacOs && !config.dryRun) {
    return await macOSSignAndNotarize(executable, config, runCreateTarball);
  } else {
    return await runCreateTarball();
  }
}
