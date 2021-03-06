import { expect } from 'chai';
import { promises as fs } from 'fs';
import * as path from 'path';
import sinon from 'ts-sinon';
import { withTempPackageEach } from '../../../test/helpers';
import { BuildVariant } from '../../config';
import { createPackage } from './create-package';
import { createZipPackage } from './zip';

class FakeNOENTError extends Error {
    code = 'ENOENT';

    constructor() {
      super();
    }
}

describe('package zip', () => {
  const tmpPkg = withTempPackageEach();

  it('packages the executable(s)', async() => {
    const tarball = await createPackage(tmpPkg.tarballDir, BuildVariant.Windows, tmpPkg.pkgConfig);
    await fs.access(tarball.path);
  });

  it('falls back to 7zip if zip is not available', async() => {
    const execFileStub = sinon.stub();
    execFileStub.withArgs('zip', sinon.match.any, sinon.match.any)
      .rejects(new FakeNOENTError());

    await createZipPackage(tmpPkg.pkgConfig, path.join(tmpPkg.tarballDir, 'outfile.zip'), execFileStub);
    expect(execFileStub).to.have.been.calledTwice;
    expect(execFileStub.getCalls()[1].args[0]).to.equal('7z');
  });

  it('rethrows errors', async() => {
    const execFileStub = sinon.stub();
    const expectedError = new Error();
    execFileStub.withArgs('zip', sinon.match.any, sinon.match.any)
      .rejects(expectedError);

    try {
      await createZipPackage(tmpPkg.pkgConfig, path.join(tmpPkg.tarballDir, 'outfile.zip'), execFileStub);
    } catch (e) {
      return expect(e).to.equal(expectedError);
    }
    expect.fail('Expected error');
  });
});
