import { bson, ServiceProvider } from '@mongosh/service-provider-core';
import { expect } from 'chai';
import { EventEmitter } from 'events';
import { StubbedInstance, stubInterface } from 'ts-sinon';
import { Context, createContext, runInContext } from 'vm';
import ShellInstanceState, { EvaluationListener } from './shell-instance-state';

describe('ShellInstanceState', () => {
  let instanceState: ShellInstanceState;
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
    instanceState = new ShellInstanceState(serviceProvider);
    context = createContext();
    instanceState.setEvaluationListener(evaluationListener);
    instanceState.setCtx(context);
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

    it('throws when setting db to a non-db thing', () => {
      expect(() => run('db = 42')).to.throw("[COMMON-10002] Cannot reassign 'db' to non-Database type");
    });

    it('allows setting db to a db and causes prefetching', async() => {
      serviceProvider.listCollections
        .resolves([ { name: 'coll1' }, { name: 'coll2' } ]);
      expect(run('db = db.getSiblingDB("moo"); db.getName()')).to.equal('moo');
      await new Promise(setImmediate);
      await new Promise(setImmediate); // ticks due to db._baseOptions() being async
      expect(serviceProvider.listCollections.calledWith('moo', {}, {
        readPreference: 'primaryPreferred',
        nameOnly: true
      })).to.equal(true);
    });
  });

  describe('default prompt', () => {
    const setupServiceProviderWithTopology = (topology: any) => {
      serviceProvider.getConnectionInfo.resolves({ extraInfo: { uri: 'mongodb://localhost/' } });
      serviceProvider.getTopology.returns(topology);
    };

    it('returns the default if nodb', async() => {
      serviceProvider = stubInterface<ServiceProvider>();
      serviceProvider.initialDb = 'test';
      serviceProvider.bsonLibrary = bson;
      serviceProvider.getConnectionInfo.resolves({ extraInfo: { uri: 'mongodb://localhost/' } });
      instanceState = new ShellInstanceState(serviceProvider, new EventEmitter(), { nodb: true });
      instanceState.setEvaluationListener(evaluationListener);
      instanceState.setCtx(context);
      run = (source: string) => runInContext(source, context);

      const prompt = await instanceState.getDefaultPrompt();
      expect(prompt).to.equal('> ');
    });

    describe('Atlas Data Lake prefix', () => {
      it('inferred from extraInfo', async() => {
        serviceProvider.getConnectionInfo.resolves({
          extraInfo: {
            uri: 'mongodb://localhost/',
            is_data_federation: true
          }
        });

        await instanceState.fetchConnectionInfo();
        const prompt = await instanceState.getDefaultPrompt();
        expect(prompt).to.equal('AtlasDataFederation test> ');
      });

      it('wins against enterprise and atlas', async() => {
        serviceProvider.getConnectionInfo.resolves({
          extraInfo: {
            uri: 'mongodb://localhost/',
            is_enterprise: true,
            is_atlas: true,
            is_data_federation: true
          }
        });

        await instanceState.fetchConnectionInfo();
        const prompt = await instanceState.getDefaultPrompt();
        expect(prompt).to.equal('AtlasDataFederation test> ');
      });
    });

    describe('Atlas prefix', () => {
      it('inferred from extraInfo', async() => {
        serviceProvider.getConnectionInfo.resolves({
          extraInfo: {
            uri: 'mongodb://localhost/',
            is_atlas: true
          }
        });

        await instanceState.fetchConnectionInfo();
        const prompt = await instanceState.getDefaultPrompt();
        expect(prompt).to.equal('Atlas test> ');
      });

      it('wins against enterprise', async() => {
        serviceProvider.getConnectionInfo.resolves({
          extraInfo: {
            uri: 'mongodb://localhost/',
            is_enterprise: true,
            is_atlas: true
          }
        });

        await instanceState.fetchConnectionInfo();
        const prompt = await instanceState.getDefaultPrompt();
        expect(prompt).to.equal('Atlas test> ');
      });
    });


    describe('MongoDB Enterprise prefix', () => {
      it('inferred from extraInfo', async() => {
        serviceProvider.getConnectionInfo.resolves({ extraInfo: { uri: 'mongodb://localhost/', is_enterprise: true } });

        await instanceState.fetchConnectionInfo();
        const prompt = await instanceState.getDefaultPrompt();
        expect(prompt).to.equal('Enterprise test> ');
      });

      it('inferred from buildInfo modules', async() => {
        serviceProvider.getConnectionInfo.resolves({
          extraInfo: { uri: 'mongodb://localhost/' },
          buildInfo: { modules: ['other', 'enterprise'] }
        });

        await instanceState.fetchConnectionInfo();
        const prompt = await instanceState.getDefaultPrompt();
        expect(prompt).to.equal('Enterprise test> ');
      });
    });

    describe('direct connection = Single Topology', () => {
      // TODO: replace with proper ServerType.xxx - NODE-2973
      [
        { t: 'Mongos', p: 'mongos' },
        { t: 'RSArbiter', p: 'arbiter' },
        { t: 'RSOther', p: 'other' },
        { t: 'RSPrimary', p: 'primary' },
      ].forEach(({ t, p }) => {
        it(`takes the info from the single server [Server Type: ${t}]`, async() => {
          const servers = new Map();
          servers.set('localhost:30001', {
            address: 'localhost:30001',
            type: t,
            me: 'localhost:30001',
            hosts: [ 'localhost:30001' ],
            setName: 'configset'
          });
          const topology = {
            description: {
              // TODO: replace with TopologyType.Single - NODE-2973
              type: 'Single',
              setName: null, // This was observed behavior - the set was not updated even the single server had the set
              servers: servers
            }
          };
          setupServiceProviderWithTopology(topology);

          const prompt = await instanceState.getDefaultPrompt();
          expect(prompt).to.equal(`configset [direct: ${p}] test> `);
        });
      });

      // TODO: replace with proper ServerType.xxx - NODE-2973
      [
        'RSGhost',
        'Standalone',
        'Unknown',
        'PossiblePrimary'
      ].forEach(t => {
        it(`defaults for server type [Server Type: ${t}]`, async() => {
          const servers = new Map();
          servers.set('localhost:30001', {
            address: 'localhost:30001',
            type: t,
            me: 'localhost:30001',
            hosts: [ 'localhost:30001' ]
          });
          const topology = {
            description: {
              // TODO: replace with TopologyType.Single - NODE-2973
              type: 'Single',
              setName: null,
              servers: servers
            }
          };
          setupServiceProviderWithTopology(topology);

          const prompt = await instanceState.getDefaultPrompt();
          expect(prompt).to.equal('test> ');
        });
      });
    });

    describe('topology ReplicaSet...', () => {
      it('shows the setName and lacking primary hint for ReplicaSetNoPrimary', async() => {
        const topology = {
          description: {
            // TODO: replace with TopologyType.ReplicaSetNoPrimary - NODE-2973
            type: 'ReplicaSetNoPrimary',
            setName: 'leSet'
          }
        };
        setupServiceProviderWithTopology(topology);

        const prompt = await instanceState.getDefaultPrompt();
        expect(prompt).to.equal('leSet [secondary] test> ');
      });

      it('shows the setName and primary hint for ReplicaSetWithPrimary', async() => {
        const topology = {
          description: {
            // TODO: replace with TopologyType.ReplicaSetWithPrimary - NODE-2973
            type: 'ReplicaSetWithPrimary',
            setName: 'leSet'
          }
        };
        setupServiceProviderWithTopology(topology);

        const prompt = await instanceState.getDefaultPrompt();
        expect(prompt).to.equal('leSet [primary] test> ');
      });
    });

    describe('topology Sharded', () => {
      it('shows mongos without setName', async() => {
        const topology = {
          description: {
            // TODO: replace with TopologyType.Sharded - NODE-2973
            type: 'Sharded'
          }
        };
        setupServiceProviderWithTopology(topology);

        const prompt = await instanceState.getDefaultPrompt();
        expect(prompt).to.equal('[mongos] test> ');
      });
      it('shows mongos and a setName', async() => {
        const topology = {
          description: {
            // TODO: replace with TopologyType.Sharded - NODE-2973
            type: 'Sharded',
            setName: 'leSet'
          }
        };
        setupServiceProviderWithTopology(topology);

        const prompt = await instanceState.getDefaultPrompt();
        expect(prompt).to.equal('leSet [mongos] test> ');
      });
    });

    describe('topology Sharded but it’s Atlas', () => {
      it('shows atlas proxy identifier', async() => {
        serviceProvider.getTopology.returns({
          description: {
            type: 'Sharded'
          }
        });
        serviceProvider.getConnectionInfo.resolves({
          extraInfo: {
            uri: 'mongodb://localhost/',
            is_atlas: true,
            atlas_version: '20210330.0.0.1617063608'
          }
        });

        await instanceState.fetchConnectionInfo();
        const prompt = await instanceState.getDefaultPrompt();
        expect(prompt).to.equal('Atlas test> ');
      });
    });

    describe('topology LoadBalanced', () => {
      it('shows just the database', async() => {
        const topology = {
          description: {
            // TODO: replace with TopologyType.LoadBalanced - NODE-2973
            type: 'LoadBalanced'
          }
        };
        setupServiceProviderWithTopology(topology);

        await instanceState.fetchConnectionInfo();
        const prompt = await instanceState.getDefaultPrompt();
        expect(prompt).to.equal('test> ');
      });

      it('includes Atlas when we are there', async() => {
        serviceProvider.getTopology.returns({
          description: {
            // TODO: replace with TopologyType.LoadBalanced - NODE-2973
            type: 'LoadBalanced'
          }
        });
        serviceProvider.getConnectionInfo.resolves({
          extraInfo: {
            uri: 'mongodb://localhost/',
            is_atlas: true,
            atlas_version: '20210330.0.0.1617063608'
          }
        });

        await instanceState.fetchConnectionInfo();
        const prompt = await instanceState.getDefaultPrompt();
        expect(prompt).to.equal('Atlas test> ');
      });
    });


    describe('topology Unknown', () => {
      it('just shows the default prompt', async() => {
        const servers = new Map();
        servers.set('localhost:30001', {
          address: 'localhost:30001',
          // TODO: replace with ServerType.Unknown - NODE-2973
          type: 'Unknown',
          me: 'localhost:30001',
          hosts: [ 'localhost:30001' ]
        });
        const topology = {
          description: {
            // TODO: replace with TopologyType.Unknown - NODE-2973
            type: 'Unknown',
            setName: 'unknown',
            servers: servers
          }
        };
        setupServiceProviderWithTopology(topology);

        const prompt = await instanceState.getDefaultPrompt();
        expect(prompt).to.equal('test> ');
      });
    });
  });
});
