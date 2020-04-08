import { expect } from 'chai';
import Platform from './platform';
import zip, { zipPath } from './zip';

describe('zip module', () => {
  describe('.zipPath', () => {
    context('when the platform is windows', () => {
      it('returns the windows zip', () => {
        expect(zipPath('', Platform.Windows, '1.0.0')).to.equal('mongosh-1.0.0-win32.zip');
      });
    });

    context('when the platform is macos', () => {
      it('returns the tarball', () => {
        expect(zipPath('', Platform.MacOs, '1.0.0')).to.equal('mongosh-1.0.0-darwin.tgz');
      });
    });

    context('when the platform is linux', () => {
      it('returns the tarball', () => {
        expect(zipPath('', Platform.Linux, '1.0.0')).to.equal('mongosh-1.0.0-linux.tgz');
      });
    });
  });
});
