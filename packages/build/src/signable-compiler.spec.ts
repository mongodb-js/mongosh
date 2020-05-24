import { expect } from 'chai';
import SignableCompiler, { Target } from './signable-compiler';
import Platform from './platform';

describe('signable compiler module', () => {
  describe('SignableCompiler', () => {
    describe('#compile', () => {

    });

    describe('#determineTarget', () => {
      context('when the platform is windows', () => {
        const compiler = new SignableCompiler('', '', Platform.Windows);

        it('returns win', () => {
          expect(compiler.determineTarget()).to.equal(Target.Windows);
        });
      });

      context('when the platform is macos', () => {
        const compiler = new SignableCompiler('', '', Platform.MacOs);

        it('returns macos', () => {
          expect(compiler.determineTarget()).to.equal(Target.MacOs);
        });
      });

      context('when the platform is linux', () => {
        const compiler = new SignableCompiler('', '', Platform.Linux);

        it('returns linux', () => {
          expect(compiler.determineTarget()).to.equal(Target.Linux);
        });
      });
    });
  });

  describe('.Target', () => {
    describe('Target.Windows', () => {
      it('returns win', () => {
        expect(Target.Windows).to.equal('win32-x86-12.4.0');
      });
    });

    describe('Target.MacOs', () => {
      it('returns macos', () => {
        expect(Target.MacOs).to.equal('darwin-12.4.0');
      });
    });

    describe('Target.Linux', () => {
      it('returns linux', () => {
        expect(Target.Linux).to.equal('linux-x86-12.4.0');
      });
    });
  });
});
