import redactPwd from './redact-pwd';
import { expect } from 'chai';

describe('redact password', () => {
  context('when url contains credentials', () => {
    it('returns the <credentials> in output', () => {
      expect(redactPwd('mongodb+srv://admin:catsc@tscat3ca1s@cats-data-sets-e08dy.mongodb.net/admin')).to.equal('mongodb+srv://<credentials>@cats-data-sets-e08dy.mongodb.net/admin');
    });
  });

  context('when url contains no credentials', () => {
    it('does not alter input', () => {
      expect(redactPwd('mongodb://127.0.0.1:27017')).to.include('mongodb://127.0.0.1:27017');
    });
  });
});
