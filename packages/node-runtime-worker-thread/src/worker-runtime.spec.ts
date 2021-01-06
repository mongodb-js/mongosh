import path from 'path';
import { once } from 'events';
import { Worker } from 'worker_threads';
import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';

import { startTestServer } from '../../../testing/integration-testing-hooks';
import { createCaller } from './rpc';

chai.use(chaiAsPromised);

// We need a compiled version so we can import it as a worker
const workerThreadModulePath = path.resolve(
  __dirname,
  '..',
  'lib',
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
      const { init, getCompletions } = createCaller(['init', 'getCompletions'], worker);

      await init(await testServer.connectionString());

      const completions = await getCompletions('db.coll1.f');

      expect(completions).to.deep.contain({
        completion: 'db.coll1.find'
      });
    });
  });
});
