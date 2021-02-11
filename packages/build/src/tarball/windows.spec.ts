import { expect } from 'chai';
import { promises as fs } from 'fs';
import * as path from 'path';
import sinon from 'ts-sinon';
import { withTempPackageEach } from '../../test/helpers';
import { BuildVariant } from '../config';
import { createTarball } from './create-tarball';
import { tarballWindows, tarballWindowsMSI } from './windows';

class FakeNOENTError extends Error {
    code = 'ENOENT';

    constructor() {
      super();
    }
}

describe('tarball windows', () => {
  const tmpPkg = withTempPackageEach();

  describe('ZIP target', () => {
    it('packages the executable(s)', async() => {
      const tarball = await createTarball(tmpPkg.tarballDir, BuildVariant.Windows, tmpPkg.pkgConfig);
      await fs.access(tarball.path);
    });

    it('falls back to 7zip if zip is not available', async() => {
      const execFileStub = sinon.stub();
      execFileStub.withArgs('zip', sinon.match.any, sinon.match.any)
        .rejects(new FakeNOENTError());

      await tarballWindows(tmpPkg.pkgConfig, path.join(tmpPkg.tarballDir, 'outfile.zip'), execFileStub);
      expect(execFileStub).to.have.been.calledTwice;
      expect(execFileStub.getCalls()[1].args[0]).to.equal('7z');
    });

    it('rethrows errors', async() => {
      const execFileStub = sinon.stub();
      const expectedError = new Error();
      execFileStub.withArgs('zip', sinon.match.any, sinon.match.any)
        .rejects(expectedError);

      try {
        await tarballWindows(tmpPkg.pkgConfig, path.join(tmpPkg.tarballDir, 'outfile.zip'), execFileStub);
      } catch (e) {
        return expect(e).to.equal(expectedError);
      }
      expect.fail('Expected error');
    });
  });

  describe('MSI target', () => {
    it('packages the executable(s) with WIX', async function() {
      if (!process.env.WIX) {
        this.skip();
        return;
      }

      const tarball = await createTarball(tmpPkg.tarballDir, BuildVariant.WindowsMSI, tmpPkg.pkgConfig);
      await fs.access(tarball.path);
    });

    it('prepares and copies MSI executable', async() => {
      const fileContent = await fs.readFile(__filename, { encoding: 'utf8' });
      let msiDir: string | undefined;
      const execFileStub = async(cmd: string, args: string[], opts: {cwd: string}) => {
        if (msiDir) {
          expect(msiDir).to.equal(opts.cwd);
          const releaseDir = path.join(msiDir, 'bin', 'Release');
          await fs.mkdir(releaseDir, { recursive: true });
          await fs.writeFile(path.join(releaseDir, path.basename(outFile)), fileContent, { encoding: 'utf8' });
        }
        msiDir = opts.cwd;
      };
      const outFile = path.join(tmpPkg.tarballDir, 'outfile.msi');

      await tarballWindowsMSI(
        tmpPkg.pkgConfig,
        tmpPkg.pkgConfig.msiTemplateDir,
        outFile,
        execFileStub as any
      );
      expect(await fs.readFile(outFile, { encoding: 'utf8' })).to.equal(fileContent);
    });
  });
});
