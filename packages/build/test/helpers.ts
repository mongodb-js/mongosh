import { promises as fs } from 'fs';
import path from 'path';
import rimraf from 'rimraf';
import { promisify } from 'util';
import type { PackageInformation } from '../src/packaging/package';
import type { Config } from '../src/config';

export function withTempPackageEach(): {
  tarballDir: string;
  pkgConfig: PackageInformation;
} {
  const tarballDir: string = path.resolve(
    __dirname,
    '..',
    '..',
    '..',
    'tmp',
    `test-mongosh-build-${Date.now()}-${Math.random()}`
  );
  const fakePkgDir = path.resolve(__dirname, 'fixtures');
  const pkgConfig: PackageInformation = require(path.resolve(
    fakePkgDir,
    'pkgconf.js'
  ));

  beforeEach(async () => {
    await fs.mkdir(tarballDir, { recursive: true });
  });

  afterEach(async () => {
    await promisify(rimraf)(tarballDir);
  });

  return {
    tarballDir,
    pkgConfig,
  };
}

export const dummyConfig: Config = Object.freeze({
  version: 'version',
  bundleSinglefileOutput: 'bundleSinglefileOutput',
  executablePath: 'executablePath',
  cryptSharedLibPath: 'cryptSharedLibPath',
  outputDir: 'outputDir',
  buildInfoFilePath: 'buildInfoFilePath',
  project: 'project',
  revision: 'revision',
  branch: 'branch',
  evgAwsKey: 'evgAwsKey',
  evgAwsSecret: 'evgAwsSecret',
  downloadCenterAwsKey: 'downloadCenterAwsKey',
  downloadCenterAwsSecret: 'downloadCenterAwsSecret',
  githubToken: 'githubToken',
  segmentKey: 'segmentKey',
  notarySigningKeyName: 'notarySigningKey',
  notaryAuthToken: 'notaryAuthToken',
  isCi: true,
  platform: 'linux',
  repo: {
    owner: 'owner',
    repo: 'repo',
  },
  packageInformation: () =>
    ({
      metadata: {
        name: 'mongosh',
        rpmName: 'mongodb-mongosh',
        debName: 'mongodb-mongosh',
        version: 'packageVersion',
        description: 'A magic shell.',
        homepage: 'https://mongodb.com',
        maintainer: 'We, us, everyone.',
      },
    } as PackageInformation),
  execNodeVersion: process.version,
  rootDir: path.resolve(__dirname, '..', '..'),
  ctaConfig: {},
  ctaConfigSchema: {},
});
