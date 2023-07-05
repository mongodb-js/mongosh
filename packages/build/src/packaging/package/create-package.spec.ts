import { expect } from 'chai';
import sinon from 'sinon';
import { withTempPackageEach } from '../../../test/helpers';
import { ALL_PACKAGE_VARIANTS } from '../../config';
import { createPackage } from './create-package';

describe('archive create-archive', function () {
  describe('can create an archive for all build variants', function () {
    const tmpPkg = withTempPackageEach();

    let createPosixArchiveStub: sinon.SinonStub;
    let createRedhatArchiveStub: sinon.SinonStub;
    let createDebianArchiveStub: sinon.SinonStub;
    let createMSIArchiveStub: sinon.SinonStub;
    let createZipArchiveStub: sinon.SinonStub;

    beforeEach(function () {
      createPosixArchiveStub = sinon.stub();
      createRedhatArchiveStub = sinon.stub();
      createDebianArchiveStub = sinon.stub();
      createMSIArchiveStub = sinon.stub();
      createZipArchiveStub = sinon.stub();
    });

    ALL_PACKAGE_VARIANTS.forEach((variant) => {
      it(`can create a tarball for ${variant}`, async function () {
        const result = await createPackage(
          tmpPkg.tarballDir,
          variant,
          tmpPkg.pkgConfig,
          createPosixArchiveStub,
          createRedhatArchiveStub,
          createDebianArchiveStub,
          createMSIArchiveStub,
          createZipArchiveStub
        );
        expect(result).to.not.be.undefined;
      });
    });

    it('throws an error for an unknown variant', async function () {
      try {
        await createPackage(tmpPkg.tarballDir, 'nope' as any, tmpPkg.pkgConfig);
      } catch (e: any) {
        expect(e).to.not.be.undefined;
        return;
      }
      expect.fail('Expected error');
    });
  });
});
