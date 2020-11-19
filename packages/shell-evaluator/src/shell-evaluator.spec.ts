import { expect, use } from 'chai';
import sinon from 'ts-sinon';
const sinonChai = require('sinon-chai'); // weird with import
use(sinonChai);

import ShellEvaluator from './index';
import { EventEmitter } from 'events';

describe('ShellEvaluator', () => {
  let shellEvaluator: ShellEvaluator;
  let busMock: EventEmitter;
  let internalStateMock: any;
  let useSpy: any;

  beforeEach(() => {
    useSpy = sinon.spy();
    internalStateMock = {
      messageBus: busMock,
      shellApi: { use: useSpy },
      asyncWriter: {
        process: (i: string): string => (i),
        symbols: {
          saveState: sinon.spy(), revertState: sinon.spy()
        }
      }
    } as any;
    busMock = new EventEmitter();

    shellEvaluator = new ShellEvaluator(internalStateMock);
  });

  describe('customEval', () => {
    it('strips trailing spaces and ; before calling commands', async() => {
      const dontCallEval = () => { throw new Error('unreachable'); };
      await shellEvaluator.customEval(dontCallEval, 'use somedb;  ', {}, '');
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
      const originalEval = (): any => { throw new Error(); };
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
      const originalEval = (): any => { return 1; };
      const revertSpy = sinon.spy();
      const saveSpy = sinon.spy();
      shellEvaluator.revertState = revertSpy;
      shellEvaluator.saveState = saveSpy;
      await shellEvaluator.customEval(originalEval, 'anything()', {}, '');
      expect(revertSpy.calledOnce).to.be.false;
      expect(saveSpy.calledOnce).to.be.true;
    });
    it('allows specifying custom result handlers', async() => {
      const shellEvaluator = new ShellEvaluator<string>(internalStateMock, JSON.stringify);
      const originalEval = sinon.stub();
      originalEval.returns({ a: 1 });
      const result = await shellEvaluator.customEval(originalEval, 'doSomething();', {}, '');
      expect(result).to.equal('{"a":1}');
    });
  });
});
