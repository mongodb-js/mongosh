import { expect } from 'chai';
import { getPackageFile } from './get-package-file';

describe('tarball getPackageFile', () => {
  context('when the build variant is windows', () => {
    it('returns the windows tarball name', () => {
      expect(
        getPackageFile('win32-x64', () => ({ metadata: { version: '1.0.0', name: 'mongosh' } }) as any)
      ).to.deep.equal({
        path: 'mongosh-1.0.0-win32-x64.zip',
        contentType: 'application/zip'
      });
    });
  });

  context('when the build variant is windows MSI', () => {
    it('returns the windows MSI name', () => {
      expect(
        getPackageFile('win32msi-x64', () => ({ metadata: { version: '1.0.0', name: 'mongosh' } }) as any)
      ).to.deep.equal({
        path: 'mongosh-1.0.0-x64.msi',
        contentType: 'application/x-msi'
      });
    });
  });

  context('when the build variant is macos', () => {
    it('returns the tarball details', () => {
      expect(
        getPackageFile('darwin-x64', () => ({ metadata: { version: '1.0.0', name: 'mongosh' } }) as any)
      ).to.deep.equal({
        path: 'mongosh-1.0.0-darwin-x64.zip',
        contentType: 'application/zip'
      });
    });
  });

  context('when the build variant is linux', () => {
    it('returns the tarball details', () => {
      expect(
        getPackageFile('linux-x64', () => ({ metadata: { version: '1.0.0', name: 'mongosh' } }) as any)
      ).to.deep.equal({
        path: 'mongosh-1.0.0-linux-x64.tgz',
        contentType: 'application/gzip'
      });
    });
  });

  context('when the build variant is debian', () => {
    it('returns the tarball details', () => {
      expect(
        getPackageFile('deb-x64', () => ({ metadata: { version: '1.0.0', debName: 'mongodb-mongosh' } }) as any)
      ).to.deep.equal({
        path: 'mongodb-mongosh_1.0.0_amd64.deb',
        contentType: 'application/vnd.debian.binary-package'
      });
    });
  });

  context('when the build variant is rhel', () => {
    it('returns the tarball details', () => {
      expect(
        getPackageFile('rpm-x64', () => ({ metadata: { version: '1.0.0', rpmName: 'mongodb-mongosh' } }) as any)
      ).to.deep.equal({
        path: 'mongodb-mongosh-1.0.0.x86_64.rpm',
        contentType: 'application/x-rpm'
      });
    });
  });
});
