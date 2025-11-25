import * as chai from 'chai';
import { expect } from 'chai';
import sinon from 'sinon';
import type { Config } from './config';
import type { uploadArtifactToEvergreen } from './evergreen';
import type { PackageFile } from './packaging';
import { runUpload } from './run-upload';
import { dummyConfig } from '../test/helpers';
import type { promises as fs } from 'fs';
import path from 'path';
import sinonChai from 'sinon-chai';

chai.use(sinonChai);

const normalizePathToCurrentOS = (p: string) => path.join(p);

describe('do-upload', function () {
  let config: Config;
  let tarballFile: PackageFile;
  let uploadToEvergreen: typeof uploadArtifactToEvergreen;
  let fsAccess: typeof fs.access;

  beforeEach(function () {
    config = {
      ...dummyConfig,
      packageVariant: 'linux-x64',
      packageInformation: () => {
        return { metadata: { version: 'vV.V.V', name: 'mongosh' } } as any;
      },
    };

    tarballFile = {
      path: 'outputDir/mongosh-vV.V.V-linux-x64.tgz',
      contentType: 'application/gzip',
    };
    uploadToEvergreen = sinon.spy();
    fsAccess = sinon.spy();
  });

  for (const triggeringTag of ['v0.7.0', 'v0.7.0-draft.0']) {
    it(`uploads the artifact to evergreen using ${triggeringTag} as version`, async function () {
      config.triggeringGitTag = triggeringTag;

      await runUpload(config, uploadToEvergreen, fsAccess);

      expect(uploadToEvergreen).to.have.been.calledWith(
        normalizePathToCurrentOS(tarballFile.path),
        config.evgAwsKey,
        config.evgAwsSecret,
        config.project,
        triggeringTag
      );

      expect(fsAccess).to.have.been.calledTwice;
    });
  }

  it('uploads the artifact to evergreen using the revision if no triggering git tag is present', async function () {
    await runUpload(config, uploadToEvergreen, fsAccess);

    expect(uploadToEvergreen).to.have.been.calledWith(
      normalizePathToCurrentOS(tarballFile.path),
      config.evgAwsKey,
      config.evgAwsSecret,
      config.project,
      config.revision
    );

    expect(fsAccess).to.have.been.calledTwice;
  });
});
