import AsyncWriter from './index.js';
import { runTests } from '@mongosh/async-rewriter-spec';
import * as chai from 'chai';
import sinonChai from 'sinon-chai';
chai.use(sinonChai);

runTests({
  newAsyncRewriter: async() => {
    const instance = new AsyncWriter();
    await instance.process(''); // make sure the WASM module is loaded before returning
    return {
      process: (src) => instance.processSync(src),
      runtimeSupportCode: () => instance.runtimeSupportCode(),
    };
  },
  hooks: { describe, context, it, beforeEach, afterEach, before, after },
});
