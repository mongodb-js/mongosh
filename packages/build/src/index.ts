import path from 'path';
import { ALL_BUILD_VARIANTS } from './config';
import { downloadMongoDb } from './download-mongodb';
import { getArtifactUrl } from './evergreen';
import { triggerRelease } from './local';
import { release, ReleaseCommand } from './release';
import type { Config, BuildVariant } from './config';

export { getArtifactUrl, downloadMongoDb };

if (require.main === module) {
  (async() => {
    const command = process.argv[2];
    if (!['bump', 'compile', 'package', 'upload', 'draft', 'publish', 'trigger-release'].includes(command)) {
      throw new Error('USAGE: npm run evergreen-release <bump|compile|package|upload|draft|publish|trigger-release>');
    }

    if (command === 'trigger-release') {
      await triggerRelease(process.argv.slice(3));
    } else {
      const config: Config = require(path.join(__dirname, '..', '..', '..', 'config', 'build.conf.js'));
      const cliBuildVariant = process.argv
        .map((arg) => arg.match(/^--build-variant=(.+)$/))
        .filter(Boolean)[0];
      if (cliBuildVariant) {
        config.distributionBuildVariant = cliBuildVariant[1] as BuildVariant;
        if (!ALL_BUILD_VARIANTS.includes(config.distributionBuildVariant)) {
          throw new Error(`Unknown build variant: ${config.distributionBuildVariant} - must be one of: ${ALL_BUILD_VARIANTS}`);
        }
      }

      await release(command as ReleaseCommand, config);
    }
  })().then(
    () => process.exit(0),
    (err) => process.nextTick(() => { throw err; })
  );
}
