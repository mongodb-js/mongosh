import chai from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
chai.use(sinonChai);
const { expect } = chai;

import ShellEvaluator from './shell-evaluator';
import { EventEmitter } from 'events';

describe('ShellEvaluator', () => {
  let shellEvaluator: ShellEvaluator;
  let containerMock;
  let busMock;
  let internalStateMock;
  let useSpy;

  beforeEach(() => {
    useSpy = sinon.spy();
    internalStateMock = {
      messageBus: busMock,
      use: useSpy,
      asyncWriter: {
        compile: i => (i),
        symbols: {
          saveState: sinon.spy(), revertState: sinon.spy()
        }
      }
    } as any;
    busMock = new EventEmitter();
    containerMock = { toggleTelemetry: sinon.spy() };

    shellEvaluator = new ShellEvaluator(
      internalStateMock,
      containerMock
    );
  });

  describe('customEval', () => {
    it('strips trailing spaces and ; before calling commands', async() => {
      await shellEvaluator.customEval(null, 'use somedb;  ', {}, '');
      expect(useSpy).to.have.been.calledWith('somedb');
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
