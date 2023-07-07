import { expect } from 'chai';
import path from 'path';
import sinon from 'sinon';
import type { NotarizeOptions } from './notary-service';
import { notarizeArtifact } from './notary-service';

describe('packaging artifact signing', function () {
  context('with invalid options', function () {
    it('fails when file is missing', async function () {
      const e = await notarizeArtifact('', {} as any).catch((e) => e);
      expect(e).to.not.be.undefined;
      expect(e.message).to.match(/missing file/);
    });
    it('fails when signingKeyName is missing', async function () {
      const e = await notarizeArtifact('a file', {} as any).catch((e) => e);
      expect(e).to.not.be.undefined;
      expect(e.message).to.match(/missing signing key name/);
    });
    it('fails when authToken is missing', async function () {
      const e = await notarizeArtifact('a file', {
        signingKeyName: 'keyName',
      } as any).catch((e) => e);
      expect(e).to.not.be.undefined;
      expect(e.message).to.match(/missing auth token/);
    });
    it('fails when signingComment is missing', async function () {
      const e = await notarizeArtifact('a file', {
        signingKeyName: 'keyName',
        authToken: 'token',
      } as any).catch((e) => e);
      expect(e).to.not.be.undefined;
      expect(e.message).to.match(/missing signing comment/);
    });
  });

  context('with correct options', function () {
    let spawnSync: sinon.SinonStub;
    const signingOptions: NotarizeOptions = {
      signingKeyName: 'keyName',
      authToken: 'authToken',
      signingComment: 'A Comment',
    };

    beforeEach(function () {
      spawnSync = sinon.stub();
    });

    it('runs notary client', async function () {
      await notarizeArtifact(__filename, signingOptions, spawnSync);

      const authTokenFile = spawnSync
        .getCall(0)
        .args[1].find((arg: string) => arg.includes('notary-mongosh-token'));

      expect(spawnSync).to.have.been.calledWith(
        process.platform === 'win32' ? 'python' : '/usr/bin/python',
        [
          process.platform === 'win32'
            ? 'C:\\cygwin\\usr\\local\\bin\\notary-client.py'
            : '/usr/local/bin/notary-client.py',
          '--key-name',
          'keyName',
          '--auth-token-file',
          authTokenFile,
          '--comment',
          'A Comment',
          '--notary-url',
          'http://notary-service.build.10gen.cc:5000/',
          '--outputs',
          'sig',
          '--package-file-suffix',
          '',
          path.basename(__filename),
        ],
        {
          encoding: 'utf8',
          cwd: path.dirname(__filename),
        }
      );
    });
  });
});
