import { PutObjectCommand } from '@aws-sdk/client-s3';
import { expect } from 'chai';
import { promises as fs } from 'fs';
import path from 'path';
import rimraf from 'rimraf';
import sinon from 'sinon';
import { promisify } from 'util';
import {
  downloadArtifactFromEvergreen,
  uploadArtifactToEvergreen,
} from './artifacts';

describe('evergreen artifacts', function () {
  describe('uploadArtifactToEvergreen', function () {
    let send: sinon.SinonStub;
    let S3: sinon.SinonStub;

    beforeEach(function () {
      send = sinon.stub().resolves({});
      S3 = sinon.stub().returns({ send });
    });

    it('uploads to the evergreen bucket and returns the artifact url', async function () {
      const url = await uploadArtifactToEvergreen(
        __filename,
        'accessKey',
        'secretKey',
        'mongosh',
        'abc123',
        undefined,
        S3 as any
      );

      expect(S3).to.have.been.calledWithExactly({
        region: 'us-east-1',
        credentials: {
          accessKeyId: 'accessKey',
          secretAccessKey: 'secretKey',
        },
      });

      expect(send).to.have.been.calledOnce;
      const command = send.lastCall.args[0];
      expect(command).to.be.instanceOf(PutObjectCommand);
      expect(command.input).to.include({
        ACL: 'public-read',
        Bucket: 'mciuploads',
        Key: 'mongosh/abc123/artifacts.spec.ts',
      });

      expect(url).to.equal(
        'https://s3.amazonaws.com/mciuploads/mongosh/abc123/artifacts.spec.ts'
      );
    });

    it('includes the extra tag in the object key when provided', async function () {
      const url = await uploadArtifactToEvergreen(
        __filename,
        'accessKey',
        'secretKey',
        'mongosh',
        'abc123',
        'extra-tag',
        S3 as any
      );

      expect(send.lastCall.args[0].input).to.have.property(
        'Key',
        'mongosh/abc123/extra-tag/artifacts.spec.ts'
      );
      expect(url).to.equal(
        'https://s3.amazonaws.com/mciuploads/mongosh/abc123/extra-tag/artifacts.spec.ts'
      );
    });
  });

  describe('downloadArtifactFromEvergreen', function () {
    let tmpDir: string;

    before(async function () {
      tmpDir = path.join(__dirname, `tmp-${Date.now()}`);
      await fs.mkdir(tmpDir, { recursive: true });
    });

    after(async function () {
      await promisify(rimraf)(tmpDir);
    });

    it('fails for a non-existing file', async function () {
      try {
        await downloadArtifactFromEvergreen('nope', 'mongosh', 'wrong', tmpDir);
      } catch (e: any) {
        return expect(e).to.not.be.undefined;
      }
      expect.fail('Expected error');
    });
  });
});
