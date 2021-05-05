import chai, { expect } from 'chai';
import path from 'path';
import sinon from 'ts-sinon';
import { Config } from './config';
import { uploadArtifactToEvergreen } from './evergreen';
import { PackageFile } from './packaging';
import { runUpload } from './run-upload';

chai.use(require('sinon-chai'));

describe('do-upload', () => {
  let config: Config;
  let tarballFile: PackageFile;
  let uploadToEvergreen: typeof uploadArtifactToEvergreen;

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
      appleNotarizationUsername: 'appleNotarizationUsername',
      appleNotarizationApplicationPassword: 'appleNotarizationApplicationPassword',
      appleCodesignIdentity: 'appleCodesignIdentity',
      isCi: true,
      platform: 'platform',
      distributionBuildVariant: 'linux-x64',
      repo: {
        owner: 'owner',
        repo: 'repo',
      },
      execNodeVersion: process.version,
      rootDir: path.resolve(__dirname, '..', '..', '..')
    };

    tarballFile = { path: 'path', contentType: 'application/gzip' };
    uploadToEvergreen = sinon.spy();
  });

  ['v0.7.0', 'v0.7.0-draft.0'].forEach(triggeringTag => {
    it(`uploads the artifact to evergreen using ${triggeringTag} as version`, async() => {
      config.triggeringGitTag = triggeringTag;

      await runUpload(
        config,
        tarballFile,
        uploadToEvergreen
      );

      expect(uploadToEvergreen).to.have.been.calledWith(
        tarballFile.path,
        config.evgAwsKey,
        config.evgAwsSecret,
        config.project,
        triggeringTag
      );
    });
  });

  it('uploads the artifact to evergreen using the revision if no triggering git tag is present', async() => {
    await runUpload(
      config,
      tarballFile,
      uploadToEvergreen
    );

    expect(uploadToEvergreen).to.have.been.calledWith(
      tarballFile.path,
      config.evgAwsKey,
      config.evgAwsSecret,
      config.project,
      config.revision
    );
  });
});
