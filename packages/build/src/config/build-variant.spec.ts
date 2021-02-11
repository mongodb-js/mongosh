import { expect } from 'chai';
import { ALL_BUILD_VARIANTS, BuildVariant } from './build-variant';

describe('BuildVariant', () => {
  describe('all build variants', () => {
    it('has all of them', () => {
      expect(ALL_BUILD_VARIANTS).to.have.length(6);
      expect(ALL_BUILD_VARIANTS).to.contain(BuildVariant.Windows);
      expect(ALL_BUILD_VARIANTS).to.contain(BuildVariant.WindowsMSI);
      expect(ALL_BUILD_VARIANTS).to.contain(BuildVariant.MacOs);
      expect(ALL_BUILD_VARIANTS).to.contain(BuildVariant.Linux);
      expect(ALL_BUILD_VARIANTS).to.contain(BuildVariant.Debian);
      expect(ALL_BUILD_VARIANTS).to.contain(BuildVariant.Redhat);
    });
  });
});
