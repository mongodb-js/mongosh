import BuildVariant from './build-variant';
import { promises as fs } from 'fs';
import Platform from './platform';
import { expect } from 'chai';
import path from 'path';
import os from 'os';
import {
  createTarball,
  tarballPath,
  tarballPosix,
  tarballRedhat,
  tarballDebian,
  tarballWindows
} from './tarball';

describe('tarball module', () => {
  describe('.tarballPath', () => {
    context('when the build variant is windows', () => {
      it('returns the windows tarball name', () => {
        expect(tarballPath('', BuildVariant.Windows, '1.0.0')).
          to.equal('mongosh-1.0.0-win32.zip');
      });
    });

    context('when the build variant is macos', () => {
      it('returns the tarball name', () => {
        expect(tarballPath('', BuildVariant.MacOs, '1.0.0')).
          to.equal('mongosh-1.0.0-darwin.zip');
      });
    });

    context('when the build variant is linux', () => {
      it('returns the tarball name', () => {
        expect(tarballPath('', BuildVariant.Linux, '1.0.0')).
          to.equal('mongosh-1.0.0-linux.tgz');
      });
    });

    context('when the build variant is debian', () => {
      it('returns the tarball name', () => {
        expect(tarballPath('', BuildVariant.Debian, '1.0.0')).
          to.equal('mongosh_1.0.0_amd64.deb');
      });
    });
  });

  describe('.tarballPosix', () => {
    const version = '1.0.0';
    const expectedTarball = tarballPath(__dirname, BuildVariant.Linux, version);

    after(async() => {
      await fs.unlink(expectedTarball);
    });

    it('builds the executable', async() => {
      await tarballPosix(__dirname, expectedTarball);

      let accessErr;
      try {
        await fs.access(expectedTarball);
      } catch (err) {
        accessErr = err;
      }

      expect(accessErr).to.be.undefined;
    });
  });

  // macos and windows build variants does not come with installed 'dpkg' so
  // this test fails. Run this test only on linux platforms.
  if (os.platform() === Platform.Linux) {
    describe('.tarballDebian', () => {
      const version = '1.0.0';
      const inputFile = path.join(__dirname, '..', 'examples', 'input.js');
      const expectedTarball = tarballPath(__dirname, BuildVariant.Debian, version);

      after(async () => {
        await fs.unlink(expectedTarball);
      });

      it('builds the executable', async() => {
        await tarballDebian(inputFile, __dirname, version, path.join(__dirname, '../../..'));

        let accessErr;
        try {
          await fs.access(expectedTarball);
        } catch (err) {
          accessErr = err;
        }

        expect(accessErr).to.be.undefined;
      });
    });

    describe('.tarballRedhat', () => {
      const version = '1.0.0';
      const inputFile = path.join(__dirname, '..', 'examples', 'input.js');
      const expectedTarball = tarballPath(__dirname, BuildVariant.Redhat, version);

      after(async () => {
        await fs.unlink(expectedTarball);
      });

      it('builds the executable', async() => {
        await tarballRedhat(inputFile, __dirname, version, path.join(__dirname, '../../..'));

        let accessErr;
        try {
          await fs.access(expectedTarball);
        } catch (err) {
          accessErr = err;
        }

        expect(accessErr).to.be.undefined;
      });
    });
  }

  describe('.tarballWindows', () => {
    const version = '1.0.0';
    const expectedTarball = tarballPath(__dirname, BuildVariant.Windows, version);
    const inputFile = path.join(__dirname, '..', 'examples', 'input.js');

    after(async() => {
      await fs.unlink(expectedTarball);
    });

    it('builds the executable', async() => {
      await tarballWindows(inputFile, expectedTarball);

      let accessErr;
      try {
        await fs.access(expectedTarball);
      } catch (err) {
        accessErr = err;
      }

      expect(accessErr).to.be.undefined;
    });
  });

  describe('.tarball', () => {
    const buildVariant = process.env.BUILD_VARIANT;
    const version = '1.0.0';
    const expectedTarball = tarballPath(__dirname, buildVariant, version);
    const inputFile = path.join(__dirname, '..', 'examples', 'input.js');
    const rootDir = path.join(__dirname, '../../..');

    after(async () =>{
      await fs.unlink(expectedTarball);
    });

    it('builds the executable', async () => {
      await createTarball(inputFile, __dirname, buildVariant, version, rootDir);

      let accessErr;
      try {
        await fs.access(expectedTarball);
      } catch (err) {
        accessErr = err;
      }

      expect(accessErr).to.be.undefined;
    });
  });
});
