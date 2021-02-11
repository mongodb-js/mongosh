import { expect } from 'chai';
import childProcess from 'child_process';
import commandExists from 'command-exists';
import { promises as fs } from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import { withTempPackageEach } from '../../test/helpers';
import { BuildVariant } from '../config';
import { createTarball } from './create-tarball';
import { tarballDebian } from './debian';

const execFile = promisify(childProcess.execFile);

describe('tarball debian', () => {
  const tmpPkg = withTempPackageEach();

  it('packages the executable(s)', async function() {
    try {
      await commandExists('dpkg');
    } catch {
      this.skip();
      return;
    }

    const tarball = await createTarball(tmpPkg.tarballDir, BuildVariant.Debian, tmpPkg.pkgConfig);
    await fs.access(tarball.path);
    {
      const { stdout } = await execFile('dpkg', ['-c', tarball.path]);
      expect(stdout).to.match(/^-rwxr.xr-x.+\/usr\/bin\/foo$/m);
      expect(stdout).to.match(/^-rwxr.xr-x.+\/usr\/libexec\/bar$/m);
      expect(stdout).to.match(/^-rw-r.-r--.+\/usr\/share\/doc\/foobar\/LICENSE_bar$/m);
      expect(stdout).to.match(/^-rw-r.-r--.+\/usr\/share\/doc\/foobar\/LICENSE_foo$/m);
      expect(stdout).to.match(/^-rw-r.-r--.+\/usr\/share\/doc\/foobar\/README$/m);
      expect(stdout).to.match(/^-rw-r.-r--.+\/usr\/share\/doc\/foobar\/copyright$/m);
    }
    {
      const { stdout } = await execFile('dpkg', ['-I', tarball.path]);
      expect(stdout).to.match(/Package: foobar/);
      expect(stdout).to.match(/Version: 1.0.0/);
      expect(stdout).to.match(/Maintainer: Somebody <somebody@example.org>/);
      expect(stdout).to.match(/Homepage: https:\/\/example.org/);
      expect(stdout).to.match(/Description: Dummy package/);
    }
  });

  it('determines and copies created DEB', async() => {
    const content = await fs.readFile(__filename, { encoding: 'utf8' });
    const execFileStub = async(cmd: string, args: string[]) => {
      const debName = path.join(path.dirname(args[1]), `${tmpPkg.pkgConfig.metadata.name}.deb`);
      await fs.writeFile(debName, content, { encoding: 'utf8' });
    };

    const outFile = path.join(tmpPkg.tarballDir, 'out.deb');
    await tarballDebian(
      tmpPkg.pkgConfig,
      tmpPkg.pkgConfig.debTemplateDir,
      outFile,
      execFileStub as any
    );
    expect((await fs.readFile(outFile, { encoding: 'utf8' }))).to.equal(content);
  });
});
