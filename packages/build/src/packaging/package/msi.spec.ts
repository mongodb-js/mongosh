import { expect } from 'chai';
import { promises as fs } from 'fs';
import * as path from 'path';
import { withTempPackageEach } from '../../../test/helpers';
import { BuildVariant } from '../../config';
import { createPackage } from './create-package';
import { createMsiPackage } from './msi';

describe('package windows', () => {
  const tmpPkg = withTempPackageEach();

  it('packages the executable(s) with WIX', async function() {
    if (!process.env.WIX) {
      this.skip();
    }

    const tarball = await createPackage(tmpPkg.tarballDir, BuildVariant.WindowsMSI, tmpPkg.pkgConfig);
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

    await createMsiPackage(
      tmpPkg.pkgConfig,
      tmpPkg.pkgConfig.msiTemplateDir,
      outFile,
        execFileStub as any
    );
    expect(await fs.readFile(outFile, { encoding: 'utf8' })).to.equal(fileContent);
  });
});
