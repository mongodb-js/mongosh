import { expect } from 'chai';
import childProcess from 'child_process';
import commandExists from 'command-exists';
import { promises as fs } from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import { withTempPackageEach } from '../../../test/helpers';
import { createPackage } from './create-package';
import { createRedhatPackage } from './redhat';

const execFile = promisify(childProcess.execFile);

describe('tarball redhat', function () {
  const tmpPkg = withTempPackageEach();

  it('packages the executable(s)', async function () {
    try {
      await commandExists('rpmbuild');
    } catch {
      this.skip();
    }

    const tarball = await createPackage(
      tmpPkg.tarballDir,
      'rpm-x64',
      tmpPkg.pkgConfig
    );

    await fs.access(tarball.path);
    const { stdout } = await execFile('rpm', ['-qlpi', tarball.path]);
    expect(stdout).to.match(/Name\s+:\s+foobar/);
    expect(stdout).to.match(/Version\s+:\s+1.0.0/);
    expect(stdout).to.match(/License\s+:\s+Banana and Apple/);
    expect(stdout).to.match(/URL\s+:\s+https:\/\/example.org/);
    expect(stdout).to.match(/Summary\s+:\s+Dummy package/);
    expect(stdout).to.match(/^\/usr\/bin\/foo$/m);
    expect(stdout).to.match(/^\/usr\/lib(64)?\/bar$/m);
    expect(stdout).to.match(/^\/usr\/share\/doc\/foobar-1.0.0\/README$/m);
    expect(stdout).to.match(
      /^\/usr\/share\/licenses\/foobar-1.0.0\/LICENSE_bar$/m
    );
    expect(stdout).to.match(
      /^\/usr\/share\/licenses\/foobar-1.0.0\/LICENSE_foo$/m
    );
    expect(stdout).to.match(/^\/usr\/share\/man\/man1\/foobar.1.gz$/m);
  });

  it('determines and copies created RPM', async function () {
    const content = await fs.readFile(__filename);
    const execFileStub = async (cmd: string, args: string[]) => {
      const rpmDir = path.join(
        path.dirname(path.dirname(args[1])),
        'RPMS',
        'x86_64'
      );
      await fs.mkdir(rpmDir, { recursive: true });
      await fs.writeFile(path.join(rpmDir, 'somefile.rpm'), content);
    };

    const outFile = path.join(tmpPkg.tarballDir, 'out.rpm');
    await createRedhatPackage(
      tmpPkg.pkgConfig,
      tmpPkg.pkgConfig.rpmTemplateDir,
      'x64',
      outFile,
      execFileStub as any
    );
    expect((await fs.readFile(outFile)).toString('utf8')).to.equal(
      content.toString('utf8')
    );
  });

  it('fails if there are multiple RPMs generated', async function () {
    const content = await fs.readFile(__filename);
    const execFileStub = async (cmd: string, args: string[]) => {
      const rpmDir = path.join(
        path.dirname(path.dirname(args[1])),
        'RPMS',
        'x86_64'
      );
      await fs.mkdir(rpmDir, { recursive: true });
      await fs.writeFile(path.join(rpmDir, 'somefile.rpm'), content);
      await fs.writeFile(path.join(rpmDir, 'somefile2.rpm'), content);
    };

    const outFile = path.join(tmpPkg.tarballDir, 'out.rpm');
    try {
      await createRedhatPackage(
        tmpPkg.pkgConfig,
        tmpPkg.pkgConfig.rpmTemplateDir,
        'x64',
        outFile,
        execFileStub as any
      );
    } catch (e: any) {
      expect(e.message).to.contain('Don’t know which RPM from');
      return;
    }
    expect.fail('Expected error');
  });
});
