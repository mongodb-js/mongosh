import { expect } from 'chai';
import { promises as fs } from 'fs';
import nock from 'nock';
import fetch from 'node-fetch';
import path from 'path';
import sinon from 'sinon';
import { URL } from 'url';
import { Barque, LATEST_CURATOR, getReposAndArch } from './barque';
import { ALL_BUILD_VARIANTS, Config } from './config';

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
        ([
          {
            variant: 'debian-x64',
            url: 'https://s3.amazonaws.com/mciuploads/mongosh/5ed7ee5d8683818eb28d9d3b5c65837cde4a08f5/mongodb-mongosh_0.1.0_amd64.deb',
            publishedUrls: [
              'https://repo.mongodb.org/apt/ubuntu/dists/bionic/mongodb-org/4.4/multiverse/binary-amd64/mongodb-mongosh_0.1.0_amd64.deb',
              'https://repo.mongodb.com/apt/ubuntu/dists/bionic/mongodb-enterprise/4.4/multiverse/binary-amd64/mongodb-mongosh_0.1.0_amd64.deb',
              'https://repo.mongodb.org/apt/ubuntu/dists/bionic/mongodb-org/5.0/multiverse/binary-amd64/mongodb-mongosh_0.1.0_amd64.deb',
              'https://repo.mongodb.com/apt/ubuntu/dists/bionic/mongodb-enterprise/5.0/multiverse/binary-amd64/mongodb-mongosh_0.1.0_amd64.deb',
              'https://repo.mongodb.org/apt/ubuntu/dists/focal/mongodb-org/4.4/multiverse/binary-amd64/mongodb-mongosh_0.1.0_amd64.deb',
              'https://repo.mongodb.com/apt/ubuntu/dists/focal/mongodb-enterprise/4.4/multiverse/binary-amd64/mongodb-mongosh_0.1.0_amd64.deb',
              'https://repo.mongodb.org/apt/ubuntu/dists/focal/mongodb-org/5.0/multiverse/binary-amd64/mongodb-mongosh_0.1.0_amd64.deb',
              'https://repo.mongodb.com/apt/ubuntu/dists/focal/mongodb-enterprise/5.0/multiverse/binary-amd64/mongodb-mongosh_0.1.0_amd64.deb',
              'https://repo.mongodb.org/apt/debian/dists/buster/mongodb-org/4.4/main/binary-amd64/mongodb-mongosh_0.1.0_amd64.deb',
              'https://repo.mongodb.com/apt/debian/dists/buster/mongodb-enterprise/4.4/main/binary-amd64/mongodb-mongosh_0.1.0_amd64.deb',
              'https://repo.mongodb.org/apt/debian/dists/buster/mongodb-org/5.0/main/binary-amd64/mongodb-mongosh_0.1.0_amd64.deb',
              'https://repo.mongodb.com/apt/debian/dists/buster/mongodb-enterprise/5.0/main/binary-amd64/mongodb-mongosh_0.1.0_amd64.deb',
              'https://repo.mongodb.org/apt/debian/dists/stretch/mongodb-org/4.4/main/binary-amd64/mongodb-mongosh_0.1.0_amd64.deb',
              'https://repo.mongodb.com/apt/debian/dists/stretch/mongodb-enterprise/4.4/main/binary-amd64/mongodb-mongosh_0.1.0_amd64.deb',
              'https://repo.mongodb.org/apt/debian/dists/stretch/mongodb-org/5.0/main/binary-amd64/mongodb-mongosh_0.1.0_amd64.deb',
              'https://repo.mongodb.com/apt/debian/dists/stretch/mongodb-enterprise/5.0/main/binary-amd64/mongodb-mongosh_0.1.0_amd64.deb'
            ]
          },
          {
            variant: 'rhel-x64',
            url: 'https://s3.amazonaws.com/mciuploads/mongosh/5ed7ee5d8683818eb28d9d3b5c65837cde4a08f5/mongodb-mongosh-0.1.0.el7.x86_64.rpm',
            publishedUrls: [
              'https://repo.mongodb.org/yum/redhat/7/mongodb-org/4.4/x86_64/RPMS/mongodb-mongosh-0.1.0.el7.x86_64.rpm',
              'https://repo.mongodb.com/yum/redhat/7/mongodb-enterprise/4.4/x86_64/RPMS/mongodb-mongosh-0.1.0.el7.x86_64.rpm',
              'https://repo.mongodb.org/yum/redhat/7/mongodb-org/5.0/x86_64/RPMS/mongodb-mongosh-0.1.0.el7.x86_64.rpm',
              'https://repo.mongodb.com/yum/redhat/7/mongodb-enterprise/5.0/x86_64/RPMS/mongodb-mongosh-0.1.0.el7.x86_64.rpm',
              'https://repo.mongodb.org/yum/redhat/8/mongodb-org/4.4/x86_64/RPMS/mongodb-mongosh-0.1.0.el7.x86_64.rpm',
              'https://repo.mongodb.com/yum/redhat/8/mongodb-enterprise/4.4/x86_64/RPMS/mongodb-mongosh-0.1.0.el7.x86_64.rpm',
              'https://repo.mongodb.org/yum/redhat/8/mongodb-org/5.0/x86_64/RPMS/mongodb-mongosh-0.1.0.el7.x86_64.rpm',
              'https://repo.mongodb.com/yum/redhat/8/mongodb-enterprise/5.0/x86_64/RPMS/mongodb-mongosh-0.1.0.el7.x86_64.rpm',
              'https://repo.mongodb.org/yum/amazon/2/mongodb-org/4.4/x86_64/RPMS/mongodb-mongosh-0.1.0.el7.x86_64.rpm',
              'https://repo.mongodb.com/yum/amazon/2/mongodb-enterprise/4.4/x86_64/RPMS/mongodb-mongosh-0.1.0.el7.x86_64.rpm',
              'https://repo.mongodb.org/yum/amazon/2/mongodb-org/5.0/x86_64/RPMS/mongodb-mongosh-0.1.0.el7.x86_64.rpm',
              'https://repo.mongodb.com/yum/amazon/2/mongodb-enterprise/5.0/x86_64/RPMS/mongodb-mongosh-0.1.0.el7.x86_64.rpm'
            ]
          }
        ] as const).forEach(({ variant, url, publishedUrls }) => {
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
          await barque.releaseToBarque('debian-x64', debUrl);
        } catch (error) {
          expect(error.message).to.include('Curator is unable to upload https://s3.amazonaws.com/mciuploads/mongosh/5ed7ee5d8683818eb28d9d3b5c65837cde4a08f5/mongodb-mongosh_0.1.0_amd64.deb,ubuntu1804,amd64 to barque');
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

  describe('getReposAndArch', () => {
    for (const variant of ALL_BUILD_VARIANTS) {
      it(`returns results for ${variant}`, () => {
        const result = getReposAndArch(variant);
        expect(result.ppas).to.be.an('array');
        expect(result.arch).to.be.a('string');
      });
    }
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
        nockRepo = nock('https://repo.mongodb.org');

        nockRepo.head('/apt/dist/package1.deb').reply(200);

        nockRepo.head('/apt/dist/package2.deb').twice().reply(404);
        nockRepo.head('/apt/dist/package2.deb').reply(200);

        nockRepo.head('/apt/dist/package3.deb').reply(404);
        nockRepo.head('/apt/dist/package3.deb').reply(200);
      });

      it('waits until all packages are available', async() => {
        await barque.waitUntilPackagesAreAvailable([
          'https://repo.mongodb.org/apt/dist/package1.deb',
          'https://repo.mongodb.org/apt/dist/package2.deb',
          'https://repo.mongodb.org/apt/dist/package3.deb'
        ], 300, 1);

        expect(nock.isDone()).to.be.true;
      });
    });

    context('with really slow packages', () => {
      let nockRepo: nock.Scope;

      beforeEach(() => {
        nockRepo = nock('https://repo.mongodb.org');
        nockRepo.head('/apt/dist/package1.deb').reply(200);
        nockRepo.head('/apt/dist/package2.deb').reply(404).persist();
      });

      it('fails when the timeout is hit', async() => {
        try {
          await barque.waitUntilPackagesAreAvailable([
            'https://repo.mongodb.org/apt/dist/package1.deb',
            'https://repo.mongodb.org/apt/dist/package2.deb',
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
