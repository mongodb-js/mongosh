import path from 'path';
import sinon from 'sinon';
import { expect } from 'chai';
import { getTlsCertificateSelector } from './tls-certificate-selector';

describe('arg-mapper.applyTlsCertificateSelector', () => {
  context('with fake ca provider', () => {
    let exportCertificateAndPrivateKey: sinon.SinonStub;
    beforeEach(() => {
      process.env.TEST_OS_EXPORT_CERTIFICATE_AND_KEY_PATH =
        path.resolve(__dirname, '..', 'test', 'fixtures', 'fake-os-ca-provider.js');
      exportCertificateAndPrivateKey = sinon.stub();
      require(process.env.TEST_OS_EXPORT_CERTIFICATE_AND_KEY_PATH)
        .setFn((search) => exportCertificateAndPrivateKey(search));
    });
    afterEach(() => {
      delete process.env.TEST_OS_EXPORT_CERTIFICATE_AND_KEY_PATH;
    });

    it('leaves node options unchanged when no selector is given', () => {
      const applyTlsCertificateSelector = getTlsCertificateSelector(undefined);
      expect(applyTlsCertificateSelector).to.not.exist;
    });

    it('throws when the selector has an odd format', () => {
      expect(() => getTlsCertificateSelector('foo=bar'))
        .to.throw(/tlsCertificateSelector needs to include subject or thumbprint/);
    });

    it('returns passphrase and pfx as given by the (fake) OS', () => {
      const passphrase = 'abc';
      const pfx = Buffer.from('abcdef');
      exportCertificateAndPrivateKey.returns({
        passphrase, pfx
      });
      const applyTlsCertificateSelector = getTlsCertificateSelector('subject=Foo Bar');
      expect(applyTlsCertificateSelector).to.deep.equal({
        passphrase, pfx
      });
    });
  });

  context('with what the OS gives us', () => {
    it('throws an error on non-win32 and non-darwin', function() {
      if (process.platform === 'win32' || process.platform === 'darwin') {
        return this.skip();
      }
      expect(() => getTlsCertificateSelector('subject=Foo Bar'))
        .to.throw(/tlsCertificateSelector is not supported on this platform/);
    });

    it('tries to search the OS CA store on win32', function() {
      if (process.platform !== 'win32') {
        return this.skip();
      }
      expect(() => getTlsCertificateSelector('subject=Foo Bar'))
        .to.throw(/Could not resolve certificate specification/);
    });

    it('tries to search the OS keychain on darwin', function() {
      if (process.platform !== 'darwin') {
        return this.skip();
      }
      expect(() => getTlsCertificateSelector('subject=Foo Bar'))
        .to.throw(/Could not find a matching certificate/);
    });
  });
});
