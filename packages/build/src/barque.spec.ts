import { expect } from 'chai';
import fs from 'fs-extra';
import nock from 'nock';
import fetch from 'node-fetch';
import path from 'path';
import sinon from 'sinon';
import { URL } from 'url';
import { Barque, LATEST_CURATOR } from './barque';
import { ALL_BUILD_VARIANTS, BuildVariant, Config } from './config';

describe('Barque', () => {
  let barque: Barque;
  let config: Config;

  beforeEach(() => {
    config = {
      version: 'version',
      appleNotarizationBundleId: 'appleNotarizationBundleId',
      input: 'input',
      execInput: 'execInput',
      executablePath: 'executablePath',
      mongocryptdPath: 'mongocryptdPath',
      outputDir: 'outputDir',
      analyticsConfigFilePath: 'analyticsConfigFilePath',
      project: 'project',
      revision: 'revision',
      branch: 'branch',
      evgAwsKey: 'evgAwsKey',
      evgAwsSecret: 'evgAwsSecret',
      downloadCenterAwsKey: 'downloadCenterAwsKey',
      downloadCenterAwsSecret: 'downloadCenterAwsSecret',
      githubToken: 'githubToken',
      segmentKey: 'segmentKey',
      rootDir: '../../../',
      appleNotarizationUsername: 'appleNotarizationUsername',
      appleNotarizationApplicationPassword: 'appleNotarizationApplicationPassword',
      appleCodesignIdentity: 'appleCodesignIdentity',
      isCi: true,
      platform: 'linux',
      repo: {
        owner: 'owner',
        repo: 'repo',
      },
      execNodeVersion: process.version
    };

    barque = new Barque(config);
  });

  describe('releaseToBarque', () => {
    context('platform is linux', () => {
      context('execCurator function succeeds', () => {
        [
          {
            variant: BuildVariant.Debian,
            url: 'https://s3.amazonaws.com/mciuploads/mongosh/5ed7ee5d8683818eb28d9d3b5c65837cde4a08f5/mongodb-mongosh_0.1.0_amd64.deb',
            publishedUrls: [
              `${Barque.PPA_REPO_BASE_URL}/apt/debian/dists/buster/mongodb-org/4.4/main/binary-amd64/mongodb-mongosh_0.1.0_amd64.deb`,
              `${Barque.PPA_REPO_BASE_URL}/apt/ubuntu/dists/bionic/mongodb-org/4.4/multiverse/binary-amd64/mongodb-mongosh_0.1.0_amd64.deb`,
              `${Barque.PPA_REPO_BASE_URL}/apt/ubuntu/dists/focal/mongodb-org/4.4/multiverse/binary-amd64/mongodb-mongosh_0.1.0_amd64.deb`,
            ]
          },
          {
            variant: BuildVariant.Redhat,
            url: 'https://s3.amazonaws.com/mciuploads/mongosh/5ed7ee5d8683818eb28d9d3b5c65837cde4a08f5/mongodb-mongosh-0.1.0-x86_64.rpm',
            publishedUrls: [
              `${Barque.PPA_REPO_BASE_URL}/yum/redhat/8/mongodb-org/4.4/x86_64/RPMS/mongodb-mongosh-0.1.0-x86_64.rpm`,
            ]
          }
        ].forEach(({ variant, url, publishedUrls }) => {
          it(`publishes ${variant} packages`, async() => {
            barque.execCurator = sinon.stub().resolves(true);
            barque.createCuratorDir = sinon.stub().resolves('./');
            barque.extractLatestCurator = sinon.stub().resolves(true);

            const releasedUrls = await barque.releaseToBarque(variant, url);

            expect(releasedUrls).to.deep.equal(publishedUrls);
            expect(barque.createCuratorDir).to.have.been.called;
            expect(barque.extractLatestCurator).to.have.been.called;
            expect(barque.execCurator).to.have.been.called;
          });
        });
      });

      it('execCurator function fails', async() => {
        barque.execCurator = sinon.stub().rejects(new Error('error'));
        barque.createCuratorDir = sinon.stub().returns(Promise.resolve('./'));
        barque.extractLatestCurator = sinon.stub().returns(Promise.resolve(true));

        const debUrl = 'https://s3.amazonaws.com/mciuploads/mongosh/5ed7ee5d8683818eb28d9d3b5c65837cde4a08f5/mongodb-mongosh_0.1.0_amd64.deb';

        try {
          await barque.releaseToBarque(BuildVariant.Debian, debUrl);
        } catch (error) {
          expect(error.message).to.include('Curator is unable to upload to barque');
          expect(barque.createCuratorDir).to.have.been.called;
          expect(barque.extractLatestCurator).to.have.been.called;
          expect(barque.execCurator).to.have.been.called;
          return;
        }
        expect.fail('Expected error');
      });
    });

    it('platform is not linux', async() => {
      config.platform = 'macos';
      try {
        barque = new Barque(config);
      } catch (e) {
        expect(e.message).to.contain('only supported on linux');
        return;
      }
      expect.fail('Expected error');
    });
  });

  describe('getTargetDistro', () => {
    it('determines distro for debian build variant', async() => {
      const distro = barque.getTargetDistros(BuildVariant.Debian);
      expect(distro).to.deep.equal(['debian10', 'ubuntu1804', 'ubuntu2004']);
    });

    it('determines distro for redhat build variant', async() => {
      const distro = barque.getTargetDistros(BuildVariant.Redhat);
      expect(distro).to.deep.equal(['rhel80']);
    });

    ALL_BUILD_VARIANTS
      .filter(v => v !== BuildVariant.Debian && v !== BuildVariant.Redhat)
      .forEach(variant => {
        it(`throws an error for ${variant}`, async() => {
          try {
            barque.getTargetDistros(variant);
          } catch (e) {
            expect(e.message).to.include(variant);
            return;
          }
          expect.fail('Expected error');
        });
      });
  });

  describe('getTargetArchitecture', () => {
    it('determines arch for debian', async() => {
      const distro = barque.getTargetArchitecture(BuildVariant.Debian);
      expect(distro).to.be.equal('amd64');
    });

    it('determines arch for redhat', async() => {
      const distro = barque.getTargetArchitecture(BuildVariant.Redhat);
      expect(distro).to.be.equal('x86_64');
    });

    ALL_BUILD_VARIANTS
      .filter(v => v !== BuildVariant.Debian && v !== BuildVariant.Redhat)
      .forEach(variant => {
        it(`throws an error for ${variant}`, async() => {
          try {
            barque.getTargetArchitecture(variant);
          } catch (e) {
            expect(e.message).to.include(variant);
            return;
          }
          expect.fail('Expected error');
        });
      });
  });

  describe('createCuratorDir', () => {
    it('creates tmp directory that exists', async() => {
      const curatorDirPath = await barque.createCuratorDir();

      let accessErr: Error | undefined = undefined;
      try {
        await fs.access(curatorDirPath);
      } catch (e) {
        accessErr = e;
      }
      expect(accessErr).to.be.undefined;
    });
  });

  describe('waitUntilPackagesAreAvailable', () => {
    beforeEach(() => {
      nock.cleanAll();
    });

    context('with packages published one after the other', () => {
      let nockRepo: nock.Scope;

      beforeEach(() => {
        nockRepo = nock(Barque.PPA_REPO_BASE_URL);

        nockRepo.head('/apt/dist/package1.deb').reply(200);

        nockRepo.head('/apt/dist/package2.deb').twice().reply(404);
        nockRepo.head('/apt/dist/package2.deb').reply(200);

        nockRepo.head('/apt/dist/package3.deb').reply(404);
        nockRepo.head('/apt/dist/package3.deb').reply(200);
      });

      it('waits until all packages are available', async() => {
        await barque.waitUntilPackagesAreAvailable([
          `${Barque.PPA_REPO_BASE_URL}/apt/dist/package1.deb`,
          `${Barque.PPA_REPO_BASE_URL}/apt/dist/package2.deb`,
          `${Barque.PPA_REPO_BASE_URL}/apt/dist/package3.deb`
        ], 300, 1);

        expect(nock.isDone()).to.be.true;
      });
    });

    context('with really slow packages', () => {
      let nockRepo: nock.Scope;

      beforeEach(() => {
        nockRepo = nock(Barque.PPA_REPO_BASE_URL);
        nockRepo.head('/apt/dist/package1.deb').reply(200);
        nockRepo.head('/apt/dist/package2.deb').reply(404).persist();
      });

      it('fails when the timeout is hit', async() => {
        try {
          await barque.waitUntilPackagesAreAvailable([
            `${Barque.PPA_REPO_BASE_URL}/apt/dist/package1.deb`,
            `${Barque.PPA_REPO_BASE_URL}/apt/dist/package2.deb`,
          ], 5, 1);
        } catch (e) {
          expect(e.message).to.contain('the following packages are still not available');
          expect(e.message).to.contain('package2.deb');
        }
      });
    });
  });

  describe('LATEST_CURATOR', () => {
    it('can be downloaded', async() => {
      const response = await fetch(LATEST_CURATOR, {
        method: 'HEAD'
      });

      expect(response.ok).to.be.true;
    });
  });

  describe('extractLatestCurator', () => {
    beforeEach(() => {
      nock.cleanAll();
      const latestCuratorUrl = new URL(LATEST_CURATOR);
      nock(latestCuratorUrl.origin)
        .get(latestCuratorUrl.pathname)
        .replyWithFile(200, path.join(__dirname, '..', 'examples', 'fake-curator.tar.gz'), {
          'Content-Type': 'application/gzip'
        });
    });

    afterEach(() => {
      expect(nock.isDone(), 'HTTP calls to link urls were not done').to.be.true;
    });

    it('extracts latest curator to tmp directory', async() => {
      const curatorDirPath = await barque.createCuratorDir();
      const curatorPath = path.join(curatorDirPath, 'curator');

      await barque.extractLatestCurator(curatorDirPath);

      let accessErr: Error | undefined = undefined;
      try {
        await fs.access(curatorPath);
      } catch (e) {
        accessErr = e;
      }
      expect(accessErr).to.be.undefined;
    });
  });
});
