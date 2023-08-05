import type { DownloadCenterConfig } from '@mongodb-js/dl-center/dist/download-center-config';
import type { PackageInformationProvider } from '../packaging';
import { expect } from 'chai';
import sinon from 'ts-sinon';
import type { PackageVariant } from '../config';
import {
  createVersionConfig,
  createDownloadCenterConfig,
  getUpdatedDownloadCenterConfig,
  createAndPublishDownloadCenterConfig,
} from './config';

const packageInformation = (version: string) =>
  ((packageVariant: PackageVariant) => {
    const SHARED_OPENSSL_TAG = /-(openssl\d*)$/.exec(packageVariant)?.[1] || '';
    return {
      metadata: {
        version: version,
        name: 'mongosh',
        rpmName:
          'mongodb-mongosh' +
          (SHARED_OPENSSL_TAG ? `-shared-${SHARED_OPENSSL_TAG}` : ''),
        debName:
          'mongodb-mongosh' +
          (SHARED_OPENSSL_TAG ? `-shared-${SHARED_OPENSSL_TAG}` : ''),
      },
    };
  }) as PackageInformationProvider;

describe('DownloadCenter config', function () {
  describe('createVersionConfig', function () {
    it('sets the version correctly', function () {
      const version = createVersionConfig(packageInformation('1.2.2'));
      expect(version._id).to.equal('1.2.2');
      expect(version.version).to.equal('1.2.2');
    });

    it('has an artifact for darwin', function () {
      const version = createVersionConfig(packageInformation('1.2.2'));
      const platforms = version.platform.filter((p) => p.os === 'darwin');
      expect(platforms).to.have.length(2);
      expect(platforms[0].download_link).to.include(
        'mongosh-1.2.2-darwin-x64.zip'
      );
      expect(platforms[1].download_link).to.include(
        'mongosh-1.2.2-darwin-arm64.zip'
      );
    });

    it('has an artifact for linux', function () {
      const version = createVersionConfig(packageInformation('1.2.2'));
      const platforms = version.platform.filter(
        (p) => p.os === 'linux' && p.arch === 'x64'
      );
      expect(platforms).to.have.length(3);
      expect(platforms.map((p) => p.download_link)).to.deep.equal([
        'https://downloads.mongodb.com/compass/mongosh-1.2.2-linux-x64.tgz',
        'https://downloads.mongodb.com/compass/mongosh-1.2.2-linux-x64-openssl11.tgz',
        'https://downloads.mongodb.com/compass/mongosh-1.2.2-linux-x64-openssl3.tgz',
      ]);
    });

    it('has an MSI and ZIP artifacts for windows', function () {
      const version = createVersionConfig(packageInformation('1.2.2'));
      const platforms = version.platform.filter(
        (p) => p.os === 'win32' || p.os === 'win32msi'
      );
      expect(platforms).to.have.length(2);
      expect(platforms.map((p) => p.download_link)).to.deep.equal([
        'https://downloads.mongodb.com/compass/mongosh-1.2.2-win32-x64.zip',
        'https://downloads.mongodb.com/compass/mongosh-1.2.2-x64.msi',
      ]);
    });

    it('has an artifact for rpm', function () {
      const version = createVersionConfig(packageInformation('1.2.2'));
      const platforms = version.platform.filter(
        (p) => p.os === 'rpm' && p.arch === 'x64'
      );
      expect(platforms).to.have.length(3);
      expect(platforms.map((p) => p.download_link)).to.deep.equal([
        'https://downloads.mongodb.com/compass/mongodb-mongosh-1.2.2.x86_64.rpm',
        'https://downloads.mongodb.com/compass/mongodb-mongosh-shared-openssl11-1.2.2.x86_64.rpm',
        'https://downloads.mongodb.com/compass/mongodb-mongosh-shared-openssl3-1.2.2.x86_64.rpm',
      ]);
    });

    it('has an artifact for deb', function () {
      const version = createVersionConfig(packageInformation('1.2.2'));
      const platforms = version.platform.filter(
        (p) => p.os === 'deb' && p.arch === 'x64'
      );
      expect(platforms).to.have.length(3);
      expect(platforms.map((p) => p.download_link)).to.deep.equal([
        'https://downloads.mongodb.com/compass/mongodb-mongosh_1.2.2_amd64.deb',
        'https://downloads.mongodb.com/compass/mongodb-mongosh-shared-openssl11_1.2.2_amd64.deb',
        'https://downloads.mongodb.com/compass/mongodb-mongosh-shared-openssl3_1.2.2_amd64.deb',
      ]);
    });
  });

  describe('createDownloadCenterConfig', function () {
    it('creates a fresh download center config', function () {
      const getVersionConfig = sinon.stub().returns({ version: '1.2.2' });
      const config = createDownloadCenterConfig(getVersionConfig);
      expect(getVersionConfig).to.be.called;
      expect(config).deep.equal({
        versions: [{ version: '1.2.2' }],
        manual_link: 'https://docs.mongodb.org/manual/products/mongosh',
        release_notes_link: `https://github.com/mongodb-js/mongosh/releases/tag/v1.2.2`,
        previous_releases_link: '',
        development_releases_link: '',
        supported_browsers_link: '',
        tutorial_link: 'test',
      });
    });
  });

  describe('getUpdatedDownloadCenterConfig', function () {
    context('when the current release is a new major bump', function () {
      it('adds a new entry for the current release to the download center config, while keeping the other major versions', function () {
        const getVersionConfig1x = sinon.stub().returns({ version: '1.2.2' });
        const getVersionConfig2x = sinon.stub().returns({ version: '2.0.0' });
        const existingDownloadCenterConfig =
          createDownloadCenterConfig(getVersionConfig1x);
        expect(existingDownloadCenterConfig.versions).to.have.lengthOf(1);

        const updatedConfig = getUpdatedDownloadCenterConfig(
          existingDownloadCenterConfig,
          getVersionConfig2x
        );

        expect(updatedConfig).to.deep.equal({
          versions: [{ version: '1.2.2' }, { version: '2.0.0' }],
          manual_link: 'https://docs.mongodb.org/manual/products/mongosh',
          release_notes_link: `https://github.com/mongodb-js/mongosh/releases/tag/v2.0.0`, // Release notes link will point to the current release being made
          previous_releases_link: '',
          development_releases_link: '',
          supported_browsers_link: '',
          tutorial_link: 'test',
        });
      });
    });

    context(
      'when the current release is a minor/patch bump to one of earlier released major versions',
      function () {
        it('replaces the earlier released major version with the current minor/patch bump, while keeping the other major versions', function () {
          const getVersionConfig1x = sinon.stub().returns({ version: '1.2.2' });
          const getVersionConfig2x = sinon.stub().returns({ version: '2.0.0' });
          const getVersionConfig21 = sinon.stub().returns({ version: '2.1.0' });
          const existingDownloadCenterConfig =
            createDownloadCenterConfig(getVersionConfig1x);

          const configWith2x = getUpdatedDownloadCenterConfig(
            existingDownloadCenterConfig,
            getVersionConfig2x
          );

          const configWith21x = getUpdatedDownloadCenterConfig(
            configWith2x,
            getVersionConfig21
          );

          expect(configWith21x).to.deep.equal({
            versions: [{ version: '1.2.2' }, { version: '2.1.0' }],
            manual_link: 'https://docs.mongodb.org/manual/products/mongosh',
            release_notes_link: `https://github.com/mongodb-js/mongosh/releases/tag/v2.1.0`, // Release notes link will point to the current release being made
            previous_releases_link: '',
            development_releases_link: '',
            supported_browsers_link: '',
            tutorial_link: 'test',
          });
        });
      }
    );
  });

  describe('createAndPublishDownloadCenterConfig', function () {
    let dlCenter: sinon.SinonStub;
    let uploadConfig: sinon.SinonStub;
    let downloadConfig: sinon.SinonStub;

    beforeEach(function () {
      uploadConfig = sinon.stub();
      downloadConfig = sinon.stub();
      dlCenter = sinon.stub();

      dlCenter.returns({ downloadConfig, uploadConfig });
    });

    context('when a configuration does not exist', function () {
      it('publishes the created configuration', async function () {
        await createAndPublishDownloadCenterConfig(
          packageInformation('1.2.2'),
          'accessKey',
          'secretKey',
          false,
          dlCenter as any
        );

        expect(dlCenter).to.have.been.calledWith({
          bucket: 'info-mongodb-com',
          accessKeyId: 'accessKey',
          secretAccessKey: 'secretKey',
        });

        expect(uploadConfig).to.be.calledOnce;

        const [uploadKey, uploadedConfig] = uploadConfig.lastCall.args;
        expect(uploadKey).to.equal('com-download-center/mongosh.json');

        // Versions have platform info as well which we already verify in
        // createVersionConfig specs hence trimming it down here
        uploadedConfig.versions = (
          uploadedConfig as DownloadCenterConfig
        ).versions.map((version) => ({
          ...version,
          platform: [],
        }));

        expect(uploadedConfig).to.deep.equal({
          versions: [{ _id: '1.2.2', version: '1.2.2', platform: [] }],
          manual_link: 'https://docs.mongodb.org/manual/products/mongosh',
          release_notes_link:
            'https://github.com/mongodb-js/mongosh/releases/tag/v1.2.2',
          previous_releases_link: '',
          development_releases_link: '',
          supported_browsers_link: '',
          tutorial_link: 'test',
        });
      });
    });

    context('when a configuration exists already', function () {
      it('publishes an updated version of the existing configuration', async function () {
        downloadConfig.returns(
          createDownloadCenterConfig(
            sinon.stub().returns({
              _id: '1.2.2',
              version: '1.2.2',
              platform: [],
            })
          )
        );

        await createAndPublishDownloadCenterConfig(
          packageInformation('2.0.0'),
          'accessKey',
          'secretKey',
          false,
          dlCenter as any
        );

        expect(dlCenter).to.have.been.calledWith({
          bucket: 'info-mongodb-com',
          accessKeyId: 'accessKey',
          secretAccessKey: 'secretKey',
        });

        expect(uploadConfig).to.be.calledOnce;

        const [uploadKey, uploadedConfig] = uploadConfig.lastCall.args;
        expect(uploadKey).to.equal('com-download-center/mongosh.json');

        // Versions have platform info as well which we already verify in
        // createVersionConfig specs hence trimming it down here
        uploadedConfig.versions = (
          uploadedConfig as DownloadCenterConfig
        ).versions.map((version) => ({
          ...version,
          platform: [],
        }));

        expect(uploadedConfig).to.deep.equal({
          versions: [
            { _id: '1.2.2', version: '1.2.2', platform: [] },
            { _id: '2.0.0', version: '2.0.0', platform: [] },
          ],
          manual_link: 'https://docs.mongodb.org/manual/products/mongosh',
          release_notes_link:
            'https://github.com/mongodb-js/mongosh/releases/tag/v2.0.0',
          previous_releases_link: '',
          development_releases_link: '',
          supported_browsers_link: '',
          tutorial_link: 'test',
        });
      });
    });
  });
});
