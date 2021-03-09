import { expect } from 'chai';
import sinon from 'sinon';
import { Config } from '../config';
import { macOSSignAndNotarize } from './macos-sign';

describe('packaging macos-sign', () => {
  describe('macOSSignAndNotarize', () => {
    let config: Config;
    let signStub: sinon.SinonStub;
    let notarizeStub: sinon.SinonStub;
    let runCreatePackageStub: sinon.SinonStub;

    before(() => {
      config = {
        appleCodesignIdentity: 'signingIdentity',
        appleCodesignEntitlementsFile: 'entitlementsFile',
        appleNotarizationBundleId: 'bundleId',
        appleNotarizationUsername: 'username',
        appleNotarizationApplicationPassword: 'password'
      } as Config;

      signStub = sinon.stub().resolves();
      notarizeStub = sinon.stub().resolves();
      runCreatePackageStub = sinon.stub().resolves({
        path: 'package/path',
        contentType: 'pkg'
      });
    });

    context('processes the package', () => {
      before(async() => {
        await macOSSignAndNotarize(
          [
            'executable1', 'executable2'
          ],
          config,
          runCreatePackageStub,
          signStub,
          notarizeStub
        );
      });

      it('signs all executables', () => {
        expect(signStub).to.have.been.calledTwice;
        expect(signStub).to.have.been.calledWith('executable1', config.appleCodesignIdentity, config.appleCodesignEntitlementsFile);
        expect(signStub).to.have.been.calledWith('executable2', config.appleCodesignIdentity, config.appleCodesignEntitlementsFile);
      });

      it('creates the package', () => {
        expect(runCreatePackageStub).to.have.been.called;
      });

      it('notarizes the package', () => {
        expect(notarizeStub).to.have.been.calledWith(
          config.appleNotarizationBundleId,
          'package/path',
          config.appleNotarizationUsername,
          config.appleNotarizationApplicationPassword
        );
      });
    });
  });
});
