import { expect } from 'chai';
import { spawnSync } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import { withTempPackageEach } from '../../../test/helpers';
import { createPackage } from './create-package';

describe('package tarball', function () {
  const tmpPkg = withTempPackageEach();

  it('packages the executable(s)', async function () {
    const tarball = await createPackage(
      tmpPkg.tarballDir,
      'linux-x64',
      tmpPkg.pkgConfig
    );
    await fs.access(tarball.path);
    const tarname = path.basename(tarball.path).replace(/\.tgz$/, '');

    const unzip = spawnSync(
      'tar',
      [
        'tf',
        tarball.path,
        ...(process.platform === 'win32' ? ['--force-local'] : []),
      ],
      { encoding: 'utf-8' }
    );
    expect(unzip.error).to.be.undefined;
    expect(unzip.stderr).to.be.empty;

    expect(
      unzip.stdout
        .split('\n')
        .filter((l) => !!l)
        .every((l) => l.startsWith(`${tarname}/`))
    ).to.be.true;
  });
});
