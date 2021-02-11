import { promises as fs } from 'fs';
import { withTempPackageEach } from '../../test/helpers';
import { BuildVariant } from '../config';
import { createTarball } from './create-tarball';

describe('tarball posix', () => {
  const tmpPkg = withTempPackageEach();

  it('packages the executable(s)', async() => {
    const tarball = await createTarball(tmpPkg.tarballDir, BuildVariant.Linux, tmpPkg.pkgConfig);
    await fs.access(tarball.path);
  });
});
