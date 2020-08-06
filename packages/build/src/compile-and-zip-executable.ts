import compileExec from './compile-exec';
import { createTarball, TarballFile } from './tarball';
import Config from './config';

export default async function compileAndZipExecutable(config: Config): Promise<TarballFile> {
  const executable = await compileExec(
    config.input,
    config.execInput,
    config.outputDir,
    config.platform,
    config.analyticsConfig,
    config.segmentKey
  );

  // Zip the executable.
  const artifact = await createTarball(
    executable,
    config.outputDir,
    config.buildVariant,
    config.version,
    config.rootDir
  );

  // add artifcats for .rpm and .msi
  return artifact;
}
