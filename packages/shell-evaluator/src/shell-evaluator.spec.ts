import chai from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
chai.use(sinonChai);
const { expect } = chai;

import ShellEvaluator from './shell-evaluator';
import { EventEmitter } from 'events';

describe('ShellEvaluator', () => {
  let shellEvaluator: ShellEvaluator;
  let serviceProviderMock;
  let containerMock;
  let busMock;

  beforeEach(() => {
    serviceProviderMock = {} as any;
    busMock = new EventEmitter();
    containerMock = { toggleTelemetry: sinon.spy() };

    shellEvaluator = new ShellEvaluator(
      serviceProviderMock,
      busMock,
      containerMock
    );
  });

  describe('setCtx', () => {
    let ctx;

    beforeEach(() => {
      ctx = {};
      shellEvaluator.setCtx(ctx);
    });

    it('sets shell api globals', () => {
      expect(ctx).to.include.all.keys('it', 'help', 'show', 'use');
    });

    it('sets db', () => {
      expect(ctx.db.constructor.name).to.equal('Database');
    });

    it('sets the object as context for the mapper', () => {
      expect((shellEvaluator as any).mapper.context).to.equal(ctx);
    });
  });

  describe('customEval', () => {
    it('strips trailing spaces and ; before calling commands', async() => {
      const use = sinon.spy();
      (shellEvaluator as any).mapper.use = use;
      await shellEvaluator.customEval(null, 'use somedb;  ', {}, '');
      expect(use).to.have.been.calledWith('somedb');
    });

    it('calls original eval for plain javascript', async() => {
      const originalEval = sinon.spy();
      await shellEvaluator.customEval(originalEval, 'doSomething();', {}, '');
      expect(originalEval).to.have.been.calledWith(
        'doSomething();',
        {},
        ''
      );
    });

    it('reverts state if error thrown', async() => {
      const originalEval = () => { throw new Error(); };
      const revertSpy = sinon.spy();
      const saveSpy = sinon.spy();
      shellEvaluator.revertState = revertSpy;
      shellEvaluator.saveState = saveSpy;
      try {
        await shellEvaluator.customEval(originalEval, 'anything()', {}, '');
        // eslint-disable-next-line no-empty
      } catch (e) {
      }
      expect(revertSpy.calledOnce).to.be.true;
      expect(saveSpy.calledOnce).to.be.true;
    });
    it('does not revert state with no error', async() => {
      const originalEval = () => { return 1; };
      const revertSpy = sinon.spy();
      const saveSpy = sinon.spy();
      shellEvaluator.revertState = revertSpy;
      shellEvaluator.saveState = saveSpy;
      await shellEvaluator.customEval(originalEval, 'anything()', {}, '');
      expect(revertSpy.calledOnce).to.be.false;
      expect(saveSpy.calledOnce).to.be.true;
    });
  });
});
