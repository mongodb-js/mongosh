import { expect } from 'chai';
import childProcess from 'child_process';
import commandExists from 'command-exists';
import { promises as fs } from 'fs';
import path from 'path';
import rimraf from 'rimraf';
import { promisify } from 'util';
import BuildVariant from './build-variant';
import { createTarball, getTarballFile, PackageInformation } from './tarball';

const execFile = promisify(childProcess.execFile);

describe('tarball module', () => {
  describe('.getTarballFile', () => {
    context('when the build variant is windows', () => {
      it('returns the windows tarball name', () => {
        expect(
          getTarballFile(BuildVariant.Windows, '1.0.0', 'mongosh')
        ).to.deep.equal({
          path: 'mongosh-1.0.0-win32.zip',
          contentType: 'application/zip'
        });
      });
    });

    context('when the build variant is macos', () => {
      it('returns the tarball details', () => {
        expect(
          getTarballFile(BuildVariant.MacOs, '1.0.0', 'mongosh')
        ).to.deep.equal({
          path: 'mongosh-1.0.0-darwin.zip',
          contentType: 'application/zip'
        });
      });
    });

    context('when the build variant is linux', () => {
      it('returns the tarball details', () => {
        expect(
          getTarballFile(BuildVariant.Linux, '1.0.0', 'mongosh')
        ).to.deep.equal({
          path: 'mongosh-1.0.0-linux.tgz',
          contentType: 'application/gzip'
        });
      });
    });

    context('when the build variant is debian', () => {
      it('returns the tarball details', () => {
        expect(
          getTarballFile(BuildVariant.Debian, '1.0.0', 'mongosh')
        ).to.deep.equal({
          path: 'mongosh_1.0.0_amd64.deb',
          contentType: 'application/vnd.debian.binary-package'
        });
      });
    });

    context('when the build variant is rhel', () => {
      it('returns the tarball details', () => {
        expect(
          getTarballFile(BuildVariant.Redhat, '1.0.0', 'mongosh')
        ).to.deep.equal({
          path: 'mongosh-1.0.0-x86_64.rpm',
          contentType: 'application/x-rpm'
        });
      });
    });
  });

  describe('package generation functions', () => {
    let tarballDir: string;
    const fakePkgDir = path.resolve(__dirname, '..', 'test', 'fixtures');
    const pkgConfig: PackageInformation = require(path.resolve(fakePkgDir, 'pkgconf.js'));

    before(async() => {
      tarballDir = path.resolve(__dirname, '..', '..', '..', 'tmp', `test-mongosh-build-${Date.now()}`);
      await fs.mkdir(tarballDir, { recursive: true });
    });

    after(async() => {
      await promisify(rimraf)(tarballDir);
    });

    describe('.tarballPosix', () => {
      it('packages the executable(s)', async() => {
        const tarball = await createTarball(tarballDir, BuildVariant.Linux, pkgConfig);
        await fs.access(tarball.path);
      });
    });

    describe('.tarballDebian', () => {
      beforeEach(async function() {
        try {
          await commandExists('dpkg');
        } catch {
          process.env.MONGOSH_TEST_NO_DPKG = 'yes';
        }
      });

      it('packages the executable(s)', async() => {
        const tarball = await createTarball(tarballDir, BuildVariant.Debian, pkgConfig);
        if (process.env.MONGOSH_TEST_NO_DPKG) {
          return;
        }
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
    });

    describe('.tarballRedhat', () => {
      // rpmbuild is not available everywhere. When it's not there, we skip
      // the part of the test that would actually generate the RPM.
      beforeEach(async function() {
        try {
          await commandExists('rpmbuild');
        } catch {
          process.env.MONGOSH_TEST_NO_RPMBUILD = 'yes';
        }
      });

      it('packages the executable(s)', async() => {
        const tarball = await createTarball(tarballDir, BuildVariant.Redhat, pkgConfig);
        if (process.env.MONGOSH_TEST_NO_RPMBUILD) {
          return;
        }
        await fs.access(tarball.path);
        const { stdout } = await execFile('rpm', ['-qlpi', tarball.path]);
        expect(stdout).to.match(/Name\s+:\s+foobar/);
        expect(stdout).to.match(/Version\s+:\s+1.0.0/);
        expect(stdout).to.match(/License\s+:\s+Banana and Apple/);
        expect(stdout).to.match(/URL\s+:\s+https:\/\/example.org/);
        expect(stdout).to.match(/Summary\s+:\s+Dummy package/);
        expect(stdout).to.match(/^\/usr\/bin\/foo$/m);
        expect(stdout).to.match(/^\/usr\/libexec\/bar$/m);
        expect(stdout).to.match(/^\/usr\/share\/doc\/foobar-1.0.0\/README$/m);
        expect(stdout).to.match(/^\/usr\/share\/licenses\/foobar-1.0.0\/LICENSE_bar$/m);
        expect(stdout).to.match(/^\/usr\/share\/licenses\/foobar-1.0.0\/LICENSE_foo$/m);
      });
    });

    describe('.tarballWindows', () => {
      it('packages the executable(s)', async() => {
        const tarball = await createTarball(tarballDir, BuildVariant.Windows, pkgConfig);
        await fs.access(tarball.path);
      });
    });
  });
});
