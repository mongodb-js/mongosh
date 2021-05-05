import { expect } from 'chai';
import os from 'os';
import path from 'path';
import sinon from 'sinon';
import { notarizeMsi, NotarizeMsiOptions } from './msi-sign';

describe('packaging msi-sign', () => {
  context('with invalid options', () => {
    it('fails when file is missing', async() => {
      const e = await notarizeMsi('', {} as any).catch(e => e);
      expect(e).to.not.be.undefined;
      expect(e.message).to.match(/missing file/);
    });
    it('fails when signingKeyName is missing', async() => {
      const e = await notarizeMsi('a file', {} as any).catch(e => e);
      expect(e).to.not.be.undefined;
      expect(e.message).to.match(/missing signing key name/);
    });
    it('fails when authToken is missing', async() => {
      const e = await notarizeMsi('a file', {
        signingKeyName: 'keyName'
      } as any).catch(e => e);
      expect(e).to.not.be.undefined;
      expect(e.message).to.match(/missing auth token/);
    });
    it('fails when signingComment is missing', async() => {
      const e = await notarizeMsi('a file', {
        signingKeyName: 'keyName',
        authToken: 'token'
      } as any).catch(e => e);
      expect(e).to.not.be.undefined;
      expect(e.message).to.match(/missing signing comment/);
    });
  });

  context('with correct options', () => {
    let spawnSync: sinon.SinonStub;
    const signingOptions: NotarizeMsiOptions = {
      signingKeyName: 'keyName',
      authToken: 'authToken',
      signingComment: 'A Comment'
    };

    beforeEach(() => {
      spawnSync = sinon.stub();
    });

    it('runs notary client', async() => {
      await notarizeMsi(
        __filename,
        signingOptions,
        spawnSync
      );

      expect(spawnSync).to.have.been.calledWith(
        'python',
        [
          'C:\\cygwin\\usr\\local\\bin\\notary-client.py',
          '--key-name', 'keyName',
          '--auth-token-file', path.join(os.homedir(), '.notary-mongosh-token.tmp'),
          '--comment', 'A Comment',
          '--notary-url', 'http://notary-service.build.10gen.cc:5000/',
          '--outputs', 'sig',
          '--package-file-suffix', '',
          __filename
        ],
        {
          encoding: 'utf8',
          cwd: path.dirname(__filename)
        }
      );
    });
  });
});
