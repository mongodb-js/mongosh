import { promises as fs } from 'fs';
import path from 'path';
import rimraf from 'rimraf';
import { promisify } from 'util';
import { PackageInformation } from '../src/packaging/package';

export function withTempPackageEach(): { tarballDir: string; pkgConfig: PackageInformation } {
  const tarballDir: string = path.resolve(__dirname, '..', '..', '..', 'tmp', `test-mongosh-build-${Date.now()}-${Math.random()}`);
  const fakePkgDir = path.resolve(__dirname, 'fixtures');
  const pkgConfig: PackageInformation = require(path.resolve(fakePkgDir, 'pkgconf.js'));

  beforeEach(async() => {
    await fs.mkdir(tarballDir, { recursive: true });
  });

  afterEach(async() => {
    await promisify(rimraf)(tarballDir);
  });

  return {
    tarballDir,
    pkgConfig
  };
}
