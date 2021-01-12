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

      expect(result.rawValue).to.equal(2);

      await runtime.terminate();
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
      expect(password.rawValue).to.equal('password123');

      await runtime.terminate();
    });
  });
});
