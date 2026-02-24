import * as chai from 'chai';
import { expect } from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import ShellEvaluator from './index';
import { EventEmitter } from 'events';

chai.use(sinonChai);

describe('ShellEvaluator', function () {
  let shellEvaluator: ShellEvaluator;
  let busMock: EventEmitter;
  let internalStateMock: any;
  let showSpy: any;
  let itSpy: any;
  let exitSpy: any;
  let editSpy: any;
  let useSpy: any;
  const dontCallEval = () => {
    throw new Error('unreachable');
  };

  beforeEach(function () {
    useSpy = sinon.spy();
    showSpy = sinon.spy();
    itSpy = sinon.spy();
    exitSpy = sinon.spy();
    editSpy = sinon.spy();
    internalStateMock = {
      messageBus: busMock,
      shellApi: {
        use: useSpy,
        show: showSpy,
        it: itSpy,
        exit: exitSpy,
        quit: exitSpy,
        edit: editSpy,
      },
    } as any;
    for (const name of ['use', 'show', 'it', 'exit', 'quit', 'edit']) {
      internalStateMock.shellApi[name].isDirectShellCommand = true;
      internalStateMock.shellApi[name].acceptsRawInput =
        name === 'edit' ? true : false;
    }
    busMock = new EventEmitter();

    shellEvaluator = new ShellEvaluator(internalStateMock);
  });

  describe('customEval', function () {
    it('strips trailing spaces and ; before calling commands', async function () {
      await shellEvaluator.customEval(dontCallEval, 'use somedb;  ', {}, '');
      expect(useSpy).to.have.been.calledWith('somedb');
    });

    it('splits commands at an arbitrary amount of whitespace', async function () {
      await shellEvaluator.customEval(dontCallEval, 'use   somedb;', {}, '');
      expect(useSpy).to.have.been.calledWith('somedb');
    });

    it('does not apply special handling for commands when the first argument starts with (', async function () {
      const originalEval = sinon.spy();
      await shellEvaluator.customEval(originalEval, 'use   (somedb);', {}, '');
      expect(originalEval.firstCall.args[0]).to.include('somedb');
      expect(useSpy).to.have.callCount(0);
    });

    it('forwards show commands', async function () {
      const dontCallEval = () => {
        throw new Error('unreachable');
      };
      await shellEvaluator.customEval(dontCallEval, 'show dbs;', {}, '');
      expect(showSpy).to.have.been.calledWith('dbs');
      await shellEvaluator.customEval(
        dontCallEval,
        'show log startupWarnings;',
        {},
        ''
      );
      expect(showSpy).to.have.been.calledWith('log', 'startupWarnings');
    });

    it('forwards the it command', async function () {
      const dontCallEval = () => {
        throw new Error('unreachable');
      };
      await shellEvaluator.customEval(dontCallEval, 'it', {}, '');
      expect(itSpy).to.have.been.calledWith();
    });

    it('forwards the exit/quit command (exit)', async function () {
      const dontCallEval = () => {
        throw new Error('unreachable');
      };
      await shellEvaluator.customEval(dontCallEval, 'exit', {}, '');
      expect(exitSpy).to.have.been.calledWith();
    });

    it('forwards the exit/quit command (quit)', async function () {
      const dontCallEval = () => {
        throw new Error('unreachable');
      };
      await shellEvaluator.customEval(dontCallEval, 'quit', {}, '');
      expect(exitSpy).to.have.been.calledWith();
    });

    it('calls original eval for plain javascript', async function () {
      const originalEval = sinon.spy();
      await shellEvaluator.customEval(originalEval, 'doSomething();', {}, '');
      expect(originalEval.firstCall.args[0]).to.include('doSomething');
      expect(originalEval.firstCall.args[1]).to.deep.equal({});
      expect(originalEval.firstCall.args[2]).to.equal('');
    });

    it('allows specifying custom result handlers', async function () {
      const shellEvaluator = new ShellEvaluator<string>(
        internalStateMock,
        JSON.stringify
      );
      const originalEval = sinon.stub();
      originalEval.returns({ a: 1 });
      const result = await shellEvaluator.customEval(
        originalEval,
        'doSomething();',
        {},
        ''
      );
      expect(result).to.equal('{"a":1}');
    });

    it('edit accepts raw input', async function () {
      await shellEvaluator.customEval(dontCallEval, 'edit "1     2"', {}, '');
      expect(editSpy).to.have.been.calledWith('"1     2"');
    });
  });
});
