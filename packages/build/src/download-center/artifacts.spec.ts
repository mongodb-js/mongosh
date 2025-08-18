import { expect } from 'chai';
import sinon from 'sinon';
import { uploadArtifactToDownloadCenter } from './artifacts';

describe('DownloadCenter artifacts', function () {
  describe('uploadArtifactToDownloadCenter', function () {
    let dlCenter: sinon.SinonStub;
    let uploadAsset: sinon.SinonStub;

    beforeEach(function () {
      uploadAsset = sinon.stub();
      dlCenter = sinon.stub();

      dlCenter.returns({ uploadAsset });
    });

    it('uploads with correct configuration', async function () {
      await uploadArtifactToDownloadCenter(
        __filename,
        'accessKey',
        'secretKey',
        'sessionToken',
        dlCenter as any
      );

      expect(dlCenter).to.have.been.calledWith({
        bucket: 'cdn-origin-compass',
        accessKeyId: 'accessKey',
        secretAccessKey: 'secretKey',
        sessionToken: 'sessionToken',
      });
      expect(uploadAsset).to.have.been.calledWith(
        'compass/artifacts.spec.ts',
        sinon.match.any
      );
    });
  });
});
