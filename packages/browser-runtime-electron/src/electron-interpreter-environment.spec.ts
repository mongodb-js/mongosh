import { ElectronInterpreterEnvironment } from './electron-interpreter-environment';
import { expect } from 'chai';

describe('IframeRuntime', function () {
  describe('#sloppyEval', function () {
    it('evaluates code in context', function () {
      const env = new ElectronInterpreterEnvironment({ x: 2 });
      expect(env.sloppyEval('x + 1')).to.equal(3);
    });
  });

  describe('#getContextObject', function () {
    it('returns context', function () {
      const env = new ElectronInterpreterEnvironment({ x: 2 });
      expect(env.getContextObject().x).to.equal(2);
    });
  });
});
