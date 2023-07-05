import { expect } from 'chai';
import Sinon from 'sinon';
import { promises as fs } from 'fs';
import { getLinuxOsRelease } from './get-os-info';

describe('getLinuxOsRelease', function () {
  describe('on non-linux platforms', function () {
    const sandbox = Sinon.createSandbox();
    beforeEach(function () {
      sandbox.stub(process, 'platform').value('win32');
    });
    afterEach(function () {
      sandbox.restore();
    });
    it('does not return linux os info', async function () {
      expect(await getLinuxOsRelease()).to.deep.eq({});
    });
  });

  describe('on linux platforms', function () {
    const sandbox = Sinon.createSandbox();

    beforeEach(function () {
      sandbox.stub(process, 'platform').value('linux');
    });

    afterEach(function () {
      sandbox.restore();
    });

    it('returns info parsed from /etc/os-release file', async function () {
      sandbox
        .stub(fs, 'readFile')
        .resolves('ID=\'some=os=id\'\nVERSION_ID="1.2.3"\n   \n');

      expect(await getLinuxOsRelease()).to.deep.eq({
        os_linux_dist: 'some=os=id',
        os_linux_release: '1.2.3',
      });
    });

    it('returns "Unknown" when file could not be read for any reason', async function () {
      sandbox.stub(fs, 'readFile').rejects(new Error('Whoops'));

      expect(await getLinuxOsRelease()).to.deep.eq({
        os_linux_dist: 'Unknown',
        os_linux_release: 'Unknown',
      });
    });

    it('returns "Unknown" when values are not present', async function () {
      sandbox
        .stub(fs, 'readFile')
        .resolves('NOT_ID=some-os-id\nNOT_VERSION_ID="1.2.3"\n');

      expect(await getLinuxOsRelease()).to.deep.eq({
        os_linux_dist: 'Unknown',
        os_linux_release: 'Unknown',
      });
    });
  });
});
