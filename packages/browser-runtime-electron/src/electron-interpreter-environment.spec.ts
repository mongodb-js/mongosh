import { ElectronInterpreterEnvironment } from './electron-interpreter-environment';
import { expect } from 'chai';
import { inspect } from 'util';

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

  describe('Date formatting', function () {
    it('formats dates inside the context as ISODate', function () {
      const env = new ElectronInterpreterEnvironment({});
      expect(
        env.sloppyEval("new Date('2020-11-06T14:26:29.131Z')")[inspect.custom]()
      ).to.equal("ISODate('2020-11-06T14:26:29.131Z')");
    });

    it('does not patch Date.prototype outside the context', function () {
      const before = (Date.prototype as any)[inspect.custom];
      new ElectronInterpreterEnvironment({});
      expect((Date.prototype as any)[inspect.custom]).to.equal(before);
    });
  });
});
