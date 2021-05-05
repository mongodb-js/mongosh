import { expect } from 'chai';
import { ALL_BUILD_VARIANTS } from './build-variant';

describe('BuildVariant', () => {
  describe('all build variants', () => {
    it('has all of them', () => {
      expect(ALL_BUILD_VARIANTS).to.have.length(15); // 4 × 3 linux + 3 others
      expect(ALL_BUILD_VARIANTS).to.contain('win32-x64');
      expect(ALL_BUILD_VARIANTS).to.contain('win32msi-x64');
      expect(ALL_BUILD_VARIANTS).to.contain('darwin-x64');
      for (const arch of ['x64', 'arm64', 's390x', 'ppc64le']) {
        expect(ALL_BUILD_VARIANTS).to.contain(`linux-${arch}`);
        expect(ALL_BUILD_VARIANTS).to.contain(`debian-${arch}`);
        expect(ALL_BUILD_VARIANTS).to.contain(`rhel-${arch}`);
      }
    });
  });
});
