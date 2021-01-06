import path from 'path';
import { once } from 'events';
import { Worker } from 'worker_threads';
import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import sinonChai from 'sinon-chai';
import sinon from 'sinon';

import { startTestServer } from '../../../testing/integration-testing-hooks';
import { createCaller, exposeAll } from './rpc';

chai.use(sinonChai);
chai.use(chaiAsPromised);

// We need a compiled version so we can import it as a worker
const workerThreadModulePath = path.resolve(
  __dirname,
  '..',
  'dist',
  'worker-runtime.js'
);

describe('worker', () => {
  let worker: Worker;

  beforeEach(async() => {
    worker = new Worker(workerThreadModulePath);
    await once(worker, 'message');
  });

  afterEach(async() => {
    if (worker) {
      await worker.terminate();
      worker = null;
    }
  });

  it('should throw if worker is not initialized yet', () => {
    const { evaluate } = createCaller(['evaluate'], worker);
    return expect(evaluate('1 + 1')).to.eventually.be.rejected;
  });

  describe('evaluate', () => {
    it('should evaluate simple code and return simple, serializable values', async() => {
      const { init, evaluate } = createCaller(['init', 'evaluate'], worker);
      await init('mongodb://nodb/', {}, { nodb: true });

      const result = await evaluate('1 + 1');

      expect(result).to.have.property('type', null);
      expect(result).to.have.property('rawValue', 2);
      expect(result).to.have.property('printable', 2);
    });
  });

  describe('getCompletions', () => {
    const testServer = startTestServer('shared');

    it('should return completions', async() => {
      const { init, getCompletions } = createCaller(
        ['init', 'getCompletions'],
        worker
      );

      await init(await testServer.connectionString());

      const completions = await getCompletions('db.coll1.f');

      expect(completions).to.deep.contain({
        completion: 'db.coll1.find'
      });
    });
  });

  describe('evaluationListener', () => {
    const createSpiedEvaluationListener = () => {
      return {
        onPrint: sinon.spy(),
        onPrompt: sinon.spy(() => '123'),
        toggleTelemetry: sinon.spy()
      };
    };

    describe('onPrint', () => {
      it('should be called when shell evaluates `print`', async() => {
        const { init, evaluate } = createCaller(['init', 'evaluate'], worker);
        const evalListener = createSpiedEvaluationListener();

        exposeAll(evalListener, worker);

        await init('mongodb://nodb/', {}, { nodb: true });
        await evaluate('print("Hi!")');

        expect(evalListener.onPrint).to.have.been.calledWith([
          { printable: 'Hi!', rawValue: 'Hi!', type: null }
        ]);
      });
    });

    describe('onPrompt', () => {
      it('should be called when shell evaluates `passwordPrompt`', async() => {
        const { init, evaluate } = createCaller(['init', 'evaluate'], worker);
        const evalListener = createSpiedEvaluationListener();

        exposeAll(evalListener, worker);

        await init('mongodb://nodb/', {}, { nodb: true });
        const password = await evaluate('passwordPrompt()');

        expect(evalListener.onPrompt).to.have.been.called;
        expect(password.rawValue).to.equal('123');
      });
    });

    describe('toggleTelemetry', () => {
      it('should be called when shell evaluates `enableTelemetry` or `disableTelemetry`', async() => {
        const { init, evaluate } = createCaller(['init', 'evaluate'], worker);
        const evalListener = createSpiedEvaluationListener();

        exposeAll(evalListener, worker);

        await init('mongodb://nodb/', {}, { nodb: true });

        await evaluate('enableTelemetry()');
        expect(evalListener.toggleTelemetry).to.have.been.calledWith(true);

        await evaluate('disableTelemetry()');
        expect(evalListener.toggleTelemetry).to.have.been.calledWith(false);
      });
    });
  });
});
