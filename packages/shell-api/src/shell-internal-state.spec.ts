import { bson, ServiceProvider } from '@mongosh/service-provider-core';
import { expect } from 'chai';
import { StubbedInstance, stubInterface } from 'ts-sinon';
import { Context, createContext, runInContext } from 'vm';
import ShellInternalState, { EvaluationListener } from './shell-internal-state';

describe('ShellInternalState', () => {
  let internalState: ShellInternalState;
  let serviceProvider: StubbedInstance<ServiceProvider>;
  let evaluationListener: StubbedInstance<EvaluationListener>;
  let context: Context;
  let run: (source: string) => any;

  beforeEach(() => {
    serviceProvider = stubInterface<ServiceProvider>();
    serviceProvider.initialDb = 'test';
    serviceProvider.bsonLibrary = bson;
    serviceProvider.getConnectionInfo.resolves({ extraInfo: { uri: 'mongodb://localhost/' } });
    evaluationListener = stubInterface<EvaluationListener>();
    internalState = new ShellInternalState(serviceProvider);
    context = createContext();
    internalState.setEvaluationListener(evaluationListener);
    internalState.setCtx(context);
    run = (source: string) => runInContext(source, context);
  });

  describe('context object', () => {
    it('provides printing ability for primitives', async() => {
      await run('print(42)');
      expect(evaluationListener.onPrint).to.have.been.calledWith(
        [{ printable: 42, rawValue: 42, type: null }]);
    });

    it('provides printing ability for shell API objects', async() => {
      await run('print(db)');
      expect(evaluationListener.onPrint.lastCall.args[0][0].type).to.equal('Database');
    });

    it('provides printing ability via console methods', async() => {
      await run('console.log(42)');
      expect(evaluationListener.onPrint).to.have.been.calledWith(
        [{ printable: 42, rawValue: 42, type: null }]);
    });

    it('throws when setting db to a non-db thing', async() => {
      expect(() => run('db = 42')).to.throw("[COMMON-10002] Cannot reassign 'db' to non-Database type");
    });

    it('allows setting db to a db and causes prefetching', async() => {
      serviceProvider.listCollections
        .resolves([ { name: 'coll1' }, { name: 'coll2' } ]);
      expect(run('db = db.getSiblingDB("moo"); db.getName()')).to.equal('moo');
      expect(serviceProvider.listCollections.calledWith('moo', {}, { nameOnly: true })).to.equal(true);
    });
  });

  describe('default prompt', () => {
    it('shows the prompt provided by the service provider', async() => {
      serviceProvider = stubInterface<ServiceProvider>();
      serviceProvider.initialDb = 'test';
      serviceProvider.bsonLibrary = bson;
      serviceProvider.getDefaultPrompt.resolves('le prompt> ');
      serviceProvider.getConnectionInfo.resolves({ extraInfo: { uri: 'mongodb://localhost/' } });
      internalState = new ShellInternalState(serviceProvider);
      internalState.setEvaluationListener(evaluationListener);
      internalState.setCtx(context);
      run = (source: string) => runInContext(source, context);

      const prompt = await internalState.getDefaultPrompt();
      expect(prompt).to.equal('le prompt> ');
    });

    it('falls back to > when an error occurs', async() => {
      serviceProvider = stubInterface<ServiceProvider>();
      serviceProvider.initialDb = 'test';
      serviceProvider.bsonLibrary = bson;
      serviceProvider.getDefaultPrompt.rejects();
      serviceProvider.getConnectionInfo.resolves({ extraInfo: { uri: 'mongodb://localhost/' } });
      internalState = new ShellInternalState(serviceProvider);
      internalState.setEvaluationListener(evaluationListener);
      internalState.setCtx(context);
      run = (source: string) => runInContext(source, context);

      const prompt = await internalState.getDefaultPrompt();
      expect(prompt).to.equal('> ');
    });
  });
});
