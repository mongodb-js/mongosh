import { expect } from 'chai';
import nock from 'nock';

import {
  createDownloadCenterConfig,
  verifyDownloadCenterConfig
} from './download-center';

describe('download center module', () => {
  describe('.createDownloadCenterConfig', () => {
    let config;

    before(() => {
      config = createDownloadCenterConfig('1.2.2');
    });

    it('returns the string with the macos version injected', () => {
      expect(config).to.include('mongosh-1.2.2-darwin.zip');
    });

    it('returns the string with the linux version injected', () => {
      expect(config).to.include('mongosh-1.2.2-linux.tgz');
    });

    it('returns the string with the win version injected', () => {
      expect(config).to.include('mongosh-1.2.2-win32.zip');
    });
  });

  describe('.verifyDownloadCenterConfig', () => {
    const links = {
      darwin: 'https://downloads.mongodb.com/compass/mongosh-0.2.2-darwin.zip',
      win32: 'https://downloads.mongodb.com/compass/mongosh-0.2.2-win32.zip',
      linux: 'https://downloads.mongodb.com/compass/mongosh-0.2.2-linux.tgz',
      debian: 'https://downloads.mongodb.com/compass/mongosh_0.2.2_amd64.deb'
    };

    const downloadCenterJson = {
      'versions': [
        {
          '_id': '0.2.2',
          'version': '0.2.2',
          'platform': [
            {
              'arch': 'x64',
              'os': 'darwin',
              'name': 'MacOS 64-bit (10.10+)',
              'download_link': links.darwin
            },
            {
              'arch': 'x64',
              'os': 'win32',
              'name': 'Windows 64-bit (7+)',
              'download_link': links.win32
            },
            {
              'arch': 'x64',
              'os': 'linux',
              'name': 'Linux 64-bit',
              'download_link': links.linux
            },
            {
              'arch': 'x64',
              'os': 'debian',
              'name': 'Debian 64-bit',
              'download_link': links.debian
            }
          ]
        }
      ],
      'manual_link': 'https://docs.mongodb.org/manual/products/mongosh',
      'release_notes_link': 'https://github.com/mongodb-js/mongosh/releases/tag/v0.2.2',
      'previous_releases_link': '',
      'development_releases_link': '',
      'supported_browsers_link': '',
      'tutorial_link': 'test'
    };

    function nockLink(link, status, headers = {}): void {
      const url = new URL(link);
      nock(url.origin).head(url.pathname).reply(status, undefined, headers);
    }

    context('when all links are correct', () => {
      beforeEach(() => {
        nock.cleanAll();
        nockLink(links.darwin, 302, { 'Location': 'http://example.com/redirect' });
        nockLink(links.win32, 200);
        nockLink(links.linux, 200);
        nockLink(links.debian, 200);
        nockLink('http://example.com/redirect', 200);
      });

      afterEach(() => {
        expect(nock.isDone(), 'HTTP calls to link urls were not done').to.be.true;
      });

      it('does not throw if all the downloads are ok', async() => {
        await verifyDownloadCenterConfig(downloadCenterJson);
      });
    });

    context('with broken links', () => {
      beforeEach(() => {
        nock.cleanAll();
        nockLink(links.darwin, 200);
        nockLink(links.win32, 302, { 'Location': 'http://example.com/redirect' });
        nockLink(links.linux, 200);
        nockLink(links.debian, 404);
        nockLink('http://example.com/redirect', 404);
      });

      afterEach(() => {
        expect(nock.isDone(), 'HTTP calls to link urls were not done').to.be.true;
      });

      it('throws reporting broken urls', async() => {
        const error = await (verifyDownloadCenterConfig(downloadCenterJson).catch((e) => e));
        expect(error).not.to.be.undefined;
        expect(error.message).to.equal('Download center urls broken:' +
      ' {"https://downloads.mongodb.com/compass/mongosh-0.2.2-win32.zip":404,' +
      '"https://downloads.mongodb.com/compass/mongosh_0.2.2_amd64.deb":404}'
        );
      });
    });

    after(nock.restore);
  });
});
