import chai, { expect } from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import { MongoshBus } from '@mongosh/types';
import { startTestServer } from '../../../testing/integration-testing-hooks';
import { WorkerRuntime } from '../dist/index';

chai.use(sinonChai);

function createMockEventEmitter() {
  return (sinon.stub({ on() {}, emit() {} }) as unknown) as MongoshBus;
}

describe('WorkerRuntime', () => {
  let runtime: WorkerRuntime;

  afterEach(async() => {
    if (runtime) {
      await runtime.terminate();
    }
  });

  describe('evaluate', () => {
    it('should evaluate and return basic values', async() => {
      runtime = new WorkerRuntime('mongodb://nodb/', {}, { nodb: true });
      const result = await runtime.evaluate('1+1');

      expect(result.printable).to.equal(2);
    });

    describe('errors', () => {
      let runtime: WorkerRuntime;

      beforeEach(() => {
        runtime = new WorkerRuntime('mongodb://nodb/', {}, { nodb: true });
      });

      afterEach(async() => {
        await runtime.terminate();
      });

      it("should throw an error if it's thrown during evaluation", async() => {
        let err: Error;

        try {
          await runtime.evaluate('throw new TypeError("Oh no, types!")');
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
        const { printable } = await runtime.evaluate(
          'new SyntaxError("Syntax!")'
        );

        expect(printable).to.be.instanceof(Error);
        expect(printable).to.have.property('name', 'SyntaxError');
        expect(printable).to.have.property('message', 'Syntax!');
        expect(printable)
          .to.have.property('stack')
          .matches(/SyntaxError: Syntax!/);
      });
    });
  });

  describe('getCompletions', () => {
    const testServer = startTestServer('shared');

    it('should return completions', async() => {
      runtime = new WorkerRuntime(await testServer.connectionString());
      const completions = await runtime.getCompletions('db.coll1.f');

      expect(completions).to.deep.contain({ completion: 'db.coll1.find' });
    });
  });

  describe('getShellPrompt', () => {
    const testServer = startTestServer('shared');

    it('should return prompt when connected to the server', async() => {
      runtime = new WorkerRuntime(await testServer.connectionString());
      const result = await runtime.getShellPrompt();

      expect(result).to.match(/>/);
    });
  });

  describe('setEvaluationListener', () => {
    it('allows to set evaluation listener for runtime', async() => {
      const evalListener = {
        onPrompt: sinon.spy(() => 'password123')
      };

      runtime = new WorkerRuntime('mongodb://nodb/', {}, { nodb: true });

      runtime.setEvaluationListener(evalListener);

      const password = await runtime.evaluate('passwordPrompt()');

      expect(evalListener.onPrompt).to.have.been.called;
      expect(password.printable).to.equal('password123');
    });
  });

  describe('eventEmitter', () => {
    const testServer = startTestServer('shared');

    it('should propagate emitted events from worker', async() => {
      const eventEmitter = createMockEventEmitter();

      runtime = new WorkerRuntime(
        await testServer.connectionString(),
        {},
        {},
        {},
        eventEmitter
      );

      await runtime.evaluate('db.getCollectionNames()');

      expect(eventEmitter.emit).to.have.been.calledWith('mongosh:api-call', {
        arguments: {},
        class: 'Database',
        db: 'test',
        method: 'getCollectionNames'
      });
    });
  });
});
