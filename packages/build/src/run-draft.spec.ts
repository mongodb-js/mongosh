import * as chai from 'chai';
import { expect } from 'chai';
import sinon from 'sinon';
import type { Config } from './config';
import { ALL_PACKAGE_VARIANTS } from './config';
import type { uploadArtifactToDownloadCenter as uploadArtifactToDownloadCenterFn } from './download-center';
import type { downloadArtifactFromEvergreen as downloadArtifactFromEvergreenFn } from './evergreen';
import type { generateChangelog as generateChangelogFn } from './git';
import { GithubRepo } from '@mongodb-js/devtools-github-repo';
import {
  ensureGithubReleaseExistsAndUpdateChangelogFn,
  runDraft,
} from './run-draft';
import { dummyConfig } from '../test/helpers';
import { PackageBumper } from './npm-packages';
import sinonChai from 'sinon-chai';

chai.use(sinonChai);

function createStubRepo(overrides?: any): GithubRepo {
  return sinon.createStubInstance(
    GithubRepo,
    overrides
  ) as unknown as GithubRepo;
}

describe('draft', function () {
  let config: Config;
  let githubRepo: GithubRepo;
  let uploadArtifactToDownloadCenter: typeof uploadArtifactToDownloadCenterFn;
  let downloadArtifactFromEvergreen: typeof downloadArtifactFromEvergreenFn;

  beforeEach(function () {
    config = { ...dummyConfig };

    uploadArtifactToDownloadCenter = sinon.spy();
    downloadArtifactFromEvergreen = sinon.spy(() =>
      Promise.resolve('filename')
    );
  });

  describe('runDraft', function () {
    let packageBumper: PackageBumper;
    let ensureGithubReleaseExistsAndUpdateChangelog: typeof ensureGithubReleaseExistsAndUpdateChangelogFn;

    beforeEach(function () {
      ensureGithubReleaseExistsAndUpdateChangelog = sinon.stub();
    });

    context('when running with a triggeringGitTag', function () {
      let uploadReleaseAsset: sinon.SinonStub;

      beforeEach(async function () {
        packageBumper = new PackageBumper({
          spawnSync: sinon.stub().resolves(),
        });
        sinon.stub(packageBumper, 'bumpAuxiliaryPackages').resolves();
        sinon.stub(packageBumper, 'bumpMongoshReleasePackages').resolves();

        uploadReleaseAsset = sinon.stub();
        githubRepo = createStubRepo({
          uploadReleaseAsset,
        });
        config.triggeringGitTag = 'v0.8.1-draft.2';

        await runDraft(
          config,
          githubRepo,
          packageBumper,
          uploadArtifactToDownloadCenter,
          downloadArtifactFromEvergreen,
          ensureGithubReleaseExistsAndUpdateChangelog
        );
      });

      it('ensures the github release exists and updates it if necessary', function () {
        expect(
          ensureGithubReleaseExistsAndUpdateChangelog
        ).to.have.been.calledWith(
          config.version,
          `v${config.version}`,
          githubRepo
        );
      });

      it('does not bump auxiliary packages (to avoid SBOM version mismatch)', function () {
        expect(packageBumper.bumpAuxiliaryPackages).not.to.have.been.called;
      });

      it('downloads existing artifacts from evergreen', function () {
        expect(downloadArtifactFromEvergreen).to.have.been.callCount(
          ALL_PACKAGE_VARIANTS.length * 2 // artifacts + signatures
        );
      });

      it('uploads artifacts to download center', function () {
        expect(uploadArtifactToDownloadCenter).to.have.been.callCount(
          ALL_PACKAGE_VARIANTS.length * 2
        );
      });

      it('uploads the artifacts to the github release', function () {
        expect(uploadReleaseAsset).to.have.been.callCount(
          ALL_PACKAGE_VARIANTS.length * 2
        );
      });
    });

    it('does not run when there is no triggering tag', async function () {
      const uploadReleaseAsset = sinon.stub();
      githubRepo = createStubRepo({
        uploadReleaseAsset,
      });

      await runDraft(
        config,
        githubRepo,
        packageBumper,
        uploadArtifactToDownloadCenter,
        downloadArtifactFromEvergreen,
        ensureGithubReleaseExistsAndUpdateChangelog
      );
      expect(ensureGithubReleaseExistsAndUpdateChangelog).to.not.have.been
        .called;
      expect(downloadArtifactFromEvergreen).to.not.have.been.called;
      expect(uploadArtifactToDownloadCenter).to.not.have.been.called;
      expect(uploadReleaseAsset).to.not.have.been.called;
    });

    it('fails if packageInformation is missing', async function () {
      const uploadReleaseAsset = sinon.stub();
      githubRepo = createStubRepo({
        uploadReleaseAsset,
      });
      config.triggeringGitTag = 'v0.8.1-draft.2';
      config.packageInformation = undefined;

      try {
        await runDraft(
          config,
          githubRepo,
          packageBumper,
          uploadArtifactToDownloadCenter,
          downloadArtifactFromEvergreen,
          ensureGithubReleaseExistsAndUpdateChangelog
        );
      } catch (e: any) {
        expect(e.message).to.contain('Missing package information from config');
        expect(ensureGithubReleaseExistsAndUpdateChangelog).to.not.have.been
          .called;
        expect(downloadArtifactFromEvergreen).to.not.have.been.called;
        expect(uploadArtifactToDownloadCenter).to.not.have.been.called;
        expect(uploadReleaseAsset).to.not.have.been.called;
        return;
      }
      expect.fail('Expected error');
    });
  });

  describe('ensureGithubReleaseExistsAndUpdateChangelog', function () {
    let generateChangelog: typeof generateChangelogFn;

    beforeEach(function () {
      generateChangelog = sinon.stub().returns('Nice changelog');
    });

    it('generates the release notes and updates the release', async function () {
      const getPreviousReleaseTag = sinon.stub().resolves('v0.8.0');
      const updateDraftRelease = sinon.stub().resolves();
      githubRepo = createStubRepo({
        getPreviousReleaseTag,
        updateDraftRelease,
      });

      await ensureGithubReleaseExistsAndUpdateChangelogFn(
        '0.8.1',
        'v0.8.1',
        githubRepo,
        generateChangelog
      );
      expect(getPreviousReleaseTag).to.have.been.called;
      expect(generateChangelog).to.have.been.called;
      expect(updateDraftRelease).to.have.been.calledWith({
        name: '0.8.1',
        tag: 'v0.8.1',
        notes:
          'Nice changelog\n\nSee an overview of all solved issues [in Jira](https://jira.mongodb.org/issues/?jql=project%20%3D%20MONGOSH%20AND%20fixVersion%20%3D%200.8.1)',
      });
    });

    it('skips changelog generation when no previous tag is found', async function () {
      const getPreviousReleaseTag = sinon.stub().resolves(undefined);
      const updateDraftRelease = sinon.stub().resolves();
      githubRepo = createStubRepo({
        getPreviousReleaseTag,
        updateDraftRelease,
      });

      await ensureGithubReleaseExistsAndUpdateChangelogFn(
        '0.8.1',
        'v0.8.1',
        githubRepo,
        generateChangelog
      );
      expect(getPreviousReleaseTag).to.have.been.called;
      expect(generateChangelog).to.not.have.been.called;
      expect(updateDraftRelease).to.have.been.calledWith({
        name: '0.8.1',
        tag: 'v0.8.1',
        notes:
          'See an overview of all solved issues [in Jira](https://jira.mongodb.org/issues/?jql=project%20%3D%20MONGOSH%20AND%20fixVersion%20%3D%200.8.1)',
      });
    });
  });
});
