import path from 'path';
import os from 'os';
import fs from 'fs';
import { expect } from 'chai';
import Platform from './platform';
import zip, {
  zipPath,
  zipPosix,
  zipWindows
} from './zip';

describe('zip module', () => {
  describe('.zipPath', () => {
    context('when the platform is windows', () => {
      it('returns the windows zip name', () => {
        expect(zipPath('', Platform.Windows, '1.0.0')).
          to.equal('mongosh-1.0.0-win32.zip');
      });
    });

    context('when the platform is macos', () => {
      it('returns the tarball name', () => {
        expect(zipPath('', Platform.MacOs, '1.0.0')).
          to.equal('mongosh-1.0.0-darwin.zip');
      });
    });

    context('when the platform is linux', () => {
      it('returns the tarball name', () => {
        expect(zipPath('', Platform.Linux, '1.0.0')).
          to.equal('mongosh-1.0.0-linux.tgz');
      });
    });
  });

  describe('.zipPosix', () => {
    const version = '1.0.0';
    const expectedZip = zipPath(__dirname, Platform.Linux, version);

    before(() => {
      return zipPosix(__dirname, expectedZip);
    });

    after((done) => {
      fs.unlink(expectedZip, done);
    });

    it('builds the executable', (done) => {
      fs.stat(expectedZip, (error) => {
        expect(error).to.equal(null);
        done();
      });
    });
  });

  describe('.zipWindows', () => {
    const version = '1.0.0';
    const expectedZip = zipPath(__dirname, Platform.Windows, version);
    const inputFile = path.join(__dirname, '..', 'examples', 'input.js');

    before(() => {
      return zipWindows(inputFile, expectedZip);
    });

    after((done) => {
      fs.unlink(expectedZip, done);
    });

    it('builds the executable', (done) => {
      fs.stat(expectedZip, (error) => {
        expect(error).to.equal(null);
        done();
      });
    });
  });

  describe('.zip', () => {
    const platform = os.platform();
    const version = '1.0.0';
    const expectedZip = zipPath(__dirname, platform, version);
    const inputFile = path.join(__dirname, '..', 'examples', 'input.js');

    before(() => {
      return zip(inputFile, __dirname, platform, version);
    });

    after((done) => {
      fs.unlink(expectedZip, done);
    });

    it('builds the executable', (done) => {
      fs.stat(expectedZip, (error) => {
        expect(error).to.equal(null);
        done();
      });
    });
  });
});
