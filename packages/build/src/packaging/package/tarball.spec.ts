import { promises as fs } from 'fs';
import { withTempPackageEach } from '../../../test/helpers';
import { BuildVariant } from '../../config';
import { createPackage } from './create-package';

describe('package tarball', () => {
  const tmpPkg = withTempPackageEach();

  it('packages the executable(s)', async() => {
    const tarball = await createPackage(tmpPkg.tarballDir, BuildVariant.Linux, tmpPkg.pkgConfig);
    await fs.access(tarball.path);
  });
});
