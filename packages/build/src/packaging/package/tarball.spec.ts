import { promises as fs } from 'fs';
import { withTempPackageEach } from '../../../test/helpers';
import { createPackage } from './create-package';

describe('package tarball', () => {
  const tmpPkg = withTempPackageEach();

  it('packages the executable(s)', async() => {
    const tarball = await createPackage(tmpPkg.tarballDir, 'linux-x64', tmpPkg.pkgConfig);
    await fs.access(tarball.path);
  });
});
