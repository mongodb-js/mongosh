import { expect } from 'chai';
import sinon from 'ts-sinon';
import { uploadArtifactToDownloadCenter } from './artifacts';

describe('DownloadCenter artifacts', () => {
  describe('uploadArtifactToDownloadCenter', () => {
    let dlCenter: sinon.SinonStub;
    let uploadAsset: sinon.SinonStub;

    beforeEach(() => {
      uploadAsset = sinon.stub();
      dlCenter = sinon.stub();

      dlCenter.returns({ uploadAsset });
    });

    it('uploads with correct configuration', async() => {
      await uploadArtifactToDownloadCenter(
        __filename,
        'accessKey',
        'secretKey',
        dlCenter as any
      );

      expect(dlCenter).to.have.been.calledWith({
        bucket: 'downloads.10gen.com',
        accessKeyId: 'accessKey',
        secretAccessKey: 'secretKey'
      });
      expect(uploadAsset).to.have.been.calledWith(
        'compass/artifacts.spec.ts',
        sinon.match.any
      );
    });
  });
});
