import path from 'path';
import { promises as fs } from 'fs';
import { once } from 'events';
import { Worker } from 'worker_threads';
import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import sinonChai from 'sinon-chai';
import sinon from 'sinon';
import { startTestServer } from '../../../testing/integration-testing-hooks';
import { Caller, createCaller, exposeAll } from './rpc';
import { deserializeEvaluationResult } from './serializer';
import type { WorkerRuntime } from './worker-runtime';

chai.use(sinonChai);
chai.use(chaiAsPromised);

// We need a compiled version so we can import it as a worker
const workerThreadModule = fs.readFile(
  path.resolve(__dirname, '..', 'dist', 'worker-runtime.js'),
  'utf8'
);

describe('worker', () => {
  let worker: Worker;

  beforeEach(async() => {
    worker = new Worker(await workerThreadModule, { eval: true });
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
      expect(result).to.have.property('printable', 2);
    });

    describe('errors', () => {
      let caller: Caller<WorkerRuntime, 'init' | 'evaluate'>;

      beforeEach(() => {
        const c = createCaller(['init', 'evaluate'], worker);
        caller = {
          ...c,
          async evaluate(code: string) {
            return deserializeEvaluationResult(await c.evaluate(code));
          }
        };
        (caller.evaluate as any).close = c.evaluate.close;
      });

      afterEach(() => {
        caller = null;
      });

      it("should throw an error if it's thrown during evaluation", async() => {
        const { init, evaluate } = caller;

        await init('mongodb://nodb/', {}, { nodb: true });

        let err: Error;
        try {
          await evaluate('throw new TypeError("Oh no, types!")');
        } catch (e) {
          err = e;
        }

        expect(err).to.be.instanceof(Error);
        expect(err).to.have.property('name', 'TypeError');
        expect(err).to.have.property('message', 'Oh no, types!');
        expect(err)
          .to.have.property('stack')
          .matches(/TypeError: Oh no, types!/);
      });

      it("should return an error if it's returned from evaluation", async() => {
        const { init, evaluate } = caller;

        await init('mongodb://nodb/', {}, { nodb: true });

        const { printable } = await evaluate('new SyntaxError("Syntax!")');

        expect(printable).to.be.instanceof(Error);
        expect(printable).to.have.property('name', 'SyntaxError');
        expect(printable).to.have.property('message', 'Syntax!');
        expect(printable)
          .to.have.property('stack')
          .matches(/SyntaxError: Syntax!/);
      });
    });
  });

  describe('getShellPrompt', () => {
    const testServer = startTestServer('shared');

    it('should return prompt when connected to the server', async() => {
      const { init, getShellPrompt } = createCaller(
        ['init', 'getShellPrompt'],
        worker
      );

      await init(await testServer.connectionString());

      const result = await getShellPrompt();

      expect(result).to.match(/>/);
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
        expect(password.printable).to.equal('123');
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
