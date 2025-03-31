import type { ShardedDataDistribution } from './helpers';
import {
  assertArgsDefinedType,
  coerceToJSNumber,
  dataFormat,
  getPrintableShardStatus,
  scaleIndividualShardStatistics,
  tsToSeconds,
  validateExplainableVerbosity,
} from './helpers';
import { Database, Mongo, ShellInstanceState } from './index';
import constructShellBson from './shell-bson';
import type { ServiceProvider } from '@mongosh/service-provider-core';
import { bson } from '@mongosh/service-provider-core';
import type { DevtoolsConnectOptions } from '../../service-provider-node-driver';
import { NodeDriverServiceProvider } from '../../service-provider-node-driver'; // avoid cyclic dep just for test
import { startSharedTestServer } from '../../../testing/integration-testing-hooks';
import { makeFakeConfigDatabase } from '../test/shard-test-fake-data';
import sinon from 'ts-sinon';
import chai, { expect } from 'chai';
import { EventEmitter } from 'events';
import sinonChai from 'sinon-chai';
import { stub } from 'sinon';
chai.use(sinonChai);

const fakeConfigDb = makeFakeConfigDatabase(
  constructShellBson(bson, sinon.stub())
);

export const dummyOptions: DevtoolsConnectOptions = Object.freeze({
  productName: 'Test Product',
  productDocsLink: 'https://example.com/',
});

describe('dataFormat', function () {
  it('formats byte amounts', function () {
    expect(dataFormat()).to.equal('0B');
    expect(dataFormat(10)).to.equal('10B');
    expect(dataFormat(4096)).to.equal('4KiB');
    expect(dataFormat(4096 * 4096)).to.equal('16MiB');
    expect(dataFormat(4096 * 4096 * 4096)).to.equal('64GiB');
    expect(dataFormat(4096 * 4096 * 4096 * 1000)).to.equal('64000GiB');
  });
});

describe('validateExplainableVerbosity', function () {
  const legacyMappings = [
    { input: true, expected: 'allPlansExecution' },
    { input: false, expected: 'queryPlanner' },
    { input: undefined, expected: 'queryPlanner' },
  ];

  describe('legacy mappings', function () {
    for (const { input, expected } of legacyMappings) {
      it(`maps ${input} to ${expected}`, function () {
        expect(validateExplainableVerbosity(input)).to.be.equal(expected);
      });
    }
  });

  it('keeps the provided verbosity if a mapping does not apply', function () {
    expect(validateExplainableVerbosity('allPlansExecution')).to.be.equal(
      'allPlansExecution'
    );
  });
});

describe('assertArgsDefinedType', function () {
  it('allows to specify an argument must be defined', function () {
    try {
      assertArgsDefinedType([1, undefined], [true, true], 'helper.test');
    } catch (e: any) {
      expect(e.message).to.contain('Missing required argument at position 1');
      expect(e.message).to.contain('helper.test');
      return;
    }
    expect.fail('Expected error');
  });
  it('allows to specify a single argument type', function () {
    [null, 2, {}].forEach((value) => {
      try {
        assertArgsDefinedType([1, value], [true, 'string'], 'helper.test');
      } catch (e: any) {
        expect(e.message).to.contain(
          'Argument at position 1 must be of type string'
        );
        expect(e.message).to.contain('helper.test');
        return;
      }
      expect.fail('Expected error');
    });
    expect(() => assertArgsDefinedType([1, 'test'], [true, 'string'])).to.not
      .throw;
  });
  it('allows to specify multiple argument types', function () {
    [null, {}].forEach((value) => {
      try {
        assertArgsDefinedType([1, value], [true, ['number', 'string']]);
      } catch (e: any) {
        return expect(e.message).to.contain(
          'Argument at position 1 must be of type number or string'
        );
      }
      expect.fail('Expected error');
    });
    expect(() =>
      assertArgsDefinedType([1, 'test'], [true, ['number', 'string']])
    ).to.not.throw;
    expect(() => assertArgsDefinedType([1, 2], [true, ['number', 'string']])).to
      .not.throw;
  });
  it('allows to specify an optional argument with type', function () {
    expect(() =>
      assertArgsDefinedType([1, undefined], [true, [undefined, 'string']])
    ).to.not.throw;
    expect(() =>
      assertArgsDefinedType([1, 'test'], [true, [undefined, 'string']])
    ).to.not.throw;
    try {
      assertArgsDefinedType([1, 2], [true, [undefined, 'string']]);
    } catch (e: any) {
      return expect(e.message).to.contain(
        'Argument at position 1 must be of type string'
      );
    }
    expect.fail('Expected error');
  });
});

describe('getPrintableShardStatus', function () {
  const testServer = startSharedTestServer();

  let mongo: Mongo;
  let configDatabase: Database;
  let serviceProvider: ServiceProvider;
  let inBalancerRound = false;

  const mockedShardedDataDistribution: ShardedDataDistribution = [
    {
      ns: 'test.ns',
      shards: [
        {
          shardName: 'test',
          numOrphanedDocs: 1,
          numOwnedDocuments: 5,
          orphanedSizeBytes: 20,
          ownedSizeBytes: 80,
        },
      ],
    },
  ];

  beforeEach(async function () {
    serviceProvider = await NodeDriverServiceProvider.connect(
      await testServer.connectionString(),
      dummyOptions,
      {},
      new EventEmitter()
    );
    mongo = new Mongo(
      new ShellInstanceState(serviceProvider),
      undefined,
      undefined,
      undefined,
      serviceProvider
    );
    configDatabase = new Database(mongo, 'config_test');
    expect(configDatabase.getName()).to.equal('config_test');

    const origRunCommandWithCheck = serviceProvider.runCommandWithCheck;
    serviceProvider.runCommandWithCheck = async (db, cmd) => {
      if (cmd.hello) {
        return { ok: 1, msg: 'isdbgrid' };
      }
      if (db === 'admin' && cmd.balancerStatus) {
        return { ok: 1, inBalancerRound };
      }
      return origRunCommandWithCheck.call(serviceProvider, db, cmd, {});
    };

    await Promise.all(
      Object.entries(fakeConfigDb).map(async ([coll, contents]) => {
        await configDatabase.getCollection(coll).insertMany(contents as any);
      })
    );
    // The printing method depends on data + the current date, so we provide
    // a fake Date implementation here.
    class FakeDate extends Date {
      constructor(t?: any) {
        super(t || '2020-12-09T12:59:11.912Z');
      }
      static now() {
        return new FakeDate().getTime();
      }
    }
    sinon.replace(global, 'Date', FakeDate as typeof Date);
  });

  afterEach(async function () {
    sinon.restore();
    await configDatabase.dropDatabase();
    await serviceProvider.close(true);
  });

  it('returns an object with sharding information', async function () {
    const mockedAdminDb = {
      aggregate: stub()
        .withArgs([{ $shardedDataDistribution: {} }])
        .resolves({
          toArray: stub().resolves(mockedShardedDataDistribution),
        }),
    };
    const getSiblingDB = stub();
    getSiblingDB.withArgs('admin').returns(mockedAdminDb);
    getSiblingDB.withArgs('config').returns(configDatabase);

    configDatabase.getSiblingDB = getSiblingDB;
    configDatabase._maybeCachedHello = stub().returns({ msg: 'isdbgrid' });

    const status = await getPrintableShardStatus(configDatabase, false);
    expect(status.shardingVersion.clusterId).to.be.instanceOf(bson.ObjectId);
    expect(status.shards.map(({ host }: { host: string }) => host)).to.include(
      'shard01/localhost:27018,localhost:27019,localhost:27020'
    );
    expect(status['most recently active mongoses']).to.have.lengthOf(1);
    expect(status.autosplit['Currently enabled']).to.equal('yes');
    expect(status.automerge['Currently enabled']).to.equal('yes');
    expect(status.balancer['Currently enabled']).to.equal('yes');
    expect(
      status.balancer['Failed balancer rounds in last 5 attempts']
    ).to.equal(0);
    expect(status.balancer['Migration Results for the last 24 hours']).to.equal(
      'No recent migrations'
    );
    expect(status.databases).to.have.lengthOf(1);
    expect(status.databases[0].database._id).to.equal('config');

    expect(status.shardedDataDistribution).to.equal(
      mockedShardedDataDistribution
    );
  });

  describe('hides all internal deprecated fields in shardingVersion', function () {
    for (const hiddenField of [
      'minCompatibleVersion',
      'currentVersion',
      'excluding',
      'upgradeId',
      'upgradeState',
    ]) {
      it(`does not show ${hiddenField} in shardingVersion`, async function () {
        const status = await getPrintableShardStatus(configDatabase, false);
        expect((status.shardingVersion as any)[hiddenField]).to.equal(
          undefined
        );
      });
    }
  });

  it('returns whether the balancer is currently running', async function () {
    {
      inBalancerRound = true;
      const status = await getPrintableShardStatus(configDatabase, true);
      expect(status.balancer['Currently running']).to.equal('yes');
    }

    {
      inBalancerRound = false;
      const status = await getPrintableShardStatus(configDatabase, true);
      expect(status.balancer['Currently running']).to.equal('no');
    }
  });

  it('returns an object with verbose sharding information if requested', async function () {
    const status = await getPrintableShardStatus(configDatabase, true);
    expect((status['most recently active mongoses'][0] as any).up).to.be.a(
      'number'
    );
    expect((status['most recently active mongoses'][0] as any).waiting).to.be.a(
      'boolean'
    );
  });

  it('returns active balancer window information', async function () {
    await configDatabase.getCollection('settings').insertOne({
      _id: 'balancer',
      activeWindow: { start: '00:00', stop: '23:59' },
    });
    const status = await getPrintableShardStatus(configDatabase, false);
    expect(status.balancer['Balancer active window is set between']).to.equal(
      '00:00 and 23:59 server local time'
    );
  });

  it('reports actionlog error information', async function () {
    await configDatabase.getCollection('actionlog').insertOne({
      details: {
        errorOccured: true,
        errmsg: 'Some error',
      },
      time: new Date('2020-12-07T12:58:53.579Z'),
      what: 'balancer.round',
      ns: '',
    });
    const status = await getPrintableShardStatus(configDatabase, false);
    expect(
      status.balancer['Failed balancer rounds in last 5 attempts']
    ).to.equal(1);
    expect(status.balancer['Last reported error']).to.equal('Some error');
  });

  it('reports currently active migrations', async function () {
    await configDatabase.getCollection('locks').insertOne({
      _id: 'asdf',
      state: 2,
      ts: new bson.ObjectId('5fce116c579db766a198a176'),
      when: new Date('2020-12-07T11:26:36.803Z'),
    });
    const status = await getPrintableShardStatus(configDatabase, false);
    expect(
      status.balancer['Collections with active migrations']
    ).to.have.lengthOf(1);
    expect(
      status.balancer['Collections with active migrations']?.join('')
    ).to.include('asdf');
  });

  it('reports successful migrations', async function () {
    await configDatabase.getCollection('changelog').insertOne({
      time: new Date('2020-12-08T13:26:06.357Z'),
      what: 'moveChunk.from',
      details: { from: 'shard0', to: 'shard1', note: 'success' },
    });
    const status = await getPrintableShardStatus(configDatabase, false);
    expect(
      status.balancer['Migration Results for the last 24 hours']
    ).to.deep.equal({ 1: 'Success' });
  });

  it('reports failed migrations', async function () {
    await configDatabase.getCollection('changelog').insertOne({
      time: new Date('2020-12-08T13:26:07.357Z'),
      what: 'moveChunk.from',
      details: { from: 'shard0', to: 'shard1', errmsg: 'oopsie' },
    });
    const status = await getPrintableShardStatus(configDatabase, false);

    expect(
      status.balancer['Migration Results for the last 24 hours']
    ).to.deep.equal({ 1: "Failed with error 'oopsie', from shard0 to shard1" });
  });

  it('fails when config.version is empty', async function () {
    await configDatabase.getCollection('version').drop();
    try {
      await getPrintableShardStatus(configDatabase, false);
    } catch (err: any) {
      expect(err.name).to.equal('MongoshInvalidInputError');
      return;
    }
    expect.fail('missed exception');
  });
});

describe('coerceToJSNumber', function () {
  it('converts various BSON types to JS numbers', function () {
    expect(coerceToJSNumber(0)).to.equal(0);
    expect(coerceToJSNumber(new bson.Int32(0))).to.equal(0);
    expect(coerceToJSNumber(new bson.Long(0))).to.equal(0);
    expect(coerceToJSNumber(new bson.Long('9223372036854775807'))).to.equal(
      9223372036854776000
    );
    expect(coerceToJSNumber(new bson.Double(1e30))).to.equal(1e30);
  });
});

describe('scaleIndividualShardStatistics', function () {
  it('scales the individual shard statistics according to the scale 10', function () {
    const result = scaleIndividualShardStatistics(
      {
        size: 200,
        maxSize: 2000, // Capped collection.
        storageSize: 180, // Can be smaller than `size` when the data is compressed.
        totalIndexSize: 50,
        totalSize: 230, // New in 4.4. (sum of storageSize and totalIndexSize)
        scaleFactor: 1,
        capped: true,
        wiredTiger: {},
        ns: 'test.test',
        indexSizes: {
          _id: 20,
          name: 30,
        },
      },
      10
    );

    expect(result).to.deep.equal({
      size: 20,
      maxSize: 200, // Capped collection.
      storageSize: 18, // Can be smaller than `size` when the data is compressed.
      totalIndexSize: 5,
      totalSize: 23, // New in 4.4. (sum of storageSize and totalIndexSize)
      scaleFactor: 10,
      capped: true,
      wiredTiger: {},
      ns: 'test.test',
      indexSizes: {
        _id: 2,
        name: 3,
      },
    });
  });

  it('scales the individual shard statistics according to the scale 1', function () {
    const result = scaleIndividualShardStatistics(
      {
        size: 200,
        storageSize: 180, // Can be smaller than `size` when the data is compressed.
        totalIndexSize: 50,
        totalSize: 230, // New in 4.4. (sum of storageSize and totalIndexSize)
        scaleFactor: 1,
        capped: true,
        wiredTiger: {},
        ns: 'test.test',
        indexSizes: {
          _id: 20,
          name: 30,
        },
      },
      1
    );

    expect(result).to.deep.equal({
      size: 200,
      storageSize: 180, // Can be smaller than `size` when the data is compressed.
      totalIndexSize: 50,
      totalSize: 230, // New in 4.4. (sum of storageSize and totalIndexSize)
      scaleFactor: 1,
      capped: true,
      wiredTiger: {},
      ns: 'test.test',
      indexSizes: {
        _id: 20,
        name: 30,
      },
    });
  });
});

describe('tsToSeconds', function () {
  it('accepts a range of formats', function () {
    expect(tsToSeconds(new bson.Timestamp({ t: 12345, i: 0 }))).to.equal(12345);
    expect(tsToSeconds(new bson.Timestamp({ t: 12345, i: 10 }))).to.equal(
      12345
    );
    expect(tsToSeconds(new bson.Double(12345 * 2 ** 32))).to.equal(12345);
    expect(tsToSeconds(12345 * 2 ** 32)).to.equal(12345);
  });
});
