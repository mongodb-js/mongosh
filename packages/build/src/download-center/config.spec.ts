import { DownloadCenterConfig } from '@mongodb-js/dl-center/dist/download-center-config';
import { expect } from 'chai';
import { SinonStub } from 'sinon';
import sinon from 'ts-sinon';
import { createAndPublishDownloadCenterConfig, createDownloadCenterConfig } from './config';

describe('DownloadCenter config', () => {
  let config: DownloadCenterConfig;
  let packageInformation: any;

  before(() => {
    packageInformation = {
      metadata: {
        version: '1.2.2',
        name: 'mongosh',
        debName: 'mongodb-mongosh',
        rpmName: 'mongodb-mongosh'
      }
    };
    config = createDownloadCenterConfig(packageInformation);
  });

  describe('createDownloadCenterConfig', () => {
    it('sets the version correctly', () => {
      expect(config.versions).to.have.length(1);
      const [version] = config.versions;
      expect(version._id).to.equal('1.2.2');
      expect(version.version).to.equal('1.2.2');
    });

    it('has an artifact for darwin', () => {
      const [version] = config.versions;
      const platforms = version.platform.filter(p => p.os === 'darwin');
      expect(platforms).to.have.length(2);
      expect(platforms[0].download_link).to.include('mongosh-1.2.2-darwin-x64.zip');
      expect(platforms[1].download_link).to.include('mongosh-1.2.2-darwin-arm64.zip');
    });

    it('has an artifact for linux', () => {
      const [version] = config.versions;
      const platforms = version.platform.filter(p => p.os === 'linux' && p.arch === 'x64');
      expect(platforms).to.have.length(1);
      expect(platforms[0].download_link).to.include('mongosh-1.2.2-linux-x64.tgz');
    });

    it('has an MSI and ZIP artifacts for windows', () => {
      const [version] = config.versions;
      const platforms = version.platform.filter(p => p.os === 'win32' || p.os === 'win32msi');
      expect(platforms).to.have.length(2);
      expect(platforms[0].download_link).to.include('mongosh-1.2.2-win32-x64.zip');
      expect(platforms[1].download_link).to.include('mongosh-1.2.2-x64.msi');
    });

    it('has an artifact for rhel', () => {
      const [version] = config.versions;
      const platforms = version.platform.filter(p => p.os === 'rhel' && p.arch === 'x64');
      expect(platforms).to.have.length(1);
      expect(platforms[0].download_link).to.include('mongodb-mongosh-1.2.2.el7.x86_64.rpm');
    });

    it('has an artifact for debian', () => {
      const [version] = config.versions;
      const platforms = version.platform.filter(p => p.os === 'debian' && p.arch === 'x64');
      expect(platforms).to.have.length(1);
      expect(platforms[0].download_link).to.include('mongodb-mongosh_1.2.2_amd64.deb');
    });
  });

  describe('createAndPublishDownloadCenterConfig', () => {
    let dlCenter: SinonStub;
    let uploadConfig: SinonStub;

    beforeEach(() => {
      uploadConfig = sinon.stub();
      dlCenter = sinon.stub();

      dlCenter.returns({ uploadConfig });
    });

    it('publishes the configuration', async() => {
      await createAndPublishDownloadCenterConfig(
        packageInformation,
        'accessKey',
        'secretKey',
        dlCenter as any
      );

      expect(dlCenter).to.have.been.calledWith({
        bucket: 'info-mongodb-com',
        accessKeyId: 'accessKey',
        secretAccessKey: 'secretKey'
      });
      expect(uploadConfig).to.have.been.calledWith(
        'com-download-center/mongosh.json',
        createDownloadCenterConfig(packageInformation)
      );
    });
  });
});
