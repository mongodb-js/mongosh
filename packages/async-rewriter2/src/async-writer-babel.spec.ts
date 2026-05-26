import { AsyncWriter } from './';
import { runTests } from '@mongosh/async-rewriter-spec';
import * as chai from 'chai';
import sinonChai from 'sinon-chai';
chai.use(sinonChai);

runTests({
  newAsyncRewriter: () => new AsyncWriter(),
  hooks: { describe, context, it, beforeEach, afterEach, before, after },
});
