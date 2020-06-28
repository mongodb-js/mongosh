import compileExec from './compile-exec';
import { zip, ZipFile } from './zip';
import Config from './config';

export default async function compileAndZipExecutable(config: Config): Promise<ZipFile> {
  const executable = await compileExec(
    config.input,
    config.execInput,
    config.outputDir,
    config.platform,
    config.analyticsConfig,
    config.segmentKey
  );

  // Zip the executable.
  const artifact = await zip(
    executable,
    config.outputDir,
    config.platform,
    config.version
  );

  // add artifcats for .rpm and .deb and .msi
  return artifact;
}
