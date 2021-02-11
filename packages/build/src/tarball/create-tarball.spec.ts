import { expect } from 'chai';
import { withTempPackageEach } from '../../test/helpers';
import { ALL_BUILD_VARIANTS } from '../config';
import { createTarball } from './create-tarball';
import sinon = require('sinon');

describe('tarball create-tarball', () => {
  describe('can create an archive for all build variants', () => {
    const tmpPkg = withTempPackageEach();

    let tarballPosixStub: sinon.SinonStub;
    let tarballRedhatStub: sinon.SinonStub;
    let tarballDebianStub: sinon.SinonStub;
    let tarballWindowsMSIStub:sinon.SinonStub;
    let tarballWindowsStub:sinon.SinonStub;

    beforeEach(() => {
      tarballPosixStub = sinon.stub();
      tarballRedhatStub = sinon.stub();
      tarballDebianStub = sinon.stub();
      tarballWindowsMSIStub = sinon.stub();
      tarballWindowsStub = sinon.stub();
    });

    ALL_BUILD_VARIANTS.forEach(variant => {
      it(`can create a tarball for ${variant}`, async() => {
        const result = await createTarball(
          tmpPkg.tarballDir,
          variant,
          tmpPkg.pkgConfig,
          tarballPosixStub,
          tarballRedhatStub,
          tarballDebianStub,
          tarballWindowsMSIStub,
          tarballWindowsStub
        );
        expect(result).to.not.be.undefined;
      });
    });

    it('throws an error for an unknown variant', async() => {
      try {
        await createTarball(tmpPkg.tarballDir, 'nope' as any, tmpPkg.pkgConfig);
      } catch (e) {
        expect(e).to.not.be.undefined;
        return;
      }
      expect.fail('Expected error');
    });
  });
});
