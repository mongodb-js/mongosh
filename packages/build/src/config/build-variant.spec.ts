import { expect } from 'chai';
import { ALL_PACKAGE_VARIANTS } from './build-variant';

describe('BuildVariant', () => {
  describe('all build variants', () => {
    it('has all of them', () => {
      expect(ALL_PACKAGE_VARIANTS).to.have.length(23);
      expect(ALL_PACKAGE_VARIANTS).to.contain('win32msi-x64');
      expect(ALL_PACKAGE_VARIANTS).to.contain('darwin-x64');
      expect(ALL_PACKAGE_VARIANTS).to.contain('deb-x64');
      expect(ALL_PACKAGE_VARIANTS).to.contain('deb-arm64');
      for (const arch of ['x64', 'arm64', 's390x', 'ppc64le']) {
        expect(ALL_PACKAGE_VARIANTS).to.contain(`linux-${arch}`);
        expect(ALL_PACKAGE_VARIANTS).to.contain(`rpm-${arch}`);
      }
    });
  });
});
