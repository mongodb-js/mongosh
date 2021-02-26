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
      it('execCurator function succeeds', async() => {
        barque.execCurator = sinon.stub().returns(Promise.resolve(true));
        barque.createCuratorDir = sinon.stub().returns(Promise.resolve('./'));
        barque.extractLatestCurator = sinon.stub().returns(Promise.resolve(true));

        const debUrl = 'https://s3.amazonaws.com/mciuploads/mongosh/5ed7ee5d8683818eb28d9d3b5c65837cde4a08f5/mongosh_0.1.0_amd64.deb';

        await barque.releaseToBarque(BuildVariant.Debian, debUrl);
        expect(barque.createCuratorDir).to.have.been.called;
        expect(barque.extractLatestCurator).to.have.been.called;
        expect(barque.execCurator).to.have.been.called;
      });

      it('execCurator function fails', async() => {
        barque.execCurator = sinon.stub().rejects(new Error('error'));
        barque.createCuratorDir = sinon.stub().returns(Promise.resolve('./'));
        barque.extractLatestCurator = sinon.stub().returns(Promise.resolve(true));

        const debUrl = 'https://s3.amazonaws.com/mciuploads/mongosh/5ed7ee5d8683818eb28d9d3b5c65837cde4a08f5/mongosh_0.1.0_amd64.deb';

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
      barque = new Barque(config);

      barque.execCurator = sinon.stub().returns(Promise.resolve(true));
      barque.createCuratorDir = sinon.stub().returns(Promise.resolve('./'));
      barque.extractLatestCurator = sinon.stub().returns(Promise.resolve(true));

      const debUrl = 'https://s3.amazonaws.com/mciuploads/mongosh/5ed7ee5d8683818eb28d9d3b5c65837cde4a08f5/mongosh_0.1.0_linux.deb';

      await barque.releaseToBarque(BuildVariant.Debian, debUrl);
      expect(barque.createCuratorDir).to.not.have.been.called;
      expect(barque.extractLatestCurator).to.not.have.been.called;
      expect(barque.execCurator).to.not.have.been.called;
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
