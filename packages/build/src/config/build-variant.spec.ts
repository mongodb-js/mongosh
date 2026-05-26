import { expect } from 'chai';
import path from 'path';
import { ALL_PACKAGE_VARIANTS } from './build-variant';
import type { CTAConfig } from './config';

describe('cta-config.json', function () {
  it('has valid regex in all match fields', function () {
    const ctaConfig: CTAConfig = require(path.join(
      __dirname,
      '../../../../config/cta-config.json'
    ));
    for (const [version, cta] of Object.entries(ctaConfig)) {
      if (cta.match === undefined) continue;
      expect(
        () => new RegExp(cta.match as string),
        `match for version "${version}" is not a valid regex`
      ).to.not.throw();
    }
  });
});

describe('BuildVariant', function () {
  describe('all build variants', function () {
    it('has all of them', function () {
      expect(ALL_PACKAGE_VARIANTS).to.have.length(26);
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
