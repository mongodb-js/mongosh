import path from 'path';
import { validatePackageVariant } from './config';
import { downloadMongoDb } from '@mongodb-js/mongodb-downloader';
import { getArtifactUrl } from './evergreen';
import { triggerRelease } from './local';
import type { ReleaseCommand } from './release';
import { release } from './release';
import type { Config, PackageVariant } from './config';
import { updateJsonFeedCTA } from './download-center';
import Ajv from 'ajv';

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

const getBuildConfig = (): Config => {
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

  const ajv = new Ajv();
  const validateSchema = ajv.compile(config.ctaConfigSchema);
  if (!validateSchema(config.ctaConfig)) {
    console.warn('CTA schema validation failed:', validateSchema.errors);
    throw new Error('CTA validation failed, see above for details');
  }

  config.isDryRun ||= process.argv.includes('--dry-run');
  config.useAuxiliaryPackagesOnly ||= process.argv.includes('--auxiliary');

  return config;
};

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
        const {
          ctaConfig,
          downloadCenterAwsKey,
          downloadCenterAwsSecret,
          downloadCenterAwsKeyNew,
          downloadCenterAwsSecretNew,
          downloadCenterAwsSessionTokenNew,
          isDryRun,
        } = getBuildConfig();

        if (!downloadCenterAwsKey || !downloadCenterAwsSecret) {
          throw new Error('Missing AWS credentials for download center');
        }

        await updateJsonFeedCTA(
          ctaConfig,
          downloadCenterAwsKey,
          downloadCenterAwsSecret,
          downloadCenterAwsKeyNew,
          downloadCenterAwsSecretNew,
          downloadCenterAwsSessionTokenNew,
          !!isDryRun
        );
        break;
      default:
        const config = getBuildConfig();

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
