import { expect } from 'chai';
import UnunsignableCompiler, { Target } from './unsignable-compiler';
import Platform from './platform';

describe('unsignable compiler module', () => {
  describe('UnunsignableCompiler', () => {
    describe('#compile', () => {

    });

    describe('#determineTarget', () => {
      context('when the platform is windows', () => {
        const compiler = new UnunsignableCompiler('', '', Platform.Windows);

        it('returns win', () => {
          expect(compiler.determineTarget()).to.equal(Target.Windows);
        });
      });

      context('when the platform is macos', () => {
        const compiler = new UnunsignableCompiler('', '', Platform.MacOs);

        it('returns macos', () => {
          expect(compiler.determineTarget()).to.equal(Target.MacOs);
        });
      });

      context('when the platform is linux', () => {
        const compiler = new UnunsignableCompiler('', '', Platform.Linux);

        it('returns linux', () => {
          expect(compiler.determineTarget()).to.equal(Target.Linux);
        });
      });
    });
  });

  describe('.Target', () => {
    describe('Target.Windows', () => {
      it('returns win', () => {
        expect(Target.Windows).to.equal('win');
      });
    });

    describe('Target.MacOs', () => {
      it('returns macos', () => {
        expect(Target.MacOs).to.equal('macos');
      });
    });

    describe('Target.Linux', () => {
      it('returns linux', () => {
        expect(Target.Linux).to.equal('linux');
      });
    });
  });
});
