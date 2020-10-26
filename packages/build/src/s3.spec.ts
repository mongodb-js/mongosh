import { expect } from 'chai';
const sinon = require('sinon');
import upload from './s3';

describe('s3 module', () => {
  describe('.upload', () => {
    const params = { ACL: 'public-read' };

    context('when the upload errors', () => {
      const uploadMock = sinon.mock().withArgs(params).yields('error', {});
      const s3Stub: any = { upload: uploadMock };

      it('rejects the promise with the error', (done) => {
        upload(params, s3Stub).catch((error) => {
          expect(error).to.equal('error');
          uploadMock.verify();
          done();
        });
      });
    });

    context('when the upload succeeds', () => {
      const uploadMock = sinon.mock().withArgs(params).yields(null, {});
      const s3Stub: any = { upload: uploadMock };

      it('resolves the promise with the data', async() => {
        const data = await upload(params, s3Stub);
        expect(data).to.deep.equal({});
        uploadMock.verify();
      });
    });
  });
});
