import os from 'os';
import fs from 'fs';
import path from 'path';
import { expect } from 'chai';
import BuildVariant from './build-variant';
import {
  tarball,
  tarballPath,
  tarballPosix,
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
        expect(tarballPath('', BuildVariant.Ubuntu, '1.0.0')).
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

    before(() => {
      return tarballPosix(__dirname, expectedTarball);
    });

    after((done) => {
      fs.unlink(expectedTarball, done);
    });

    it('builds the executable', (done) => {
      fs.stat(expectedTarball, (error) => {
        expect(error).to.equal(null);
        done();
      });
    });
  });

  describe('.tarballDebian', () => {
    const version = '1.0.0';
    const inputFile = path.join(__dirname, '..', 'examples', 'input.js');
    const expectedTarball = tarballPath(__dirname, BuildVariant.Debian, version);

    before(() => {
      return tarballDebian(inputFile, __dirname, version, path.join(__dirname, '../../..'));
    });

    after((done) => {
      fs.unlink(expectedTarball, done);
    });

    it('builds the executable', (done) => {
      fs.stat(expectedTarball, (error) => {
        expect(error).to.equal(null);
        done();
      });
    });
  });

  describe('.tarballWindows', () => {
    const version = '1.0.0';
    const expectedTarball = tarballPath(__dirname, BuildVariant.Windows, version);
    const inputFile = path.join(__dirname, '..', 'examples', 'input.js');

    before(() => {
      return tarballWindows(inputFile, expectedTarball);
    });

    after((done) => {
      fs.unlink(expectedTarball, done);
    });

    it('builds the executable', (done) => {
      fs.stat(expectedTarball, (error) => {
        expect(error).to.equal(null);
        done();
      });
    });
  });

  describe('.tarball', () => {
    const platform = process.env.BUILD_VARIANT;
    console.log(platform)
    const version = '1.0.0';
    const expectedTarball = tarballPath(__dirname, platform, version);
    const inputFile = path.join(__dirname, '..', 'examples', 'input.js');
    const rootDir = path.join(__dirname, '../../..');

    before(() => {
      return tarball(inputFile, __dirname, platform, version, rootDir);
    });

    after((done) => {
      fs.unlink(expectedTarball, done);
    });

    it('builds the executable', (done) => {
      fs.stat(expectedTarball, (error) => {
        expect(error).to.equal(null);
        done();
      });
    });
  });
});
