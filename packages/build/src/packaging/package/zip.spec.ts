import { expect } from 'chai';
import { spawnSync } from 'child_process';
import { promises as fs } from 'fs';
import * as path from 'path';
import sinon from 'sinon';
import { withTempPackageEach } from '../../../test/helpers';
import { createPackage } from './create-package';
import { createZipPackage } from './zip';

class FakeNOENTError extends Error {
  code = 'ENOENT';

  constructor() {
    super();
  }
}

describe('package zip', function () {
  const tmpPkg = withTempPackageEach();

  it('packages the executable(s)', async function () {
    const tarball = await createPackage(
      tmpPkg.tarballDir,
      'win32-x64',
      tmpPkg.pkgConfig
    );
    await fs.access(tarball.path);
    const zipname = path.basename(tarball.path).replace(/\.zip$/, '');

    const unzip = spawnSync('unzip', ['-l', tarball.path], {
      encoding: 'utf-8',
    });
    expect(unzip.error).to.be.undefined;
    expect(unzip.stderr).to.be.empty;

    const lines = unzip.stdout.split('\n');
    expect(lines).to.have.length(14);

    for (let i = 3; i < 10; i++) {
      const filename = /([^\s]+)$/.exec(lines[i])?.[1] ?? '';
      expect(filename.startsWith(`${zipname}/`)).to.be.true;
    }
  });

  it('falls back to 7zip if zip is not available', async function () {
    const execFileStub = sinon.stub();
    execFileStub
      .withArgs('zip', sinon.match.any, sinon.match.any)
      .rejects(new FakeNOENTError());

    await createZipPackage(
      tmpPkg.pkgConfig,
      path.join(tmpPkg.tarballDir, 'outfile.zip'),
      execFileStub
    );
    expect(execFileStub).to.have.been.calledTwice;
    expect(execFileStub.getCalls()[1].args[0]).to.equal('7z');
  });

  it('rethrows errors', async function () {
    const execFileStub = sinon.stub();
    const expectedError = new Error();
    execFileStub
      .withArgs('zip', sinon.match.any, sinon.match.any)
      .rejects(expectedError);

    try {
      await createZipPackage(
        tmpPkg.pkgConfig,
        path.join(tmpPkg.tarballDir, 'outfile.zip'),
        execFileStub
      );
    } catch (e: any) {
      return expect(e).to.equal(expectedError);
    }
    expect.fail('Expected error');
  });
});
