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
    const outFile = path.join(tmpPkg.tarballDir, 'outfile.zip');
    expect(execFileStub.callCount).to.equal(2);
    expect(execFileStub.getCalls()[1].args[0]).to.equal('7z');
    expect(execFileStub.getCalls()[1].args[1]).to.deep.equal([
      'a',
      outFile,
      '.',
    ]);
  });

  // TODO(DEVPROD-42642): drop the workaround test once 7-Zip is restored on the Windows image.
  it('falls back to 7z.exe if the bare 7z does not resolve', async function () {
    const execFileStub = sinon.stub();
    for (const missing of ['zip', '7z']) {
      execFileStub
        .withArgs(missing, sinon.match.any, sinon.match.any)
        .rejects(new FakeNOENTError());
    }

    const outFile = path.join(tmpPkg.tarballDir, 'outfile.zip');
    await createZipPackage(tmpPkg.pkgConfig, outFile, execFileStub);
    expect(execFileStub.callCount).to.equal(3);
    expect(execFileStub.lastCall.args[0]).to.equal('7z.exe');
    expect(execFileStub.lastCall.args[1]).to.deep.equal(['a', outFile, '.']);
  });

  // TODO(DEVPROD-42642): drop the workaround test once 7-Zip is restored on the Windows image.
  it('falls back to the 7-Zip install path if it is not on PATH at all', async function () {
    const execFileStub = sinon.stub();
    for (const missing of ['zip', '7z', '7z.exe']) {
      execFileStub
        .withArgs(missing, sinon.match.any, sinon.match.any)
        .rejects(new FakeNOENTError());
    }

    const outFile = path.join(tmpPkg.tarballDir, 'outfile.zip');
    await createZipPackage(tmpPkg.pkgConfig, outFile, execFileStub);
    expect(execFileStub.callCount).to.equal(4);
    expect(execFileStub.lastCall.args[0]).to.equal(
      'C:\\Program Files\\7-Zip\\7z.exe'
    );
    expect(execFileStub.lastCall.args[1]).to.deep.equal(['a', outFile, '.']);
  });

  // TODO(DEVPROD-42642): drop the workaround test once 7-Zip is restored on the Windows image.
  it('tries the x86 7-Zip install path last', async function () {
    const execFileStub = sinon.stub();
    for (const missing of [
      'zip',
      '7z',
      '7z.exe',
      'C:\\Program Files\\7-Zip\\7z.exe',
    ]) {
      execFileStub
        .withArgs(missing, sinon.match.any, sinon.match.any)
        .rejects(new FakeNOENTError());
    }

    await createZipPackage(
      tmpPkg.pkgConfig,
      path.join(tmpPkg.tarballDir, 'outfile.zip'),
      execFileStub
    );
    expect(execFileStub.callCount).to.equal(5);
    expect(execFileStub.lastCall.args[0]).to.equal(
      'C:\\Program Files (x86)\\7-Zip\\7z.exe'
    );
  });

  // TODO(DEVPROD-42642): keep this test, but update the expected last
  // candidate once the workaround entries are dropped.
  it('rethrows ENOENT if no archiver is available at all', async function () {
    const execFileStub = sinon.stub().rejects(new FakeNOENTError());

    try {
      await createZipPackage(
        tmpPkg.pkgConfig,
        path.join(tmpPkg.tarballDir, 'outfile.zip'),
        execFileStub
      );
    } catch (e: any) {
      expect(e.code).to.equal('ENOENT');
      expect(execFileStub.lastCall.args[0]).to.equal(
        'C:\\Program Files (x86)\\7-Zip\\7z.exe'
      );
      return;
    }
    expect.fail('Expected error');
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
