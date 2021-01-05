import { bson, ServiceProvider } from '@mongosh/service-provider-core';
import { expect } from 'chai';
import { EventEmitter } from 'events';
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
    describe('with --nodb', () => {
      beforeEach(() => {
        serviceProvider = stubInterface<ServiceProvider>();
        serviceProvider.bsonLibrary = bson;
        serviceProvider.getConnectionInfo.resolves({ extraInfo: { uri: 'mongodb://localhost/' } });
        internalState = new ShellInternalState(serviceProvider, new EventEmitter(), {
          nodb: true
        });
        internalState.setEvaluationListener(evaluationListener);
        internalState.setCtx(context);
        run = (source: string) => runInContext(source, context);
      });

      it('just resolves the default prompt', async() => {
        const prompt = await internalState.getDefaultPrompt();
        expect(prompt).to.equal('> ');
      });
    });

    describe('computes a prefix', () => {
      it('silently delivers a prompt if all fails', async() => {
        internalState.connectionInfo.buildInfo = {
          'version': '4.2.11',
          'gitVersion': 'ea38428f0c6742c7c2c7f677e73d79e17a2aab96',
          'modules': { what: 'is messed up' }
        };
        const prompt = await internalState.getDefaultPrompt();
        expect(prompt).to.equal('> ');
      });

      it('infers enterprise from the build info', async() => {
        internalState.connectionInfo.buildInfo = {
          'version': '4.2.11',
          'gitVersion': 'ea38428f0c6742c7c2c7f677e73d79e17a2aab96',
          'modules': [
            'enterprise'
          ]
        };

        const prompt = await internalState.getDefaultPrompt();
        expect(prompt).to.equal('MongoDB Enterprise > ');
      });

      it('infers enterprise only once', async() => {
        internalState.connectionInfo.buildInfo = {
          'version': '4.2.11',
          'gitVersion': 'ea38428f0c6742c7c2c7f677e73d79e17a2aab96',
          'modules': [
            'enterprise'
          ]
        };

        let prompt = await internalState.getDefaultPrompt();
        expect(prompt).to.equal('MongoDB Enterprise > ');

        internalState.connectionInfo = {};
        prompt = await internalState.getDefaultPrompt();
        expect(prompt).to.equal('MongoDB Enterprise > ');
      });

      it('resets state when the DB changes', async() => {
        internalState.connectionInfo = {};
        let prompt = await internalState.getDefaultPrompt();
        expect(prompt).to.equal('> ');

        serviceProvider.getConnectionInfo.resolves({
          buildInfo: {
            'version': '4.2.11',
            'gitVersion': 'ea38428f0c6742c7c2c7f677e73d79e17a2aab96',
            'modules': [
              'enterprise'
            ]
          },
          extraInfo: {
            uri: 'http://localhost:27017'
          }
        });
        serviceProvider.runCommandWithCheck
          .withArgs('otherDb', { isMaster: 1, forShell: 1 }, {})
          .resolves({
            'ok': 1,
            'msg': 'isdbgrid'
          });

        const otherDb = internalState.mongos[0].getDB('otherDb');
        internalState.setDbFunc(otherDb);
        await new Promise(resolve => process.nextTick(resolve));

        prompt = await internalState.getDefaultPrompt();
        expect(prompt).to.equal('MongoDB Enterprise mongos> ');
      });
    });

    describe('with a replSet', () => {
      it('shows the state of the self member', async() => {
        serviceProvider.runCommandWithCheck
          .withArgs('admin', { replSetGetStatus: 1, forShell: 1 }, {})
          .resolves( {
            'set': 'fakeSet',
            'myState': 1,
            'members': [
              {
                '_id': 0,
                'name': 'fakeHost1:27017',
                'health': 1,
                'state': 2,
                'stateStr': 'SECONDARY',
                'infoMessage': '',
              },
              {
                '_id': 1,
                'name': 'fakeHost2:27017',
                'health': 1,
                'state': 1,
                'stateStr': 'PRIMARY',
                'infoMessage': '',
                'configVersion': 1,
                'self': true
              },
            ],
            'ok': 1,
          });

        const prompt = await internalState.getDefaultPrompt();
        expect(prompt).to.equal('fakeSet:primary> ');
      });

      it('shows the value of myState if there is no self member', async() => {
        serviceProvider.runCommandWithCheck
          .withArgs('admin', { replSetGetStatus: 1, forShell: 1 }, {})
          .resolves( {
            'set': 'fakeSet',
            'myState': 1,
            'members': [
              {
                '_id': 0,
                'name': 'fakeHost1:27017',
                'health': 1,
                'state': 2,
                'stateStr': 'SECONDARY',
                'infoMessage': '',
              },
              {
                '_id': 1,
                'name': 'fakeHost2:27017',
                'health': 1,
                'state': 1,
                'stateStr': 'PRIMARY'
              },
            ],
            'ok': 1,
          });

        const prompt = await internalState.getDefaultPrompt();
        expect(prompt).to.equal('fakeSet:1> ');
      });

      it('falls back to the info field if available', async() => {
        serviceProvider.runCommandWithCheck
          .withArgs('admin', { replSetGetStatus: 1, forShell: 1 }, {})
          .resolves( {
            'ok': 0,
            'info': 'notworking'
          });

        const prompt = await internalState.getDefaultPrompt();
        expect(prompt).to.equal('notworking> ');
      });

      it('reverts to isMaster check if replSetGetStatus fails', async() => {
        serviceProvider.runCommandWithCheck
          .withArgs('admin', { replSetGetStatus: 1, forShell: 1 }, {})
          .rejects();
        serviceProvider.runCommandWithCheck
          .withArgs('test', { isMaster: 1, forShell: 1 }, {})
          .resolves({
            'ok': 1,
            'msg': 'isdbgrid'
          });

        const prompt = await internalState.getDefaultPrompt();
        expect(prompt).to.equal('mongos> ');
      });

      it('reverts to isMaster check if info is unexpected', async() => {
        serviceProvider.runCommandWithCheck
          .withArgs('admin', { replSetGetStatus: 1, forShell: 1 }, {})
          .resolves( {
            'ok': 0
          });
        serviceProvider.runCommandWithCheck
          .withArgs('test', { isMaster: 1, forShell: 1 }, {})
          .resolves({
            'ok': 1,
            'msg': 'isdbgrid'
          });

        const prompt = await internalState.getDefaultPrompt();
        expect(prompt).to.equal('mongos> ');
      });
    });

    describe('with isMaster check', () => {
      it('shows mongos for a db grid', async() => {
        serviceProvider.runCommandWithCheck
          .withArgs('test', { isMaster: 1, forShell: 1 }, {})
          .resolves({
            'ok': 1,
            'msg': 'isdbgrid'
          });

        const prompt = await internalState.getDefaultPrompt();
        expect(prompt).to.equal('mongos> ');
      });

      describe('handles replica set names', () => {
        it('shows primary for master', async() => {
          serviceProvider.runCommandWithCheck
            .withArgs('test', { isMaster: 1, forShell: 1 }, {})
            .resolves({
              'ok': 1,
              'setName': 'replSet',
              'ismaster': 1
            });

          const prompt = await internalState.getDefaultPrompt();
          expect(prompt).to.equal('replSet:primary> ');
        });

        it('shows secondary for secondaries', async() => {
          serviceProvider.runCommandWithCheck
            .withArgs('test', { isMaster: 1, forShell: 1 }, {})
            .resolves({
              'ok': 1,
              'setName': 'replSet',
              'secondary': 1
            });

          const prompt = await internalState.getDefaultPrompt();
          expect(prompt).to.equal('replSet:secondary> ');
        });

        it('shows arbiter for arbiterOnly', async() => {
          serviceProvider.runCommandWithCheck
            .withArgs('test', { isMaster: 1, forShell: 1 }, {})
            .resolves({
              'ok': 1,
              'setName': 'replSet',
              'arbiterOnly': 1
            });

          const prompt = await internalState.getDefaultPrompt();
          expect(prompt).to.equal('replSet:arbiter> ');
        });

        it('shows other else', async() => {
          serviceProvider.runCommandWithCheck
            .withArgs('test', { isMaster: 1, forShell: 1 }, {})
            .resolves({
              'ok': 1,
              'setName': 'replSet'
            });

          const prompt = await internalState.getDefaultPrompt();
          expect(prompt).to.equal('replSet:other> ');
        });

        it('reverts to default prompt if not ok', async() => {
          serviceProvider.runCommandWithCheck
            .withArgs('test', { isMaster: 1, forShell: 1 }, {})
            .resolves({
              'ok': 0
            });

          const prompt = await internalState.getDefaultPrompt();
          expect(prompt).to.equal('> ');
        });

        it('reverts to default prompt if fails', async() => {
          serviceProvider.runCommandWithCheck
            .withArgs('test', { isMaster: 1, forShell: 1 }, {})
            .rejects();

          const prompt = await internalState.getDefaultPrompt();
          expect(prompt).to.equal('> ');
        });
      });
    });
  });
});
