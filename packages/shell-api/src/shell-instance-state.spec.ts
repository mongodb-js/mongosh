import type {
  ServerDescription,
  ServiceProvider,
  TopologyDescription,
} from '@mongosh/service-provider-core';
import { bson } from '@mongosh/service-provider-core';
import { expect } from 'chai';
import { EventEmitter } from 'events';
import type { StubbedInstance } from 'ts-sinon';
import { stubInterface } from 'ts-sinon';
import type { Context } from 'vm';
import { createContext, runInContext } from 'vm';
import type { EvaluationListener } from './shell-instance-state';
import ShellInstanceState from './shell-instance-state';

describe('ShellInstanceState', function () {
  let instanceState: ShellInstanceState;
  let serviceProvider: StubbedInstance<ServiceProvider>;
  let evaluationListener: StubbedInstance<EvaluationListener>;
  let context: Context;
  let run: (source: string) => any;

  beforeEach(function () {
    serviceProvider = stubInterface<ServiceProvider>();
    serviceProvider.initialDb = 'test';
    serviceProvider.bsonLibrary = bson;
    serviceProvider.getConnectionInfo.resolves({
      extraInfo: { uri: 'mongodb://localhost/' },
      buildInfo: {},
    });
    evaluationListener = stubInterface<EvaluationListener>();
    instanceState = new ShellInstanceState(serviceProvider);
    context = createContext();
    instanceState.setEvaluationListener(evaluationListener);
    instanceState.setCtx(context);
    run = (source: string) => runInContext(source, context);
  });

  describe('context object', function () {
    it('provides printing ability for primitives', async function () {
      await run('print(42)');
      expect(evaluationListener.onPrint).to.have.been.calledWith([
        { printable: 42, rawValue: 42, type: null },
      ]);
    });

    it('provides printing ability for shell API objects', async function () {
      await run('print(db)');
      expect(evaluationListener.onPrint?.lastCall.args[0][0].type).to.equal(
        'Database'
      );
    });

    it('provides printing ability via console methods', async function () {
      await run('console.log(42)');
      expect(evaluationListener.onPrint).to.have.been.calledWith([
        { printable: 42, rawValue: 42, type: null },
      ]);
    });

    it('throws when setting db to a non-db thing', function () {
      expect(() => run('db = 42')).to.throw(
        "[COMMON-10002] Cannot reassign 'db' to non-Database type"
      );
    });

    it('allows setting db to a db and causes prefetching', async function () {
      serviceProvider.listCollections.resolves([
        { name: 'coll1' },
        { name: 'coll2' },
      ]);
      expect(run('db = db.getSiblingDB("moo"); db.getName()')).to.equal('moo');
      await new Promise(setImmediate);
      await new Promise(setImmediate); // ticks due to db._baseOptions() being async
      expect(
        serviceProvider.listCollections.calledWith(
          'moo',
          {},
          {
            readPreference: 'primaryPreferred',
            nameOnly: true,
          }
        )
      ).to.equal(true);
    });
  });

  describe('default prompt', function () {
    const setupServiceProviderWithTopology = (
      topology: TopologyDescription
    ) => {
      serviceProvider.getConnectionInfo.resolves({
        extraInfo: { uri: 'mongodb://localhost/' },
        buildInfo: {},
      });
      serviceProvider.getTopologyDescription.returns(topology);
    };

    it('returns the default if nodb', async function () {
      serviceProvider = stubInterface<ServiceProvider>();
      serviceProvider.initialDb = 'test';
      serviceProvider.bsonLibrary = bson;
      serviceProvider.getConnectionInfo.resolves({
        extraInfo: { uri: 'mongodb://localhost/' },
        buildInfo: {},
      });
      instanceState = new ShellInstanceState(
        serviceProvider,
        new EventEmitter(),
        { nodb: true }
      );
      instanceState.setEvaluationListener(evaluationListener);
      instanceState.setCtx(context);
      run = (source: string) => runInContext(source, context);

      const prompt = await instanceState.getDefaultPrompt();
      expect(prompt).to.equal('> ');
    });

    it('returns correct prompt for stream', async function () {
      serviceProvider.getConnectionInfo.resolves({
        extraInfo: {
          uri: 'mongodb://atlas-stream-65a5f1cd6d50457be377be7b-1dekw.virginia-usa.a.query.mongodb-dev.net/',
          is_stream: true,
        },
        buildInfo: {},
      });

      await instanceState.fetchConnectionInfo();
      const prompt = await instanceState.getDefaultPrompt();
      expect(prompt).to.equal('AtlasStreamProcessing> ');
    });

    describe('Atlas Data Lake prefix', function () {
      it('inferred from extraInfo', async function () {
        serviceProvider.getConnectionInfo.resolves({
          extraInfo: {
            uri: 'mongodb://localhost/',
            is_data_federation: true,
          },
          buildInfo: {},
        });

        await instanceState.fetchConnectionInfo();
        const prompt = await instanceState.getDefaultPrompt();
        expect(prompt).to.equal('AtlasDataFederation test> ');
      });

      it('wins against enterprise and atlas', async function () {
        serviceProvider.getConnectionInfo.resolves({
          extraInfo: {
            uri: 'mongodb://localhost/',
            is_enterprise: true,
            is_atlas: true,
            is_data_federation: true,
          },
          buildInfo: {},
        });

        await instanceState.fetchConnectionInfo();
        const prompt = await instanceState.getDefaultPrompt();
        expect(prompt).to.equal('AtlasDataFederation test> ');
      });
    });

    describe('Atlas prefix', function () {
      it('inferred from extraInfo', async function () {
        serviceProvider.getConnectionInfo.resolves({
          extraInfo: {
            uri: 'mongodb://localhost/',
            is_atlas: true,
          },
          buildInfo: {},
        });

        await instanceState.fetchConnectionInfo();
        const prompt = await instanceState.getDefaultPrompt();
        expect(prompt).to.equal('Atlas test> ');
      });

      it('wins against enterprise', async function () {
        serviceProvider.getConnectionInfo.resolves({
          extraInfo: {
            uri: 'mongodb://localhost/',
            is_enterprise: true,
            is_atlas: true,
          },
          buildInfo: {},
        });

        await instanceState.fetchConnectionInfo();
        const prompt = await instanceState.getDefaultPrompt();
        expect(prompt).to.equal('Atlas test> ');
      });

      it('infers local atlas from extraInfo', async function () {
        serviceProvider.getConnectionInfo.resolves({
          extraInfo: {
            uri: 'mongodb://localhost/',
            is_local_atlas: true,
          },
          buildInfo: {},
        });

        await instanceState.fetchConnectionInfo();
        const prompt = await instanceState.getDefaultPrompt();
        expect(prompt).to.equal('AtlasLocalDev test> ');
      });
    });

    describe('MongoDB Enterprise prefix', function () {
      it('inferred from extraInfo', async function () {
        serviceProvider.getConnectionInfo.resolves({
          extraInfo: { uri: 'mongodb://localhost/', is_enterprise: true },
          buildInfo: {},
        });

        await instanceState.fetchConnectionInfo();
        const prompt = await instanceState.getDefaultPrompt();
        expect(prompt).to.equal('Enterprise test> ');
      });

      it('inferred from buildInfo modules', async function () {
        serviceProvider.getConnectionInfo.resolves({
          extraInfo: { uri: 'mongodb://localhost/' },
          buildInfo: { modules: ['other', 'enterprise'] },
        });

        await instanceState.fetchConnectionInfo();
        const prompt = await instanceState.getDefaultPrompt();
        expect(prompt).to.equal('Enterprise test> ');
      });
    });

    describe('direct connection = Single Topology', function () {
      for (const { t, p } of [
        { t: 'Mongos', p: 'mongos' },
        { t: 'RSArbiter', p: 'arbiter' },
        { t: 'RSOther', p: 'other' },
        { t: 'RSPrimary', p: 'primary' },
      ] as const) {
        it(`takes the info from the single server [Server Type: ${t}]`, async function () {
          const servers = new Map<string, ServerDescription>();
          servers.set('localhost:30001', {
            type: t,
            setName: 'configset',
          });
          const topology: TopologyDescription = {
            type: 'Single',
            setName: null, // This was observed behavior - the set was not updated even the single server had the set
            servers: servers,
          };
          setupServiceProviderWithTopology(topology);

          const prompt = await instanceState.getDefaultPrompt();
          expect(prompt).to.equal(`configset [direct: ${p}] test> `);
        });
      }

      for (const t of [
        'RSGhost',
        'Standalone',
        'Unknown',
        'PossiblePrimary',
      ] as const) {
        it(`defaults for server type [Server Type: ${t}]`, async function () {
          const servers = new Map<string, ServerDescription>();
          servers.set('localhost:30001', {
            type: t,
          });
          const topology: TopologyDescription = {
            type: 'Single',
            setName: null,
            servers: servers,
          };
          setupServiceProviderWithTopology(topology);

          const prompt = await instanceState.getDefaultPrompt();
          expect(prompt).to.equal('test> ');
        });
      }
    });

    describe('topology ReplicaSet...', function () {
      it('shows the setName and lacking primary hint for ReplicaSetNoPrimary', async function () {
        const topology: TopologyDescription = {
          type: 'ReplicaSetNoPrimary',
          setName: 'leSet',
        };
        setupServiceProviderWithTopology(topology);

        const prompt = await instanceState.getDefaultPrompt();
        expect(prompt).to.equal('leSet [secondary] test> ');
      });

      it('shows the setName and primary hint for ReplicaSetWithPrimary', async function () {
        const topology: TopologyDescription = {
          type: 'ReplicaSetWithPrimary',
          setName: 'leSet',
        };
        setupServiceProviderWithTopology(topology);

        const prompt = await instanceState.getDefaultPrompt();
        expect(prompt).to.equal('leSet [primary] test> ');
      });
    });

    describe('topology Sharded', function () {
      it('shows mongos without setName', async function () {
        const topology: TopologyDescription = {
          type: 'Sharded',
        };
        setupServiceProviderWithTopology(topology);

        const prompt = await instanceState.getDefaultPrompt();
        expect(prompt).to.equal('[mongos] test> ');
      });
      it('shows mongos and a setName', async function () {
        const topology: TopologyDescription = {
          type: 'Sharded',
          setName: 'leSet',
        };
        setupServiceProviderWithTopology(topology);

        const prompt = await instanceState.getDefaultPrompt();
        expect(prompt).to.equal('leSet [mongos] test> ');
      });
    });

    describe('topology Sharded but it’s Atlas', function () {
      it('shows atlas proxy identifier', async function () {
        serviceProvider.getTopologyDescription.returns({
          type: 'Sharded',
        });
        serviceProvider.getConnectionInfo.resolves({
          extraInfo: {
            uri: 'mongodb://localhost/',
            is_atlas: true,
            atlas_version: '20210330.0.0.1617063608',
          },
          buildInfo: {},
        });

        await instanceState.fetchConnectionInfo();
        const prompt = await instanceState.getDefaultPrompt();
        expect(prompt).to.equal('Atlas test> ');
      });
    });

    describe('topology LoadBalanced', function () {
      it('shows just the database', async function () {
        const topology: TopologyDescription = {
          type: 'LoadBalanced',
        };
        setupServiceProviderWithTopology(topology);

        await instanceState.fetchConnectionInfo();
        const prompt = await instanceState.getDefaultPrompt();
        expect(prompt).to.equal('test> ');
      });

      it('includes Atlas when we are there', async function () {
        serviceProvider.getTopologyDescription.returns({
          type: 'LoadBalanced',
        });
        serviceProvider.getConnectionInfo.resolves({
          extraInfo: {
            uri: 'mongodb://localhost/',
            is_atlas: true,
            atlas_version: '20210330.0.0.1617063608',
          },
          buildInfo: {},
        });

        await instanceState.fetchConnectionInfo();
        const prompt = await instanceState.getDefaultPrompt();
        expect(prompt).to.equal('Atlas test> ');
      });
    });

    describe('topology Unknown', function () {
      it('just shows the default prompt', async function () {
        const servers = new Map<string, ServerDescription>();
        servers.set('localhost:30001', {
          type: 'Unknown',
        });
        const topology: TopologyDescription = {
          type: 'Unknown',
          setName: 'unknown',
          servers: servers,
        };
        setupServiceProviderWithTopology(topology);

        const prompt = await instanceState.getDefaultPrompt();
        expect(prompt).to.equal('test> ');
      });
    });
  });
});
