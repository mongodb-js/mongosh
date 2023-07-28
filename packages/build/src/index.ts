import path from 'path';
import { validatePackageVariant } from './config';
import { downloadMongoDb } from '@mongodb-js/mongodb-downloader';
import { getArtifactUrl } from './evergreen';
import { triggerRelease } from './local';
import type { ReleaseCommand } from './release';
import { release } from './release';
import type { Config, PackageVariant } from './config';

export { getArtifactUrl, downloadMongoDb };

if (require.main === module) {
  (async () => {
    const command = process.argv[2];
    if (
      ![
        'bump',
        'compile',
        'package',
        'upload',
        'draft',
        'publish',
        'trigger-release',
      ].includes(command)
    ) {
      throw new Error(
        'USAGE: npm run evergreen-release <bump|compile|package|upload|draft|publish|trigger-release>'
      );
    }

    if (command === 'trigger-release') {
      await triggerRelease(process.argv.slice(3));
    } else {
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

      await release(command as ReleaseCommand, config);
    }
  })().then(
    () => process.exit(0),
    (err) =>
      process.nextTick(() => {
        throw err;
      })
  );
}
