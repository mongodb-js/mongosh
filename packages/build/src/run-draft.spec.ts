import chai, { expect } from 'chai';
import sinon from 'ts-sinon';
import { ALL_PACKAGE_VARIANTS, Config } from './config';
import { uploadArtifactToDownloadCenter as uploadArtifactToDownloadCenterFn } from './download-center';
import { downloadArtifactFromEvergreen as downloadArtifactFromEvergreenFn } from './evergreen';
import { notarizeArtifact as notarizeArtifactFn } from './packaging';
import { generateChangelog as generateChangelogFn } from './git';
import { GithubRepo } from '@mongodb-js/devtools-github-repo';
import { ensureGithubReleaseExistsAndUpdateChangelogFn, runDraft } from './run-draft';
import { dummyConfig } from '../test/helpers';

chai.use(require('sinon-chai'));

function createStubRepo(overrides?: any): GithubRepo {
  return sinon.createStubInstance(GithubRepo, overrides) as unknown as GithubRepo;
}

describe('draft', () => {
  let config: Config;
  let githubRepo: GithubRepo;
  let uploadArtifactToDownloadCenter: typeof uploadArtifactToDownloadCenterFn;
  let downloadArtifactFromEvergreen: typeof downloadArtifactFromEvergreenFn;
  let notarizeArtifact: typeof notarizeArtifactFn;

  beforeEach(() => {
    config = { ...dummyConfig };

    uploadArtifactToDownloadCenter = sinon.spy();
    downloadArtifactFromEvergreen = sinon.spy(() => Promise.resolve('filename'));
    notarizeArtifact = sinon.spy();
  });

  describe('runDraft', () => {
    let ensureGithubReleaseExistsAndUpdateChangelog: typeof ensureGithubReleaseExistsAndUpdateChangelogFn;

    beforeEach(() => {
      ensureGithubReleaseExistsAndUpdateChangelog = sinon.stub();
    });

    context('when running with a triggeringGitTag', () => {
      let uploadReleaseAsset : sinon.SinonStub;

      beforeEach(async() => {
        uploadReleaseAsset = sinon.stub();
        githubRepo = createStubRepo({
          uploadReleaseAsset
        });
        config.triggeringGitTag = 'v0.8.1-draft.2';

        await runDraft(
          config,
          githubRepo,
          uploadArtifactToDownloadCenter,
          downloadArtifactFromEvergreen,
          ensureGithubReleaseExistsAndUpdateChangelog,
          notarizeArtifact
        );
      });

      it('ensures the github release exists and updates it if necessary', () => {
        expect(ensureGithubReleaseExistsAndUpdateChangelog).to.have.been.calledWith(
          config.version, `v${config.version}`, githubRepo
        );
      });

      it('downloads existing artifacts from evergreen', () => {
        expect(downloadArtifactFromEvergreen).to.have.been.callCount(ALL_PACKAGE_VARIANTS.length);
      });

      it('asks the notary service to sign files', () => {
        expect(notarizeArtifact).to.have.been.callCount(ALL_PACKAGE_VARIANTS.length);
      });

      it('uploads artifacts to download center', () => {
        expect(uploadArtifactToDownloadCenter).to.have.been.callCount(ALL_PACKAGE_VARIANTS.length);
      });

      it('uploads the artifacts to the github release', () => {
        expect(uploadReleaseAsset).to.have.been.callCount(ALL_PACKAGE_VARIANTS.length);
      });
    });

    it('does not run when there is no triggering tag', async() => {
      const uploadReleaseAsset = sinon.stub();
      githubRepo = createStubRepo({
        uploadReleaseAsset
      });

      await runDraft(
        config,
        githubRepo,
        uploadArtifactToDownloadCenter,
        downloadArtifactFromEvergreen,
        ensureGithubReleaseExistsAndUpdateChangelog,
        notarizeArtifact
      );
      expect(ensureGithubReleaseExistsAndUpdateChangelog).to.not.have.been.called;
      expect(downloadArtifactFromEvergreen).to.not.have.been.called;
      expect(uploadArtifactToDownloadCenter).to.not.have.been.called;
      expect(uploadReleaseAsset).to.not.have.been.called;
    });

    it('fails if packageInformation is missing', async() => {
      const uploadReleaseAsset = sinon.stub();
      githubRepo = createStubRepo({
        uploadReleaseAsset
      });
      config.triggeringGitTag = 'v0.8.1-draft.2';
      config.packageInformation = undefined;

      try {
        await runDraft(
          config,
          githubRepo,
          uploadArtifactToDownloadCenter,
          downloadArtifactFromEvergreen,
          ensureGithubReleaseExistsAndUpdateChangelog,
          notarizeArtifact
        );
      } catch (e: any) {
        expect(e.message).to.contain('Missing package information from config');
        expect(ensureGithubReleaseExistsAndUpdateChangelog).to.not.have.been.called;
        expect(downloadArtifactFromEvergreen).to.not.have.been.called;
        expect(uploadArtifactToDownloadCenter).to.not.have.been.called;
        expect(uploadReleaseAsset).to.not.have.been.called;
        expect(notarizeArtifact).to.not.have.been.called;
        return;
      }
      expect.fail('Expected error');
    });
  });

  describe('ensureGithubReleaseExistsAndUpdateChangelog', () => {
    let generateChangelog: typeof generateChangelogFn;

    beforeEach(() => {
      generateChangelog = sinon.stub().returns('Nice changelog');
    });

    it('generates the release notes and updates the release', async() => {
      const getPreviousReleaseTag = sinon.stub().resolves('v0.8.0');
      const updateDraftRelease = sinon.stub().resolves();
      githubRepo = createStubRepo({
        getPreviousReleaseTag, updateDraftRelease
      });

      await ensureGithubReleaseExistsAndUpdateChangelogFn(
        '0.8.1', 'v0.8.1', githubRepo, generateChangelog
      );
      expect(getPreviousReleaseTag).to.have.been.called;
      expect(generateChangelog).to.have.been.called;
      expect(updateDraftRelease).to.have.been.calledWith({
        name: '0.8.1',
        tag: 'v0.8.1',
        notes: 'Nice changelog\n\nSee an overview of all solved issues [in Jira](https://jira.mongodb.org/issues/?jql=project%20%3D%20MONGOSH%20AND%20fixVersion%20%3D%200.8.1)'
      });
    });

    it('skips changelog generation when no previous tag is found', async() => {
      const getPreviousReleaseTag = sinon.stub().resolves(undefined);
      const updateDraftRelease = sinon.stub().resolves();
      githubRepo = createStubRepo({
        getPreviousReleaseTag, updateDraftRelease
      });

      await ensureGithubReleaseExistsAndUpdateChangelogFn(
        '0.8.1', 'v0.8.1', githubRepo, generateChangelog
      );
      expect(getPreviousReleaseTag).to.have.been.called;
      expect(generateChangelog).to.not.have.been.called;
      expect(updateDraftRelease).to.have.been.calledWith({
        name: '0.8.1',
        tag: 'v0.8.1',
        notes: 'See an overview of all solved issues [in Jira](https://jira.mongodb.org/issues/?jql=project%20%3D%20MONGOSH%20AND%20fixVersion%20%3D%200.8.1)'
      });
    });
  });
});
