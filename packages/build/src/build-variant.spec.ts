import { expect } from 'chai';
import BuildVariant, { ALL_BUILD_VARIANTS } from './build-variant';

describe('BuildVariant', () => {
  describe('all build variants', () => {
    it('has all of them', () => {
      expect(ALL_BUILD_VARIANTS).to.have.length(5);
      expect(ALL_BUILD_VARIANTS).to.contain(BuildVariant.Windows);
      expect(ALL_BUILD_VARIANTS).to.contain(BuildVariant.MacOs);
      expect(ALL_BUILD_VARIANTS).to.contain(BuildVariant.Linux);
      expect(ALL_BUILD_VARIANTS).to.contain(BuildVariant.Debian);
      expect(ALL_BUILD_VARIANTS).to.contain(BuildVariant.Redhat);
    });
  });

  describe('BuildVariant.Windows', () => {
    it('returns win32', () => {
      expect(BuildVariant.Windows).to.equal('win32');
    });
  });

  describe('BuildVariant.MacOs', () => {
    it('returns darwin', () => {
      expect(BuildVariant.MacOs).to.equal('darwin');
    });
  });

  describe('BuildVariant.Linux', () => {
    it('returns linux', () => {
      expect(BuildVariant.Linux).to.equal('linux');
    });
  });

  describe('BuildVariant.Debian', () => {
    it('returns debian', () => {
      expect(BuildVariant.Debian).to.equal('debian');
    });
  });

  describe('BuildVariant.Redhat', () => {
    it('returns rhel', () => {
      expect(BuildVariant.Redhat).to.equal('rhel');
    });
  });
});
