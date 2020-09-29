import { Barque } from './barque';
import { expect } from 'chai';
import Config from './config';
import sinon from 'sinon';
import fs from 'fs-extra';
import path from 'path';

describe('Barque', () => {
  let barque: Barque;
  let config: Config;

  beforeEach(() => {
    config = {
      version: 'version',
      bundleId: 'bundleId',
      input: 'input',
      execInput: 'execInput',
      outputDir: 'outputDir',
      analyticsConfig: 'analyticsConfig',
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
      appleUser: 'appleUser',
      applePassword: 'applePassword',
      appleAppIdentity: 'appleAppIdentity',
      isCi: true,
      platform: 'linux',
      buildVariant: 'linux',
      repo: {
        owner: 'owner',
        repo: 'repo',
      }
    };

    barque = new Barque(config);
  });

  describe('.releaseToBarque', () => {
    context('platform is linux', () => {
      it('execCurator function succeeds', async() => {
        barque.execCurator = sinon.stub().returns(Promise.resolve(true));
        barque.createCuratorDir = sinon.stub().returns(Promise.resolve('./'));
        barque.extractLatestCurator = sinon.stub().returns(Promise.resolve(true));

        const tarballURL = 'https://s3.amazonaws.com/mciuploads/mongosh/5ed7ee5d8683818eb28d9d3b5c65837cde4a08f5/mongosh-0.1.0-linux.tgz';

        let err;

        try {
          await barque.releaseToBarque(tarballURL);
        } catch (error) {
          err = error;
        }
        expect(err).to.be.undefined;
        expect(barque.createCuratorDir).to.have.been.called;
        expect(barque.extractLatestCurator).to.have.been.called;
        expect(barque.execCurator).to.have.been.called;
      });

      it('execCurator function fails', async() => {
        barque.execCurator = sinon.stub().rejects(new Error('error'));
        barque.createCuratorDir = sinon.stub().returns(Promise.resolve('./'));
        barque.extractLatestCurator = sinon.stub().returns(Promise.resolve(true));

        const tarballURL = 'https://s3.amazonaws.com/mciuploads/mongosh/5ed7ee5d8683818eb28d9d3b5c65837cde4a08f5/mongosh-0.1.0-linux.tgz';

        let err;

        try {
          await barque.releaseToBarque(tarballURL);
        } catch (error) {
          err = error;
        }

        expect(err).to.not.be.undefined;
        expect(err.message).to.include('Curator is unable to upload to barque');
        expect(barque.createCuratorDir).to.have.been.called;
        expect(barque.extractLatestCurator).to.have.been.called;
        expect(barque.execCurator).to.have.been.called;
      });
    });

    it('platform is not linux', async() => {
      config.platform = 'macos';
      barque = new Barque(config);

      barque.execCurator = sinon.stub().returns(Promise.resolve(true));
      barque.createCuratorDir = sinon.stub().returns(Promise.resolve('./'));
      barque.extractLatestCurator = sinon.stub().returns(Promise.resolve(true));

      const tarballURL = 'https://s3.amazonaws.com/mciuploads/mongosh/5ed7ee5d8683818eb28d9d3b5c65837cde4a08f5/mongosh-0.1.0-linux.tgz';

      await barque.releaseToBarque(tarballURL);
      expect(barque.createCuratorDir).to.have.been.called;
      expect(barque.extractLatestCurator).to.have.been.called;
      expect(barque.execCurator).to.not.have.been.called;
    });
  });

  describe('.determineDistro', () => {
    it('determines distro for ubuntu', async() => {
      const distro = barque.determineDistro('linux');
      expect(distro).to.be.equal('ubuntu1804');
    });

    it('determines distro for debian', async() => {
      const distro = barque.determineDistro('debian');
      expect(distro).to.be.equal('debian10');
    });

    it('determines distro for redhat', async() => {
      const distro = barque.determineDistro('rhel');
      expect(distro).to.be.equal('rhel80');
    });

    it('defaults to ubuntu distro', async() => {
      const distro = barque.determineDistro('redhat');
      expect(distro).to.be.equal('ubuntu1804');
    });
  });

  describe('.determineArch', () => {
    it('determines arch for ubuntu', async() => {
      const distro = barque.determineArch('linux');
      expect(distro).to.be.equal('amd64');
    });

    it('determines arch for debian', async() => {
      const distro = barque.determineArch('debian');
      expect(distro).to.be.equal('amd64');
    });

    it('determines arch for redhat', async() => {
      const distro = barque.determineArch('rhel');
      expect(distro).to.be.equal('x86_64');
    });

    it('defaults to ubuntu arch', async() => {
      const distro = barque.determineArch('redhat');
      expect(distro).to.be.equal('amd64');
    });
  });

  describe('.createCuratorDir', () => {
    it('creates tmp directory that exists', async() => {
      const curatorDirPath = await barque.createCuratorDir();

      let accessErr;
      try {
        await fs.access(curatorDirPath);
      } catch (e) {
        accessErr = e;
      }
      // eslint-disable-next-line
      expect(accessErr).to.be.undefined
    });
  });

  describe('.extractLatestCurator', () => {
    it('extractss latest curator to tmp directory', async() => {
      const curatorDirPath = await barque.createCuratorDir();
      const curatorPath = path.join(curatorDirPath, 'curator');

      await barque.extractLatestCurator(curatorDirPath);

      let accessErr;
      try {
        await fs.access(curatorPath);
      } catch (e) {
        accessErr = e;
      }
      // eslint-disable-next-line
      expect(accessErr).to.be.undefined
    });
  });
});
