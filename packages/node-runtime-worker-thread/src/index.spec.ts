import chai, { expect } from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import { startTestServer } from '../../../testing/integration-testing-hooks';
import { WorkerRuntime } from '../dist/index';

chai.use(sinonChai);

describe('WorkerRuntime', () => {
  describe('evaluate', () => {
    it('should evaluate and return basic values', async() => {
      const runtime = new WorkerRuntime('mongodb://nodb/', {}, { nodb: true });
      const result = await runtime.evaluate('1+1');

      expect(result.printable).to.equal(2);

      await runtime.terminate();
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
        const { printable } = await runtime.evaluate('new SyntaxError("Syntax!")');

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
      const runtime = new WorkerRuntime(await testServer.connectionString());
      const completions = await runtime.getCompletions('db.coll1.f');

      expect(completions).to.deep.contain({ completion: 'db.coll1.find' });

      await runtime.terminate();
    });
  });

  describe('setEvaluationListener', () => {
    it('allows to set evaluation listener for runtime', async() => {
      const evalListener = {
        onPrompt: sinon.spy(() => 'password123')
      };

      const runtime = new WorkerRuntime('mongodb://nodb/', {}, { nodb: true });

      runtime.setEvaluationListener(evalListener);

      const password = await runtime.evaluate('passwordPrompt()');

      expect(evalListener.onPrompt).to.have.been.called;
      expect(password.printable).to.equal('password123');

      await runtime.terminate();
    });
  });
});
