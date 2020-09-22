import { expect } from 'chai';
import SignableCompiler from './signable-compiler';
import Platform from './platform';
import semver from 'semver';

describe('signable compiler module', () => {
  describe('SignableCompiler', () => {
    describe('#compile', () => {

    });

    describe('#determineTarget', () => {
      it('returns a valid semver string', () => {
        const target = new SignableCompiler('', '', Platform.Linux).determineTarget();
        expect(() => semver.minVersion(target)).to.not.throw;
      });
    });
  });
});
