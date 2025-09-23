import type { DownloadCenterConfig } from '@mongodb-js/dl-center/dist/download-center-config';
import { type PackageInformationProvider } from '../packaging';
import { expect } from 'chai';
import sinon from 'sinon';
import type { Config, CTAConfig } from '../config';
import { type PackageVariant } from '../config';
import {
  createVersionConfig,
  createDownloadCenterConfig,
  getUpdatedDownloadCenterConfig,
  createAndPublishDownloadCenterConfig,
  createJsonFeedEntry,
  updateJsonFeedCTA,
} from './config';
import type { JsonFeed } from './config';
import { promises as fs } from 'fs';
import path from 'path';
import fetch from 'node-fetch';
import { createServer } from 'http';
import { once } from 'events';
import { runDownloadAndListArtifacts } from '../run-download-and-list-artifacts';
import type { AddressInfo } from 'net';

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

const DUMMY_ACCESS_KEY = 'accessKey';
const DUMMY_SECRET_KEY = 'secretKey';
const DUMMY_SESSION_TOKEN = 'sessionToken';
const DUMMY_CTA_CONFIG: CTAConfig = {};

describe('DownloadCenter config', function () {
  let outputDir: string;
  before(async function () {
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

    const httpServer = createServer((req, res) => {
      res.end(req.url);
    });
    httpServer.listen(0);
    await once(httpServer, 'listening');
    try {
      const testVersions = ['2.0.1', '2.0.0', '1.2.2'];

      for (const version of testVersions) {
        const config: Partial<Config> = {
          outputDir,
          packageInformation: packageInformation(version),
        };
        await runDownloadAndListArtifacts(
          config as Config,
          `http://localhost:${(httpServer.address() as AddressInfo).port}/`,
          'append-to-hash-file-for-testing'
        );
      }
    } finally {
      httpServer.close();
      await once(httpServer, 'close');
    }
  });

  after(async function () {
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
    let dlCenterConfig: sinon.SinonStub;
    let dlCenterArtifacts: sinon.SinonStub;
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
      dlCenterConfig = sinon.stub();
      dlCenterArtifacts = sinon.stub();

      dlCenterConfig.returns({
        downloadConfig,
        uploadConfig,
        uploadAsset,
        downloadAsset,
      });

      dlCenterArtifacts.returns({
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
          DUMMY_ACCESS_KEY,
          DUMMY_SECRET_KEY,
          DUMMY_ACCESS_KEY,
          DUMMY_SECRET_KEY,
          DUMMY_SESSION_TOKEN,
          '',
          false,
          DUMMY_CTA_CONFIG,
          dlCenterConfig as any,
          dlCenterArtifacts as any,
          baseUrl
        );

        expect(dlCenterConfig).to.have.been.calledWith({
          bucket: 'info-mongodb-com',
          accessKeyId: DUMMY_ACCESS_KEY,
          secretAccessKey: DUMMY_SECRET_KEY,
        });
        expect(dlCenterArtifacts).to.have.been.calledWith({
          bucket: 'cdn-origin-compass',
          accessKeyId: DUMMY_ACCESS_KEY,
          secretAccessKey: DUMMY_SECRET_KEY,
          sessionToken: DUMMY_SESSION_TOKEN,
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
          DUMMY_ACCESS_KEY,
          DUMMY_SECRET_KEY,
          DUMMY_ACCESS_KEY,
          DUMMY_SECRET_KEY,
          DUMMY_SESSION_TOKEN,
          '',
          false,
          DUMMY_CTA_CONFIG,
          dlCenterConfig as any,
          dlCenterArtifacts as any,
          baseUrl
        );

        expect(dlCenterConfig).to.have.been.calledWith({
          bucket: 'info-mongodb-com',
          accessKeyId: DUMMY_ACCESS_KEY,
          secretAccessKey: DUMMY_SECRET_KEY,
        });
        expect(dlCenterArtifacts).to.have.been.calledWith({
          bucket: 'cdn-origin-compass',
          accessKeyId: DUMMY_ACCESS_KEY,
          secretAccessKey: DUMMY_SECRET_KEY,
          sessionToken: DUMMY_SESSION_TOKEN,
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
            sha256:
              'ed8922ef572c307634150bf78ea02338349949f29245123884b1318cdc402dd9',
            sha1: '4f1b987549703c58940be9f8582f4032374b1074',
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
          DUMMY_ACCESS_KEY,
          DUMMY_SECRET_KEY,
          DUMMY_ACCESS_KEY,
          DUMMY_SECRET_KEY,
          DUMMY_SESSION_TOKEN,
          path.resolve(
            __dirname,
            '..',
            '..',
            'test',
            'fixtures',
            'mongosh-versions.json'
          ),
          false,
          DUMMY_CTA_CONFIG,
          dlCenterConfig as any,
          dlCenterArtifacts as any,
          baseUrl
        );

        expect(dlCenterConfig).to.have.been.calledWith({
          bucket: 'info-mongodb-com',
          accessKeyId: DUMMY_ACCESS_KEY,
          secretAccessKey: DUMMY_SECRET_KEY,
        });
        expect(dlCenterArtifacts).to.have.been.calledWith({
          bucket: 'cdn-origin-compass',
          accessKeyId: DUMMY_ACCESS_KEY,
          secretAccessKey: DUMMY_SECRET_KEY,
          sessionToken: DUMMY_SESSION_TOKEN,
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
      ].filter((t) => t !== 'ubuntu2404'); // ubuntu2404 is not part of the server platform list at the time of writing

      for (const arch of mongoshArchs) expect(serverArchs).to.include(arch);
      for (const target of mongoshTargets)
        expect(serverTargets).to.include(target);
    });
  });

  describe('updateJsonFeedCTA', function () {
    let dlCenter: sinon.SinonStub;
    let uploadConfig: sinon.SinonStub;
    let downloadConfig: sinon.SinonStub;
    let uploadAsset: sinon.SinonStub;
    let downloadAsset: sinon.SinonStub;

    const existingUploadedJsonFeed = require(path.resolve(
      __dirname,
      '..',
      '..',
      'test',
      'fixtures',
      'cta-versions.json'
    )) as JsonFeed;

    const getUploadedJsonFeed = (): JsonFeed => {
      return JSON.parse(uploadAsset.lastCall.args[1]) as JsonFeed;
    };

    beforeEach(function () {
      uploadConfig = sinon.stub();
      downloadConfig = sinon.stub();
      uploadAsset = sinon.stub();
      downloadAsset = sinon.stub();
      dlCenter = sinon.stub();

      downloadAsset.returns(JSON.stringify(existingUploadedJsonFeed));

      dlCenter.returns({
        downloadConfig,
        uploadConfig,
        uploadAsset,
        downloadAsset,
      });
    });

    for (const dryRun of [false, true]) {
      it(`when dryRun is ${dryRun}, does ${
        dryRun ? 'not ' : ''
      }upload the updated json feed`, async function () {
        const config: CTAConfig = {
          '1.10.3': {
            chunks: [{ text: 'Foo' }],
          },
          '*': {
            chunks: [{ text: 'Bar' }],
          },
        };

        await updateJsonFeedCTA(
          config,
          DUMMY_ACCESS_KEY,
          DUMMY_SECRET_KEY,
          DUMMY_SESSION_TOKEN,
          dryRun,
          dlCenter as any
        );
        if (dryRun) {
          expect(uploadAsset).to.not.have.been.called;
        } else {
          expect(uploadAsset).to.have.been.called;

          const updatedJsonFeed = getUploadedJsonFeed();
          expect(updatedJsonFeed.cta?.chunks).to.deep.equal([{ text: 'Bar' }]);
          expect(
            updatedJsonFeed.versions.filter((v) => v.version === '1.10.3')[0]
              .cta?.chunks
          ).to.deep.equal([{ text: 'Foo' }]);
          expect(
            updatedJsonFeed.versions.filter((v) => v.version === '1.10.4')[0]
              .cta
          ).to.be.undefined;
        }
      });
    }

    it('cannot add new versions', async function () {
      expect(
        existingUploadedJsonFeed.versions.filter((v) => v.version === '1.10.5')
      ).to.have.lengthOf(0);

      const config: CTAConfig = {
        '1.10.5': {
          chunks: [{ text: 'Foo' }],
        },
      };

      await updateJsonFeedCTA(
        config,
        DUMMY_ACCESS_KEY,
        DUMMY_SECRET_KEY,
        DUMMY_SESSION_TOKEN,
        false,
        dlCenter as any
      );

      const updatedJsonFeed = getUploadedJsonFeed();

      expect(
        updatedJsonFeed.versions.filter((v) => v.version === '1.10.5')
      ).to.have.lengthOf(0);
    });

    it('can remove global cta', async function () {
      // Preserve existing CTAs, but omit the global one
      const ctas = (existingUploadedJsonFeed.versions as any[]).reduce(
        (acc, current) => {
          acc[current.version] = current.cta;
          return acc;
        },
        {}
      );
      expect(ctas['*']).to.be.undefined;
      await updateJsonFeedCTA(
        ctas,
        DUMMY_ACCESS_KEY,
        DUMMY_SECRET_KEY,
        DUMMY_SESSION_TOKEN,
        false,
        dlCenter as any
      );

      const updatedJsonFeed = getUploadedJsonFeed();

      expect(updatedJsonFeed.cta).to.be.undefined;
    });

    it('can remove version specific cta', async function () {
      expect(
        existingUploadedJsonFeed.versions.map((v) => v.cta).filter((cta) => cta)
      ).to.have.length.greaterThan(0);

      const config = {
        '*': existingUploadedJsonFeed.cta!,
      };

      await updateJsonFeedCTA(
        config,
        DUMMY_ACCESS_KEY,
        DUMMY_SECRET_KEY,
        DUMMY_SESSION_TOKEN,
        false,
        dlCenter as any
      );

      const updatedJsonFeed = getUploadedJsonFeed();
      expect(updatedJsonFeed.cta).to.not.be.undefined;
      expect(
        updatedJsonFeed.versions.map((v) => v.cta).filter((cta) => cta)
      ).to.have.lengthOf(0);
    });

    it('can update global cta', async function () {
      const config = {
        '*': {
          chunks: [{ text: "It's a beautiful day", style: 'imagePositive' }],
        },
      };

      await updateJsonFeedCTA(
        config,
        DUMMY_ACCESS_KEY,
        DUMMY_SECRET_KEY,
        DUMMY_SESSION_TOKEN,
        false,
        dlCenter as any
      );

      const updatedJsonFeed = getUploadedJsonFeed();

      expect(updatedJsonFeed.cta).to.deep.equal({
        chunks: [{ text: "It's a beautiful day", style: 'imagePositive' }],
      });
    });

    it('can update version-specific cta', async function () {
      const config = {
        '1.10.3': {
          chunks: [{ text: "It's a beautiful day", style: 'imagePositive' }],
        },
      };

      await updateJsonFeedCTA(
        config,
        DUMMY_ACCESS_KEY,
        DUMMY_SECRET_KEY,
        DUMMY_SESSION_TOKEN,
        false,
        dlCenter as any
      );

      const updatedJsonFeed = getUploadedJsonFeed();

      expect(
        updatedJsonFeed.versions.filter((v) => v.version === '1.10.3')[0].cta
      ).to.deep.equal({
        chunks: [{ text: "It's a beautiful day", style: 'imagePositive' }],
      });
    });

    it('can add global cta', async function () {
      // Remove the existing cta
      existingUploadedJsonFeed.cta = undefined;

      const config = {
        '*': {
          chunks: [
            { text: 'Go outside and enjoy the sun', style: 'imagePositive' },
          ],
        },
      };

      await updateJsonFeedCTA(
        config,
        DUMMY_ACCESS_KEY,
        DUMMY_SECRET_KEY,
        DUMMY_SESSION_TOKEN,
        false,
        dlCenter as any
      );

      const updatedJsonFeed = getUploadedJsonFeed();

      expect(updatedJsonFeed.cta).to.deep.equal({
        chunks: [
          { text: 'Go outside and enjoy the sun', style: 'imagePositive' },
        ],
      });
    });

    it('can add version-specific cta', async function () {
      // Remove the existing cta
      existingUploadedJsonFeed.cta = undefined;

      const config = {
        '1.10.4': {
          chunks: [
            { text: 'Go outside and enjoy the sun', style: 'imagePositive' },
          ],
        },
      };

      await updateJsonFeedCTA(
        config,
        DUMMY_ACCESS_KEY,
        DUMMY_SECRET_KEY,
        DUMMY_SESSION_TOKEN,
        false,
        dlCenter as any
      );

      const updatedJsonFeed = getUploadedJsonFeed();

      expect(
        updatedJsonFeed.versions.filter((v) => v.version === '1.10.4')[0].cta
      ).to.deep.equal({
        chunks: [
          { text: 'Go outside and enjoy the sun', style: 'imagePositive' },
        ],
      });
    });
  });
});
