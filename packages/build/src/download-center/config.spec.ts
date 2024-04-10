import type { DownloadCenterConfig } from '@mongodb-js/dl-center/dist/download-center-config';
import { getPackageFile, type PackageInformationProvider } from '../packaging';
import { expect } from 'chai';
import sinon from 'sinon';
import { ALL_PACKAGE_VARIANTS, type PackageVariant } from '../config';
import {
  createVersionConfig,
  createDownloadCenterConfig,
  getUpdatedDownloadCenterConfig,
  createAndPublishDownloadCenterConfig,
  createJsonFeedEntry,
} from './config';
import { promises as fs } from 'fs';
import path from 'path';
import fetch from 'node-fetch';

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
  let outputDir: string;
  beforeEach(async function () {
    outputDir = path.join(
      __dirname,
      '..',
      '..',
      '..',
      '..',
      'tmp',
      `downloadcenter-outputdir-${Date.now()}`
    );
    await fs.mkdir(outputDir, { recursive: true });

    const testVersions = ['2.0.1', '2.0.0', '1.2.2'];
    const allFiles = testVersions
      .flatMap((version) =>
        ALL_PACKAGE_VARIANTS.map(
          (packageVariant) =>
            getPackageFile(packageVariant, packageInformation(version)).path
        )
      )
      .flatMap((file) => [file, `${file}.sig`]);
    await fs.writeFile(
      path.join(outputDir, 'SHASUMS1.txt'),
      allFiles.map((f) => `ghjklm  ${f}`).join('\n')
    );
    await fs.writeFile(
      path.join(outputDir, 'SHASUMS256.txt'),
      allFiles.map((f) => `abcdef  ${f}`).join('\n')
    );
  });

  afterEach(async function () {
    await fs.rm(outputDir, { recursive: true });
  });

  describe('createVersionConfig', function () {
    it('sets the version correctly', function () {
      const version = createVersionConfig(packageInformation('1.2.2'));
      expect(version._id).to.equal('1.2.2');
      expect(version.version).to.equal('1.2.2');
    });

    it('has an artifact for darwin', function () {
      const version = createVersionConfig(packageInformation('1.2.2'));
      const platforms = version.platform.filter(
        (p) => p.os === 'MacOS x64 (11.0+)'
      );
      expect(platforms).to.have.length(1);
      expect(platforms[0].packages.links[0].name).to.include('zip');
      expect(platforms[0].packages.links[0].download_link).to.include(
        'mongosh-1.2.2-darwin-x64.zip'
      );
    });

    it('has an artifact for linux', function () {
      const version = createVersionConfig(packageInformation('1.2.2'));
      const platforms = version.platform.filter(
        (p) => p.os.startsWith('Linux x64') && p.arch === 'x64'
      );
      expect(platforms).to.have.length(1);
      expect(
        platforms.flatMap((p) => p.packages.links.map((l) => l.download_link))
      ).to.deep.equal([
        'https://downloads.mongodb.com/compass/mongosh-1.2.2-linux-x64.tgz',
        'https://downloads.mongodb.com/compass/mongosh-1.2.2-linux-x64-openssl11.tgz',
        'https://downloads.mongodb.com/compass/mongosh-1.2.2-linux-x64-openssl3.tgz',
      ]);
    });

    it('has an MSI and ZIP artifacts for windows', function () {
      const version = createVersionConfig(packageInformation('1.2.2'));
      const [platform] = version.platform.filter(
        (p) => p.os === 'Windows x64 (10+)'
      );
      expect(platform.packages.links[0].download_link).to.contain(
        'win32-x64.zip'
      );
      expect(platform.packages.links[0].name).to.equal('zip');
      expect(platform.packages.links[1].download_link).to.contain('x64.msi');
      expect(platform.packages.links[1].name).to.contain('msi');
    });

    it('has an artifact for rpm', function () {
      const version = createVersionConfig(packageInformation('1.2.2'));
      const platforms = version.platform.filter(
        (p) => p.os.startsWith('RHEL') && p.arch === 'x64'
      );
      expect(platforms).to.have.length(1);
      expect(
        platforms.flatMap((p) => p.packages.links.map((l) => l.download_link))
      ).to.deep.equal([
        'https://downloads.mongodb.com/compass/mongodb-mongosh-1.2.2.x86_64.rpm',
        'https://downloads.mongodb.com/compass/mongodb-mongosh-shared-openssl11-1.2.2.x86_64.rpm',
        'https://downloads.mongodb.com/compass/mongodb-mongosh-shared-openssl3-1.2.2.x86_64.rpm',
      ]);
    });

    it('has an artifact for deb', function () {
      const version = createVersionConfig(packageInformation('1.2.2'));
      const platforms = version.platform.filter(
        (p) => p.os.startsWith('Debian') && p.arch === 'x64'
      );
      expect(platforms).to.have.length(1);
      expect(
        platforms.flatMap((p) => p.packages.links.map((l) => l.download_link))
      ).to.deep.equal([
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
      it('adds a new entry for the current release to the download center config, while keeping the other major versions, sorted by semver', function () {
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
          versions: [{ version: '2.0.0' }, { version: '1.2.2' }],
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
            versions: [{ version: '2.1.0' }, { version: '1.2.2' }],
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
    let uploadAsset: sinon.SinonStub;
    let downloadAsset: sinon.SinonStub;
    let baseUrl: string;

    beforeEach(function () {
      uploadConfig = sinon.stub();
      downloadConfig = sinon.stub();
      uploadAsset = sinon.stub();
      downloadAsset = sinon.stub();
      dlCenter = sinon.stub();

      dlCenter.returns({
        downloadConfig,
        uploadConfig,
        uploadAsset,
        downloadAsset,
      });
      baseUrl = `http://127.0.0.1/`;
    });

    context('when a configuration does not exist', function () {
      it('publishes the created configuration with the fallback provided in fallback.json', async function () {
        downloadConfig.throws({ code: 'NoSuchKey' });

        await createAndPublishDownloadCenterConfig(
          outputDir,
          packageInformation('2.0.1'),
          'accessKey',
          'secretKey',
          '',
          false,
          dlCenter as any,
          baseUrl
        );

        expect(dlCenter).to.have.been.calledWith({
          bucket: 'info-mongodb-com',
          accessKeyId: 'accessKey',
          secretAccessKey: 'secretKey',
        });
        expect(dlCenter).to.have.been.calledWith({
          bucket: 'downloads.10gen.com',
          accessKeyId: 'accessKey',
          secretAccessKey: 'secretKey',
        });

        expect(uploadConfig).to.be.calledOnce;

        const [uploadKey, uploadedConfig] = uploadConfig.lastCall.args;
        expect(uploadKey).to.equal(
          'com-download-center/mongosh.multiversion.json'
        );

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
            { _id: '2.0.1', version: '2.0.1', platform: [] },
            { _id: '1.10.6', version: '1.10.6', platform: [] },
          ],
          manual_link: 'https://docs.mongodb.org/manual/products/mongosh',
          release_notes_link:
            'https://github.com/mongodb-js/mongosh/releases/tag/v2.0.1',
          previous_releases_link: '',
          development_releases_link: '',
          supported_browsers_link: '',
          tutorial_link: 'test',
        });

        expect(uploadAsset).to.be.calledOnce;
        const [assetKey] = uploadAsset.lastCall.args;
        expect(assetKey).to.equal('compass/mongosh.json');
      });

      it('publishes the created configuration', async function () {
        await createAndPublishDownloadCenterConfig(
          outputDir,
          packageInformation('1.2.2'),
          'accessKey',
          'secretKey',
          '',
          false,
          dlCenter as any,
          baseUrl
        );

        expect(dlCenter).to.have.been.calledWith({
          bucket: 'info-mongodb-com',
          accessKeyId: 'accessKey',
          secretAccessKey: 'secretKey',
        });
        expect(dlCenter).to.have.been.calledWith({
          bucket: 'downloads.10gen.com',
          accessKeyId: 'accessKey',
          secretAccessKey: 'secretKey',
        });

        expect(uploadConfig).to.be.calledOnce;

        const [uploadKey, uploadedConfig] = uploadConfig.lastCall.args;
        expect(uploadKey).to.equal(
          'com-download-center/mongosh.multiversion.json'
        );

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

        expect(uploadAsset).to.be.calledOnce;
        const [assetKey, uploadedAsset] = uploadAsset.lastCall.args;
        expect(assetKey).to.equal('compass/mongosh.json');
        const jsonFeedData = JSON.parse(uploadedAsset);
        expect(Object.keys(jsonFeedData)).to.deep.equal(['versions']);
        expect(jsonFeedData.versions).to.have.lengthOf(1);
        expect(jsonFeedData.versions[0].version).to.equal('1.2.2');
        expect(
          jsonFeedData.versions[0].downloads.find(
            (d: any) => d.arch === 'x86_64' && d.distro === 'darwin'
          )
        ).to.deep.equal({
          arch: 'x86_64',
          distro: 'darwin',
          targets: ['macos'],
          archive: {
            type: 'zip',
            url: `${baseUrl}mongosh-1.2.2-darwin-x64.zip`,
            sha256: 'abcdef',
            sha1: 'ghjklm',
          },
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

        const existingUploadedJsonFeed = require(path.resolve(
          __dirname,
          '..',
          '..',
          'test',
          'fixtures',
          'mongosh-versions.json'
        ));
        existingUploadedJsonFeed.versions[0].version = '1.10.2';
        downloadAsset.returns(JSON.stringify(existingUploadedJsonFeed));

        await createAndPublishDownloadCenterConfig(
          outputDir,
          packageInformation('2.0.0'),
          'accessKey',
          'secretKey',
          path.resolve(
            __dirname,
            '..',
            '..',
            'test',
            'fixtures',
            'mongosh-versions.json'
          ),
          false,
          dlCenter as any,
          baseUrl
        );

        expect(dlCenter).to.have.been.calledWith({
          bucket: 'info-mongodb-com',
          accessKeyId: 'accessKey',
          secretAccessKey: 'secretKey',
        });
        expect(dlCenter).to.have.been.calledWith({
          bucket: 'downloads.10gen.com',
          accessKeyId: 'accessKey',
          secretAccessKey: 'secretKey',
        });

        expect(uploadConfig).to.be.calledOnce;

        const [uploadKey, uploadedConfig] = uploadConfig.lastCall.args;
        expect(uploadKey).to.equal(
          'com-download-center/mongosh.multiversion.json'
        );

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
            { _id: '2.0.0', version: '2.0.0', platform: [] },
            { _id: '1.2.2', version: '1.2.2', platform: [] },
          ],
          manual_link: 'https://docs.mongodb.org/manual/products/mongosh',
          release_notes_link:
            'https://github.com/mongodb-js/mongosh/releases/tag/v2.0.0',
          previous_releases_link: '',
          development_releases_link: '',
          supported_browsers_link: '',
          tutorial_link: 'test',
        });

        expect(uploadAsset).to.be.calledOnce;
        const [assetKey, uploadedAsset] = uploadAsset.lastCall.args;
        expect(assetKey).to.equal('compass/mongosh.json');
        const jsonFeedData = JSON.parse(uploadedAsset);
        expect(Object.keys(jsonFeedData)).to.deep.equal(['versions']);
        expect(jsonFeedData.versions).to.have.lengthOf(3);
        expect(jsonFeedData.versions.map((v: any) => v.version)).to.deep.equal([
          '2.0.0',
          '1.10.3',
          '1.10.2',
        ]);
      });
    });
  });

  describe('createJsonFeedEntry', function () {
    it('generates a config that only refers to `arch` or `target` values known to the server', async function () {
      const fullJson = await (
        await fetch('https://downloads.mongodb.org/full.json')
      ).json();
      const serverArchs = [
        ...new Set<string>(
          fullJson.versions.flatMap((v: any) =>
            v.downloads.flatMap((d: any) => d.arch)
          )
        ),
      ].filter(Boolean);
      const serverTargets = [
        ...new Set<string>(
          fullJson.versions.flatMap((v: any) =>
            v.downloads.flatMap((d: any) => d.target)
          )
        ),
      ].filter(Boolean);

      const mongoshJsonFeedEntry = await createJsonFeedEntry(
        outputDir,
        packageInformation('2.0.0'),
        'skip://'
      );
      const mongoshArchs = [
        ...new Set(mongoshJsonFeedEntry.downloads.flatMap((d) => d.arch)),
      ];
      const mongoshTargets = [
        ...new Set(mongoshJsonFeedEntry.downloads.flatMap((d) => d.targets)),
      ].filter((t) => t !== 'debian12'); // debian12 is not part of the server platform list at the time of writing

      for (const arch of mongoshArchs) expect(serverArchs).to.include(arch);
      for (const target of mongoshTargets)
        expect(serverTargets).to.include(target);
    });
  });
});
