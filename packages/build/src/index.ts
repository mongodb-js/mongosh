import path from 'path';
import { validatePackageVariant } from './config';
import { downloadMongoDb } from '@mongodb-js/mongodb-downloader';
import { getArtifactUrl } from './evergreen';
import { triggerRelease } from './local';
import type { ReleaseCommand } from './release';
import { release } from './release';
import type { Config, PackageVariant } from './config';
import { updateJsonFeedCTA } from './download-center';
import type { UpdateCTAConfig } from './download-center';

export { getArtifactUrl, downloadMongoDb };

const validCommands: (ReleaseCommand | 'trigger-release' | 'update-cta')[] = [
  'bump',
  'compile',
  'package',
  'upload',
  'draft',
  'publish',
  'sign',
  'download-crypt-shared-library',
  'download-and-list-artifacts',
  'trigger-release',
  'update-cta',
] as const;

const isValidCommand = (
  cmd: string
): cmd is ReleaseCommand | 'trigger-release' | 'update-cta' =>
  (validCommands as string[]).includes(cmd);

if (require.main === module) {
  Error.stackTraceLimit = 200;

  (async () => {
    const command = process.argv[2];
    if (!isValidCommand(command)) {
      throw new Error(
        `USAGE: npm run evergreen-release <${validCommands.join('|')}>`
      );
    }

    switch (command) {
      case 'trigger-release':
        await triggerRelease(process.argv.slice(3));
        break;
      case 'update-cta':
        const ctaConfig: UpdateCTAConfig = require(path.join(
          __dirname,
          '..',
          '..',
          '..',
          'config',
          'cta.conf.js'
        ));

        ctaConfig.isDryRun ||= process.argv.includes('--dry-run');

        await updateJsonFeedCTA(ctaConfig);
        break;
      default:
        const config: Config = require(path.join(
          __dirname,
          '..',
          '..',
          '..',
          'config',
          'build.conf.js'
        ));

        const cliBuildVariant = process.argv
          .map((arg) => /^--build-variant=(.+)$/.exec(arg))
          .filter(Boolean)[0];
        if (cliBuildVariant) {
          config.packageVariant = cliBuildVariant[1] as PackageVariant;
          validatePackageVariant(config.packageVariant);
        }

        config.isDryRun ||= process.argv.includes('--dry-run');
        config.useAuxiliaryPackagesOnly ||=
          process.argv.includes('--auxiliary');

        await release(command, config);
        break;
    }
  })().then(
    () => process.exit(0),
    (err) =>
      process.nextTick(() => {
        throw err;
      })
  );
}
