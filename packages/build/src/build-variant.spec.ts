import { expect } from 'chai';
import BuildVariant from './build-variant';

describe('BuildVariant', () => {
  describe('BuildVariant.Windows', () => {
    it('returns win32', () => {
      expect(BuildVariant.Windows).to.equal('windows_ps');
    });
  });

  describe('BuildVariant.MacOs', () => {
    it('returns darwin', () => {
      expect(BuildVariant.MacOs).to.equal('macos');
    });
  });

  describe('BuildVariant.Linux', () => {
    it('returns linux', () => {
      expect(BuildVariant.Linux).to.equal('ubuntu');
    });
  });

  describe('BuildVariant.Debian', () => {
    it('returns debian', () => {
      expect(BuildVariant.Debian).to.equal('debian');
    });
  });
});
