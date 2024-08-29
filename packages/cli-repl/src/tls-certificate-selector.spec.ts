import path from 'path';
import sinon from 'sinon';
import { expect } from 'chai';
import { getTlsCertificateSelector } from './tls-certificate-selector';

describe('arg-mapper.applyTlsCertificateSelector', function () {
  context('with fake ca provider', function () {
    let exportCertificateAndPrivateKey: sinon.SinonStub;
    beforeEach(function () {
      process.env.TEST_OS_EXPORT_CERTIFICATE_AND_KEY_PATH = path.resolve(
        __dirname,
        '..',
        'test',
        'fixtures',
        'fake-os-ca-provider.js'
      );
      exportCertificateAndPrivateKey = sinon.stub();
      require(process.env.TEST_OS_EXPORT_CERTIFICATE_AND_KEY_PATH).setFn(
        (search: unknown) => exportCertificateAndPrivateKey(search)
      );
    });
    afterEach(function () {
      delete process.env.TEST_OS_EXPORT_CERTIFICATE_AND_KEY_PATH;
    });

    it('leaves node options unchanged when no selector is given', async function () {
      const applyTlsCertificateSelector = await getTlsCertificateSelector(
        undefined
      );
      expect(applyTlsCertificateSelector).to.not.exist;
    });

    it('throws when the selector has an odd format', async function () {
      try {
        await getTlsCertificateSelector('foo=bar');
        expect.fail('missed exception');
      } catch (err) {
        expect(err).to.match(
          /tlsCertificateSelector needs to include subject or thumbprint/
        );
      }
    });

    it('returns passphrase and pfx as given by the (fake) OS', async function () {
      const passphrase = 'abc';
      const pfx = Buffer.from('abcdef');
      exportCertificateAndPrivateKey.returns({
        passphrase,
        pfx,
      });
      const applyTlsCertificateSelector = await getTlsCertificateSelector(
        'subject=Foo Bar'
      );
      expect(applyTlsCertificateSelector).to.deep.equal({
        passphrase,
        pfx,
      });
    });
  });

  context('with what the OS gives us', function () {
    it('throws an error on non-win32 and non-darwin', async function () {
      if (process.platform === 'win32' || process.platform === 'darwin') {
        return this.skip();
      }
      try {
        await getTlsCertificateSelector('subject=Foo Bar');
        expect.fail('missed exception');
      } catch (err) {
        expect(err).to.match(
          /tlsCertificateSelector is not supported on this platform/
        );
      }
    });

    it('tries to search the OS CA store on win32', async function () {
      if (process.platform !== 'win32') {
        return this.skip();
      }
      try {
        await getTlsCertificateSelector('subject=Foo Bar');
        expect.fail('missed exception');
      } catch (err) {
        expect(err).to.match(/Could not resolve certificate specification/);
      }
    });

    it('tries to search the OS keychain on darwin', async function () {
      if (process.platform !== 'darwin') {
        return this.skip();
      }
      try {
        await getTlsCertificateSelector('subject=Foo Bar');
        expect.fail('missed exception');
      } catch (err) {
        expect(err).to.match(
          /Could not find a matching certificate|The specified item could not be found in the keychain/
        );
      }
    });
  });
});
