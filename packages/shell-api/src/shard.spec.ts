import { expect } from 'chai';
import sinon from 'sinon';
import type { StubbedInstance } from 'ts-sinon';
import { stubInterface } from 'ts-sinon';
import Shard from './shard';
import {
  ADMIN_DB,
  ALL_PLATFORMS,
  ALL_SERVER_VERSIONS,
  ALL_TOPOLOGIES,
} from './enums';
import type { Collection } from './index';
import { signatures, toShellResult } from './index';
import Mongo from './mongo';
import type {
  ServiceProvider,
  FindCursor as ServiceProviderCursor,
  AggregationCursor as ServiceProviderAggCursor,
  RunCommandCursor as ServiceProviderRunCommandCursor,
  Document,
} from '@mongosh/service-provider-core';
import { bson } from '@mongosh/service-provider-core';
import { EventEmitter } from 'events';
import ShellInstanceState from './shell-instance-state';
import { UpdateResult } from './result';
import { NodeDriverServiceProvider } from '../../service-provider-node-driver';
import {
  startTestCluster,
  skipIfServerVersion,
  skipIfApiStrict,
} from '../../../testing/integration-testing-hooks';
import Database from './database';
import { inspect } from 'util';
import { dummyOptions } from './helpers.spec';

describe('Shard', function () {
  skipIfApiStrict();

  describe('help', function () {
    const apiClass: any = new Shard({} as any);
    it('calls help function', async function () {
      expect((await toShellResult(apiClass.help())).type).to.equal('Help');
      expect((await toShellResult(apiClass.help)).type).to.equal('Help');
    });
    it('calls help function for methods', async function () {
      expect(
        (await toShellResult(apiClass.enableSharding.help())).type
      ).to.equal('Help');
      expect((await toShellResult(apiClass.enableSharding.help)).type).to.equal(
        'Help'
      );
    });
  });

  describe('signatures', function () {
    it('type', function () {
      expect(signatures.Shard.type).to.equal('Shard');
    });
    it('attributes', function () {
      expect(signatures.Shard.attributes?.enableSharding).to.deep.equal({
        type: 'function',
        returnsPromise: true,
        deprecated: false,
        returnType: { type: 'unknown', attributes: {} },
        platforms: ALL_PLATFORMS,
        topologies: ALL_TOPOLOGIES,
        apiVersions: [0, 0],
        serverVersions: ALL_SERVER_VERSIONS,
        isDirectShellCommand: false,
        acceptsRawInput: false,
        shellCommandCompleter: undefined,
      });
    });
  });

  describe('Metadata', function () {
    describe('toShellResult', function () {
      const mongo = { _uri: 'test_uri' } as Mongo;
      const db = { _mongo: mongo, _name: 'test' } as Database;
      const sh = new Shard(db);
      it('value', async function () {
        expect((await toShellResult(sh)).printable).to.equal(
          'Shard class connected to test_uri via db test'
        );
      });
      it('type', async function () {
        expect((await toShellResult(sh)).type).to.equal('Shard');
      });
    });
  });

  describe('unit', function () {
    let mongo: Mongo;
    let serviceProvider: StubbedInstance<ServiceProvider>;
    let shard: Shard;
    let bus: StubbedInstance<EventEmitter>;
    let instanceState: ShellInstanceState;
    let db: Database;
    let warnSpy: any;

    beforeEach(function () {
      bus = stubInterface<EventEmitter>();
      serviceProvider = stubInterface<ServiceProvider>();
      serviceProvider.initialDb = 'test';
      serviceProvider.bsonLibrary = bson;
      serviceProvider.runCommandWithCheck.resolves({ ok: 1 });
      serviceProvider.runCommandWithCheck.resolves({ ok: 1 });
      warnSpy = sinon.spy();
      instanceState = new ShellInstanceState(serviceProvider, bus);
      instanceState.printWarning = warnSpy;
      instanceState.printDeprecationWarning = warnSpy;
      mongo = new Mongo(
        instanceState,
        undefined,
        undefined,
        undefined,
        serviceProvider
      );
      db = new Database(mongo, 'testDb');
      shard = new Shard(db);
    });
    describe('enableSharding', function () {
      it('calls serviceProvider.runCommandWithCheck without optional arg', async function () {
        await shard.enableSharding('db.coll');

        expect(serviceProvider.runCommandWithCheck).to.have.been.calledWith(
          ADMIN_DB,
          {
            enableSharding: 'db.coll',
          }
        );
      });

      it('calls serviceProvider.runCommandWithCheck with arg', async function () {
        await shard.enableSharding('dbname', 'primaryShard');

        expect(serviceProvider.runCommandWithCheck).to.have.been.calledWith(
          ADMIN_DB,
          {
            enableSharding: 'dbname',
            primaryShard: 'primaryShard',
          }
        );
      });

      it('returns whatever serviceProvider.runCommandWithCheck returns', async function () {
        const expectedResult = { ok: 1 };
        serviceProvider.runCommandWithCheck.resolves(expectedResult);
        const result = await shard.enableSharding('dbname');
        expect(result).to.deep.equal(expectedResult);
      });

      it('throws if serviceProvider.runCommandWithCheck rejects', async function () {
        const expectedError = new Error();
        serviceProvider.runCommandWithCheck.rejects(expectedError);
        const caughtError = await shard
          .enableSharding('dbname')
          .catch((e) => e);
        expect(caughtError).to.equal(expectedError);
      });
    });
    describe('shardCollection', function () {
      it('calls serviceProvider.runCommandWithCheck without optional args', async function () {
        await shard.shardCollection('db.coll', { key: 1 });
        expect(serviceProvider.runCommandWithCheck).to.have.been.calledWith(
          ADMIN_DB,
          {
            shardCollection: 'db.coll',
            key: { key: 1 },
          }
        );
      });

      it('calls serviceProvider.runCommandWithCheck with optional args', async function () {
        await shard.shardCollection('db.coll', { key: 1 }, true, {
          option1: 1,
        });
        expect(serviceProvider.runCommandWithCheck).to.have.been.calledWith(
          ADMIN_DB,
          {
            shardCollection: 'db.coll',
            key: { key: 1 },
            unique: true,
            option1: 1,
          }
        );
      });

      it('returns whatever serviceProvider.runCommandWithCheck returns', async function () {
        const expectedResult = { ok: 1 };
        serviceProvider.runCommandWithCheck.resolves(expectedResult);
        const result = await shard.shardCollection('db.coll', { key: 1 });
        expect(result).to.deep.equal(expectedResult);
      });

      it('throws if serviceProvider.runCommandWithCheck rejects', async function () {
        const expectedError = new Error();
        serviceProvider.runCommandWithCheck.rejects(expectedError);
        const caughtError = await shard
          .shardCollection('db.coll', { key: 1 })
          .catch((e) => e);
        expect(caughtError).to.equal(expectedError);
      });
    });
    describe('reshardCollection', function () {
      it('calls serviceProvider.runCommandWithCheck without optional args', async function () {
        await shard.reshardCollection('db.coll', { key: 1 });
        expect(serviceProvider.runCommandWithCheck).to.have.been.calledWith(
          ADMIN_DB,
          {
            reshardCollection: 'db.coll',
            key: { key: 1 },
          }
        );
      });

      it('calls serviceProvider.runCommandWithCheck with optional args', async function () {
        await shard.reshardCollection('db.coll', { key: 1 }, true, {
          option1: 1,
        });
        expect(serviceProvider.runCommandWithCheck).to.have.been.calledWith(
          ADMIN_DB,
          {
            reshardCollection: 'db.coll',
            key: { key: 1 },
            unique: true,
            option1: 1,
          }
        );
      });

      it('returns whatever serviceProvider.runCommandWithCheck returns', async function () {
        const expectedResult = { ok: 1 };
        serviceProvider.runCommandWithCheck.resolves(expectedResult);
        const result = await shard.reshardCollection('db.coll', { key: 1 });
        expect(result).to.deep.equal(expectedResult);
      });

      it('throws if serviceProvider.runCommandWithCheck rejects', async function () {
        const expectedError = new Error();
        serviceProvider.runCommandWithCheck.rejects(expectedError);
        const caughtError = await shard
          .reshardCollection('db.coll', { key: 1 })
          .catch((e) => e);
        expect(caughtError).to.equal(expectedError);
      });
    });
    describe('commitReshardCollection', function () {
      it('calls serviceProvider.runCommandWithCheck', async function () {
        await shard.commitReshardCollection('db.coll');
        expect(serviceProvider.runCommandWithCheck).to.have.been.calledWith(
          ADMIN_DB,
          {
            commitReshardCollection: 'db.coll',
          }
        );
      });

      it('returns whatever serviceProvider.runCommandWithCheck returns', async function () {
        const expectedResult = { ok: 1 };
        serviceProvider.runCommandWithCheck.resolves(expectedResult);
        const result = await shard.commitReshardCollection('db.coll');
        expect(result).to.deep.equal(expectedResult);
      });

      it('throws if serviceProvider.runCommandWithCheck rejects', async function () {
        const expectedError = new Error();
        serviceProvider.runCommandWithCheck.rejects(expectedError);
        const caughtError = await shard
          .commitReshardCollection('db.coll')
          .catch((e) => e);
        expect(caughtError).to.equal(expectedError);
      });
    });
    describe('abortReshardCollection', function () {
      it('calls serviceProvider.runCommandWithCheck', async function () {
        await shard.abortReshardCollection('db.coll');
        expect(serviceProvider.runCommandWithCheck).to.have.been.calledWith(
          ADMIN_DB,
          {
            abortReshardCollection: 'db.coll',
          }
        );
      });

      it('returns whatever serviceProvider.runCommandWithCheck returns', async function () {
        const expectedResult = { ok: 1 };
        serviceProvider.runCommandWithCheck.resolves(expectedResult);
        const result = await shard.abortReshardCollection('db.coll');
        expect(result).to.deep.equal(expectedResult);
      });

      it('throws if serviceProvider.runCommandWithCheck rejects', async function () {
        const expectedError = new Error();
        serviceProvider.runCommandWithCheck.rejects(expectedError);
        const caughtError = await shard
          .abortReshardCollection('db.coll')
          .catch((e) => e);
        expect(caughtError).to.equal(expectedError);
      });
    });
    describe('addShard', function () {
      it('calls serviceProvider.runCommandWithCheck with arg', async function () {
        serviceProvider.runCommandWithCheck.resolves({
          ok: 1,
          msg: 'isdbgrid',
        });
        await shard.addShard('uri');

        expect(serviceProvider.runCommandWithCheck).to.have.been.calledWith(
          ADMIN_DB,
          {
            addShard: 'uri',
          }
        );
      });

      it('returns whatever serviceProvider.runCommandWithCheck returns', async function () {
        const expectedResult = { ok: 1 };
        serviceProvider.runCommandWithCheck
          .onCall(0)
          .resolves({ ok: 1, msg: 'isdbgrid' });
        serviceProvider.runCommandWithCheck.onCall(1).resolves(expectedResult);
        const result = await shard.addShard('uri');
        expect(result).to.deep.equal(expectedResult);
      });

      it('throws if serviceProvider.runCommandWithCheck rejects', async function () {
        serviceProvider.runCommandWithCheck
          .onCall(0)
          .resolves({ ok: 1, msg: 'isdbgrid' });
        const expectedError = new Error();
        serviceProvider.runCommandWithCheck.onCall(1).rejects(expectedError);
        const caughtError = await shard.addShard('uri').catch((e) => e);
        expect(caughtError).to.equal(expectedError);
      });

      it('throws if not mongos', async function () {
        const expectedResult = { ok: 1 };
        serviceProvider.runCommandWithCheck
          .onCall(0)
          .resolves({ ok: 1, msg: 'not dbgrid' });
        serviceProvider.runCommandWithCheck.onCall(1).resolves(expectedResult);
        await shard.addShard('uri');
        expect(warnSpy.calledOnce).to.equal(true);
      });
    });
    describe('addShardToZone', function () {
      it('calls serviceProvider.runCommandWithCheck with arg', async function () {
        serviceProvider.runCommandWithCheck.resolves({
          ok: 1,
          msg: 'isdbgrid',
        });
        await shard.addShardToZone('shard', 'zone');

        expect(serviceProvider.runCommandWithCheck).to.have.been.calledWith(
          ADMIN_DB,
          {
            addShardToZone: 'shard',
            zone: 'zone',
          }
        );
      });

      it('returns whatever serviceProvider.runCommandWithCheck returns', async function () {
        const expectedResult = { ok: 1 };
        serviceProvider.runCommandWithCheck
          .onCall(0)
          .resolves({ ok: 1, msg: 'isdbgrid' });
        serviceProvider.runCommandWithCheck.onCall(1).resolves(expectedResult);
        const result = await shard.addShardToZone('shard', 'zone');
        expect(result).to.deep.equal(expectedResult);
      });

      it('throws if serviceProvider.runCommandWithCheck rejects', async function () {
        serviceProvider.runCommandWithCheck
          .onCall(0)
          .resolves({ ok: 1, msg: 'isdbgrid' });
        const expectedError = new Error();
        serviceProvider.runCommandWithCheck.onCall(1).rejects(expectedError);
        const caughtError = await shard
          .addShardToZone('shard', 'zone')
          .catch((e) => e);
        expect(caughtError).to.equal(expectedError);
      });

      it('throws if not mongos', async function () {
        const expectedResult = { ok: 1 };
        serviceProvider.runCommandWithCheck
          .onCall(0)
          .resolves({ ok: 1, msg: 'not dbgrid' });
        serviceProvider.runCommandWithCheck.onCall(1).resolves(expectedResult);
        await shard.addShardToZone('shard', 'zone');
        expect(warnSpy.calledOnce).to.equal(true);
      });
    });
    describe('addShardTag', function () {
      it('calls serviceProvider.runCommandWithCheck with arg', async function () {
        serviceProvider.runCommandWithCheck.resolves({
          ok: 1,
          msg: 'isdbgrid',
        });
        await shard.addShardTag('shard', 'zone');

        expect(serviceProvider.runCommandWithCheck).to.have.been.calledWith(
          ADMIN_DB,
          {
            addShardToZone: 'shard',
            zone: 'zone',
          }
        );
      });

      it('returns whatever serviceProvider.runCommandWithCheck returns', async function () {
        const expectedResult = { ok: 1 };
        serviceProvider.runCommandWithCheck
          .onCall(0)
          .resolves({ ok: 1, msg: 'isdbgrid' });
        serviceProvider.runCommandWithCheck.onCall(1).resolves(expectedResult);
        const result = await shard.addShardTag('shard', 'zone');
        expect(result).to.deep.equal(expectedResult);
      });

      it('throws if serviceProvider.runCommandWithCheck rejects', async function () {
        serviceProvider.runCommandWithCheck
          .onCall(0)
          .resolves({ ok: 1, msg: 'isdbgrid' });
        const expectedError = new Error();
        serviceProvider.runCommandWithCheck.onCall(1).rejects(expectedError);
        const caughtError = await shard
          .addShardTag('shard', 'zone')
          .catch((e) => e);
        expect(caughtError).to.equal(expectedError);
      });

      it('throws if not mongos', async function () {
        const expectedResult = { ok: 1 };
        serviceProvider.runCommandWithCheck
          .onCall(0)
          .resolves({ ok: 1, msg: 'not dbgrid' });
        serviceProvider.runCommandWithCheck.onCall(1).resolves(expectedResult);
        await shard.addShardTag('shard', 'zone');
        expect(warnSpy.calledOnce).to.equal(true);
      });

      it('adds version suggestion if command not found', async function () {
        serviceProvider.runCommandWithCheck.resolves({
          ok: 1,
          msg: 'isdbgrid',
        });
        const expectedError = new Error();
        (expectedError as any).codeName = 'CommandNotFound';
        serviceProvider.runCommandWithCheck.rejects(expectedError);
        const caughtError = await shard
          .addShardTag('shard', 'zone')
          .catch((e) => e);
        expect(caughtError.message).to.include('> 3.4');
      });
    });
    describe('updateZoneKeyRange', function () {
      it('calls serviceProvider.runCommandWithCheck with arg', async function () {
        serviceProvider.runCommandWithCheck.resolves({
          ok: 1,
          msg: 'isdbgrid',
        });
        await shard.updateZoneKeyRange('ns', { min: 0 }, { max: 1 }, 'zone');

        expect(serviceProvider.runCommandWithCheck).to.have.been.calledWith(
          ADMIN_DB,
          {
            updateZoneKeyRange: 'ns',
            min: { min: 0 },
            max: { max: 1 },
            zone: 'zone',
          }
        );
      });

      it('returns whatever serviceProvider.runCommandWithCheck returns', async function () {
        const expectedResult = { ok: 1 };
        serviceProvider.runCommandWithCheck
          .onCall(0)
          .resolves({ ok: 1, msg: 'isdbgrid' });
        serviceProvider.runCommandWithCheck.onCall(1).resolves(expectedResult);
        const result = await shard.updateZoneKeyRange('ns', {}, {}, 'zone');
        expect(result).to.deep.equal(expectedResult);
      });

      it('throws if serviceProvider.runCommandWithCheck rejects', async function () {
        serviceProvider.runCommandWithCheck
          .onCall(0)
          .resolves({ ok: 1, msg: 'isdbgrid' });
        const expectedError = new Error();
        serviceProvider.runCommandWithCheck.onCall(1).rejects(expectedError);
        const caughtError = await shard
          .updateZoneKeyRange('ns', {}, {}, 'zone')
          .catch((e) => e);
        expect(caughtError).to.equal(expectedError);
      });

      it('throws if not mongos', async function () {
        const expectedResult = { ok: 1 };
        serviceProvider.runCommandWithCheck
          .onCall(0)
          .resolves({ ok: 1, msg: 'not dbgrid' });
        serviceProvider.runCommandWithCheck.onCall(1).resolves(expectedResult);
        await shard.updateZoneKeyRange('ns', {}, {}, 'zone');
        expect(warnSpy.calledOnce).to.equal(true);
      });
    });
    describe('addTagRange', function () {
      it('calls serviceProvider.runCommandWithCheck with arg', async function () {
        serviceProvider.runCommandWithCheck
          .onCall(0)
          .resolves({ ok: 1, msg: 'isdbgrid' });
        await shard.addTagRange('ns', { min: 0 }, { max: 1 }, 'zone');

        expect(serviceProvider.runCommandWithCheck).to.have.been.calledWith(
          ADMIN_DB,
          {
            updateZoneKeyRange: 'ns',
            min: { min: 0 },
            max: { max: 1 },
            zone: 'zone',
          }
        );
      });

      it('returns whatever serviceProvider.runCommandWithCheck returns', async function () {
        const expectedResult = { ok: 1 };
        serviceProvider.runCommandWithCheck
          .onCall(0)
          .resolves({ ok: 1, msg: 'isdbgrid' });
        serviceProvider.runCommandWithCheck.onCall(1).resolves(expectedResult);
        const result = await shard.addTagRange('ns', {}, {}, 'zone');
        expect(result).to.deep.equal(expectedResult);
      });

      it('throws if serviceProvider.runCommandWithCheck rejects', async function () {
        serviceProvider.runCommandWithCheck
          .onCall(0)
          .resolves({ ok: 1, msg: 'isdbgrid' });
        const expectedError = new Error();
        serviceProvider.runCommandWithCheck.onCall(1).rejects(expectedError);
        const caughtError = await shard
          .addTagRange('ns', {}, {}, 'zone')
          .catch((e) => e);
        expect(caughtError).to.equal(expectedError);
      });

      it('throws if not mongos', async function () {
        const expectedResult = { ok: 1 };
        serviceProvider.runCommandWithCheck
          .onCall(0)
          .resolves({ ok: 1, msg: 'not dbgrid' });
        serviceProvider.runCommandWithCheck.onCall(1).resolves(expectedResult);
        await shard.addTagRange('ns', {}, {}, 'zone');
        expect(warnSpy.calledOnce).to.equal(true);
      });

      it('adds version suggestion if command not found', async function () {
        serviceProvider.runCommandWithCheck
          .onCall(0)
          .resolves({ ok: 1, msg: 'isdbgrid' });
        const expectedError = new Error();
        (expectedError as any).codeName = 'CommandNotFound';
        serviceProvider.runCommandWithCheck.onCall(1).rejects(expectedError);
        const caughtError = await shard
          .addTagRange('ns', {}, {}, 'zone')
          .catch((e) => e);
        expect(caughtError.message).to.include('> 3.4');
      });
    });
    describe('removeRangeFromZone', function () {
      it('calls serviceProvider.runCommandWithChek with arg', async function () {
        serviceProvider.runCommandWithCheck.resolves({
          ok: 1,
          msg: 'isdbgrid',
        });
        await shard.removeRangeFromZone('ns', { min: 1 }, { max: 1 });

        expect(serviceProvider.runCommandWithCheck).to.have.been.calledWith(
          ADMIN_DB,
          {
            updateZoneKeyRange: 'ns',
            min: {
              min: 1,
            },
            max: {
              max: 1,
            },
            zone: null,
          }
        );
      });

      it('returns whatever serviceProvider.updateZoneKeyRange returns', async function () {
        serviceProvider.runCommandWithCheck
          .onCall(0)
          .resolves({ ok: 1, msg: 'isdbgrid' });
        const expectedResult = { ok: 1, msg: 'isdbgrid' };
        serviceProvider.runCommandWithCheck.onCall(1).resolves(expectedResult);
        const result = await shard.removeRangeFromZone(
          'ns',
          { min: 1 },
          { max: 1 }
        );
        expect(result).to.deep.equal(expectedResult);
      });

      it('throws if serviceProvider.updateZoneKeyRange rejects', async function () {
        serviceProvider.runCommandWithCheck
          .onCall(0)
          .resolves({ ok: 1, msg: 'isdbgrid' });
        const expectedError = new Error();
        serviceProvider.runCommandWithCheck.onCall(1).rejects(expectedError);
        const caughtError = await shard
          .removeRangeFromZone('ns', { min: 1 }, { max: 1 })
          .catch((e) => e);
        expect(caughtError).to.equal(expectedError);
      });
      it('throws if not mongos', async function () {
        const expectedResult = { ok: 1, msg: 'isdbgrid' };
        serviceProvider.runCommandWithCheck
          .onCall(0)
          .resolves({ ok: 1, msg: 'not dbgrid' });
        serviceProvider.runCommandWithCheck.onCall(1).resolves(expectedResult);
        await shard.removeRangeFromZone('ns', {}, {});
        expect(warnSpy.calledOnce).to.equal(true);
      });
    });
    describe('removeTagRange', function () {
      it('calls serviceProvider.runCommandWithCheck with arg', async function () {
        serviceProvider.runCommandWithCheck.resolves({
          ok: 1,
          msg: 'isdbgrid',
        });
        await shard.removeTagRange('ns', { min: 1 }, { max: 1 });

        expect(serviceProvider.runCommandWithCheck).to.have.been.calledWith(
          ADMIN_DB,
          {
            updateZoneKeyRange: 'ns',
            min: {
              min: 1,
            },
            max: {
              max: 1,
            },
            zone: null,
          }
        );
      });

      it('returns whatever serviceProvider.runCommandWithCheck returns', async function () {
        serviceProvider.runCommandWithCheck
          .onCall(0)
          .resolves({ ok: 1, msg: 'isdbgrid' });
        const expectedResult = { ok: 1, msg: 'isdbgrid' };
        serviceProvider.runCommandWithCheck.onCall(1).resolves(expectedResult);
        const result = await shard.removeTagRange('ns', { min: 1 }, { max: 1 });
        expect(result).to.deep.equal(expectedResult);
      });

      it('throws if serviceProvider.runCommandWithCheck rejects', async function () {
        serviceProvider.runCommandWithCheck
          .onCall(0)
          .resolves({ ok: 1, msg: 'isdbgrid' });
        const expectedError = new Error();
        serviceProvider.runCommandWithCheck.onCall(1).rejects(expectedError);
        const caughtError = await shard
          .removeTagRange('ns', { min: 1 }, { max: 1 })
          .catch((e) => e);
        expect(caughtError).to.equal(expectedError);
      });
      it('throws if not mongos', async function () {
        const expectedResult = { ok: 1 };
        serviceProvider.runCommandWithCheck
          .onCall(0)
          .resolves({ ok: 1, msg: 'not dbgrid' });
        serviceProvider.runCommandWithCheck.onCall(1).resolves(expectedResult);
        await shard.removeTagRange('ns', {}, {});
        expect(warnSpy.calledOnce).to.equal(true);
      });
      it('adds version suggestion if command not found', async function () {
        serviceProvider.runCommandWithCheck
          .onCall(0)
          .resolves({ ok: 1, msg: 'isdbgrid' });
        const expectedError = new Error();
        (expectedError as any).codeName = 'CommandNotFound';
        serviceProvider.runCommandWithCheck.onCall(1).rejects(expectedError);
        const caughtError = await shard
          .removeTagRange('ns', {}, {})
          .catch((e) => e);
        expect(caughtError.message).to.include('> 3.4');
      });
    });
    describe('removeShardFromZone', function () {
      it('calls serviceProvider.runCommandWithCheck with arg', async function () {
        serviceProvider.runCommandWithCheck.resolves({
          ok: 1,
          msg: 'isdbgrid',
        });
        await shard.removeShardFromZone('shard', 'zone');

        expect(serviceProvider.runCommandWithCheck).to.have.been.calledWith(
          ADMIN_DB,
          {
            removeShardFromZone: 'shard',
            zone: 'zone',
          }
        );
      });

      it('returns whatever serviceProvider.runCommandWithCheck returns', async function () {
        serviceProvider.runCommandWithCheck
          .onCall(0)
          .resolves({ ok: 1, msg: 'isdbgrid' });
        const expectedResult = { ok: 1 };
        serviceProvider.runCommandWithCheck.onCall(1).resolves(expectedResult);
        const result = await shard.removeShardFromZone('shard', 'zone');
        expect(result).to.deep.equal(expectedResult);
      });

      it('throws if serviceProvider.runCommandWithCheck rejects', async function () {
        serviceProvider.runCommandWithCheck
          .onCall(0)
          .resolves({ ok: 1, msg: 'isdbgrid' });
        const expectedError = new Error();
        serviceProvider.runCommandWithCheck.onCall(1).rejects(expectedError);
        const caughtError = await shard
          .removeShardFromZone('shard', 'zone')
          .catch((e) => e);
        expect(caughtError).to.equal(expectedError);
      });
      it('throws if not mongos', async function () {
        const expectedResult = { ok: 1 };
        serviceProvider.runCommandWithCheck
          .onCall(0)
          .resolves({ ok: 1, msg: 'not dbgrid' });
        serviceProvider.runCommandWithCheck.onCall(1).resolves(expectedResult);
        await shard.removeShardFromZone('shard', 'zone');
        expect(warnSpy.calledOnce).to.equal(true);
      });
    });
    describe('removeShardTag', function () {
      it('calls serviceProvider.runCommandWithCheck with arg', async function () {
        serviceProvider.runCommandWithCheck.resolves({
          ok: 1,
          msg: 'isdbgrid',
        });
        await shard.removeShardTag('shard', 'zone');

        expect(serviceProvider.runCommandWithCheck).to.have.been.calledWith(
          ADMIN_DB,
          {
            removeShardFromZone: 'shard',
            zone: 'zone',
          }
        );
      });

      it('returns whatever serviceProvider.runCommandWithCheck returns', async function () {
        serviceProvider.runCommandWithCheck
          .onCall(0)
          .resolves({ ok: 1, msg: 'isdbgrid' });
        const expectedResult = { ok: 1 };
        serviceProvider.runCommandWithCheck.onCall(1).resolves(expectedResult);
        const result = await shard.removeShardTag('shard', 'zone');
        expect(result).to.deep.equal(expectedResult);
      });

      it('throws if serviceProvider.runCommandWithCheck rejects', async function () {
        serviceProvider.runCommandWithCheck
          .onCall(0)
          .resolves({ ok: 1, msg: 'isdbgrid' });
        const expectedError = new Error();
        serviceProvider.runCommandWithCheck.onCall(1).rejects(expectedError);
        const caughtError = await shard
          .removeShardTag('shard', 'zone')
          .catch((e) => e);
        expect(caughtError).to.equal(expectedError);
      });
      it('throws if not mongos', async function () {
        const expectedResult = { ok: 1 };
        serviceProvider.runCommandWithCheck
          .onCall(0)
          .resolves({ ok: 1, msg: 'not dbgrid' });
        serviceProvider.runCommandWithCheck.onCall(1).resolves(expectedResult);
        await shard.removeShardTag('shard', 'zone');
        expect(warnSpy.calledOnce).to.equal(true);
      });
      it('adds version suggestion if command not found', async function () {
        serviceProvider.runCommandWithCheck
          .onCall(0)
          .resolves({ ok: 1, msg: 'isdbgrid' });
        const expectedError = new Error();
        (expectedError as any).codeName = 'CommandNotFound';
        serviceProvider.runCommandWithCheck.onCall(1).rejects(expectedError);
        const caughtError = await shard
          .removeShardTag('shard', 'tag')
          .catch((e) => e);
        expect(caughtError.message).to.include('> 3.4');
      });
    });
    describe('enableAutoSplit', function () {
      it('calls serviceProvider.updateOne', async function () {
        serviceProvider.runCommandWithCheck.resolves({
          ok: 1,
          msg: 'isdbgrid',
        });
        const expectedResult = {
          matchedCount: 1,
          modifiedCount: 1,
          upsertedCount: 1,
          upsertedId: { _id: 0 },
          result: { ok: 1, n: 1, nModified: 1 },
          connection: null,
        } as any;
        serviceProvider.updateOne.resolves(expectedResult);
        await shard.enableAutoSplit();

        expect(serviceProvider.updateOne).to.have.been.calledWith(
          'config',
          'settings',
          { _id: 'autosplit' },
          { $set: { enabled: true } },
          { upsert: true, writeConcern: { w: 'majority', wtimeout: 30000 } }
        );
      });

      it('returns whatever serviceProvider.updateOne returns', async function () {
        serviceProvider.runCommandWithCheck.resolves({
          ok: 1,
          msg: 'isdbgrid',
        });
        const oid = new bson.ObjectId();
        const expectedResult = {
          matchedCount: 1,
          modifiedCount: 1,
          upsertedCount: 1,
          upsertedId: oid,
          result: { ok: 1, n: 1, nModified: 1 },
          connection: null,
          acknowledged: true,
        } as any;
        serviceProvider.updateOne.resolves(expectedResult);
        const result = await shard.enableAutoSplit();
        expect(result).to.deep.equal(new UpdateResult(true, 1, 1, 1, oid));
      });

      it('throws if serviceProvider.updateOne rejects', async function () {
        serviceProvider.runCommandWithCheck.resolves({
          ok: 1,
          msg: 'isdbgrid',
        });
        const expectedError = new Error();
        serviceProvider.updateOne.rejects(expectedError);
        const caughtError = await shard.enableAutoSplit().catch((e) => e);
        expect(caughtError).to.equal(expectedError);
      });

      it('throws if not mongos', async function () {
        const expectedResult = { acknowledged: 1 } as any;
        serviceProvider.runCommandWithCheck.resolves({
          ok: 1,
          msg: 'not dbgrid',
        });
        serviceProvider.updateOne.resolves(expectedResult);
        await shard.enableAutoSplit();
        expect(warnSpy.calledOnce).to.equal(true);
      });

      it('prints a deprecation warning for mongodb >= 6.0.3', async function () {
        serviceProvider.getConnectionInfo.resolves({
          extraInfo: { uri: '' },
          buildInfo: { version: '6.0.3-alpha0' },
        });
        serviceProvider.runCommandWithCheck.resolves({ ok: 1 });
        serviceProvider.updateOne.resolves({ acknowledged: 1 } as any);
        await shard.enableAutoSplit();
        expect(warnSpy.calledOnce).to.equal(true);
      });
    });
    describe('disableAutoSplit', function () {
      it('calls serviceProvider.updateOne', async function () {
        serviceProvider.runCommandWithCheck.resolves({
          ok: 1,
          msg: 'isdbgrid',
        });
        const expectedResult = {
          matchedCount: 1,
          modifiedCount: 1,
          upsertedCount: 1,
          upsertedId: { _id: 0 },
          result: { ok: 1, n: 1, nModified: 1 },
          connection: null,
          acknowledged: true,
        } as any;
        serviceProvider.updateOne.resolves(expectedResult);
        await shard.disableAutoSplit();

        expect(serviceProvider.updateOne).to.have.been.calledWith(
          'config',
          'settings',
          { _id: 'autosplit' },
          { $set: { enabled: false } },
          { upsert: true, writeConcern: { w: 'majority', wtimeout: 30000 } }
        );
      });

      it('returns whatever serviceProvider.updateOne returns', async function () {
        serviceProvider.runCommandWithCheck.resolves({
          ok: 1,
          msg: 'isdbgrid',
        });
        const oid = new bson.ObjectId();
        const expectedResult = {
          matchedCount: 1,
          modifiedCount: 1,
          upsertedCount: 1,
          upsertedId: oid,
          result: { ok: 1, n: 1, nModified: 1 },
          connection: null,
          acknowledged: true,
        } as any;
        serviceProvider.updateOne.resolves(expectedResult);
        const result = await shard.disableAutoSplit();
        expect(result).to.deep.equal(new UpdateResult(true, 1, 1, 1, oid));
      });

      it('throws if serviceProvider.updateOne rejects', async function () {
        serviceProvider.runCommandWithCheck.resolves({
          ok: 1,
          msg: 'isdbgrid',
        });
        const expectedError = new Error();
        serviceProvider.updateOne.rejects(expectedError);
        const caughtError = await shard.disableAutoSplit().catch((e) => e);
        expect(caughtError).to.equal(expectedError);
      });

      it('throws if not mongos', async function () {
        const expectedResult = { ok: 1 } as any;
        serviceProvider.runCommandWithCheck.resolves({
          ok: 1,
          msg: 'not dbgrid',
        });
        serviceProvider.updateOne.resolves(expectedResult);
        await shard.disableAutoSplit();
        expect(warnSpy.calledOnce).to.equal(true);
      });

      it('prints a deprecation warning for mongodb >= 6.0.3', async function () {
        serviceProvider.getConnectionInfo.resolves({
          extraInfo: { uri: '' },
          buildInfo: { version: '6.0.3-alpha0' },
        });
        serviceProvider.runCommandWithCheck.resolves({ ok: 1 });
        serviceProvider.updateOne.resolves({ acknowledged: 1 } as any);
        await shard.disableAutoSplit();
        expect(warnSpy.calledOnce).to.equal(true);
      });
    });
    describe('splitAt', function () {
      it('calls serviceProvider.runCommandWithCheck with arg', async function () {
        serviceProvider.runCommandWithCheck.resolves({
          ok: 1,
          msg: 'isdbgrid',
        });
        await shard.splitAt('ns', { query: 1 });

        expect(serviceProvider.runCommandWithCheck).to.have.been.calledWith(
          ADMIN_DB,
          {
            split: 'ns',
            middle: {
              query: 1,
            },
          }
        );
      });

      it('returns whatever serviceProvider.runCommandWithCheck returns', async function () {
        const expectedResult = { ok: 1 };
        serviceProvider.runCommandWithCheck.resolves(expectedResult);
        const result = await shard.splitAt('ns', { query: 1 });
        expect(result).to.deep.equal(expectedResult);
      });

      it('throws if serviceProvider.runCommandWithCheck rejects', async function () {
        const expectedError = new Error();
        serviceProvider.runCommandWithCheck.rejects(expectedError);
        const caughtError = await shard
          .splitAt('ns', { query: 1 })
          .catch((e) => e);
        expect(caughtError).to.equal(expectedError);
      });
    });
    describe('splitFind', function () {
      it('calls serviceProvider.runCommandWithCheck with arg', async function () {
        serviceProvider.runCommandWithCheck.resolves({
          ok: 1,
          msg: 'isdbgrid',
        });
        await shard.splitFind('ns', { query: 1 });

        expect(serviceProvider.runCommandWithCheck).to.have.been.calledWith(
          ADMIN_DB,
          {
            split: 'ns',
            find: {
              query: 1,
            },
          }
        );
      });

      it('returns whatever serviceProvider.runCommandWithCheck returns', async function () {
        const expectedResult = { ok: 1 };
        serviceProvider.runCommandWithCheck.resolves(expectedResult);
        const result = await shard.splitFind('ns', { query: 1 });
        expect(result).to.deep.equal(expectedResult);
      });

      it('throws if serviceProvider.runCommandWithCheck rejects', async function () {
        const expectedError = new Error();
        serviceProvider.runCommandWithCheck.rejects(expectedError);
        const caughtError = await shard
          .splitFind('ns', { query: 1 })
          .catch((e) => e);
        expect(caughtError).to.equal(expectedError);
      });
    });
    describe('moveChunk', function () {
      it('calls serviceProvider.runCommandWithCheck with arg', async function () {
        serviceProvider.runCommandWithCheck.resolves({
          ok: 1,
          msg: 'isdbgrid',
        });
        await shard.moveChunk('ns', { query: 1 }, 'destination');

        expect(serviceProvider.runCommandWithCheck).to.have.been.calledWith(
          ADMIN_DB,
          {
            moveChunk: 'ns',
            find: { query: 1 },
            to: 'destination',
          }
        );
      });

      it('returns whatever serviceProvider.runCommandWithCheck returns', async function () {
        const expectedResult = { ok: 1 };
        serviceProvider.runCommandWithCheck.resolves(expectedResult);
        const result = await shard.moveChunk('ns', { query: 1 }, 'destination');
        expect(result).to.deep.equal(expectedResult);
      });

      it('throws if serviceProvider.runCommandWithCheck rejects', async function () {
        const expectedError = new Error();
        serviceProvider.runCommandWithCheck.rejects(expectedError);
        const caughtError = await shard
          .moveChunk('ns', { query: 1 }, 'destination')
          .catch((e) => e);
        expect(caughtError).to.equal(expectedError);
      });
    });
    describe('balancerCollectionStatus', function () {
      it('calls serviceProvider.runCommandWithCheck with arg', async function () {
        await shard.balancerCollectionStatus('ns');

        expect(serviceProvider.runCommandWithCheck).to.have.been.calledWith(
          ADMIN_DB,
          {
            balancerCollectionStatus: 'ns',
          }
        );
      });

      it('returns whatever serviceProvider.runCommandWithCheck returns', async function () {
        const expectedResult = { ok: 1 };
        serviceProvider.runCommandWithCheck.resolves(expectedResult);
        const result = await shard.balancerCollectionStatus('ns');
        expect(result).to.deep.equal(expectedResult);
      });

      it('throws if serviceProvider.runCommandWithCheck rejects', async function () {
        const expectedError = new Error();
        serviceProvider.runCommandWithCheck.rejects(expectedError);
        const caughtError = await shard
          .balancerCollectionStatus('ns')
          .catch((e) => e);
        expect(caughtError).to.equal(expectedError);
      });
    });
    describe('disableBalancing', function () {
      it('calls serviceProvider.updateOne', async function () {
        serviceProvider.runCommandWithCheck.resolves({
          ok: 1,
          msg: 'isdbgrid',
        });
        const expectedResult = {
          matchedCount: 1,
          modifiedCount: 1,
          upsertedCount: 1,
          upsertedId: { _id: 0 },
          result: { ok: 1, n: 1, nModified: 1 },
          connection: null,
        } as any;
        serviceProvider.updateOne.resolves(expectedResult);
        await shard.disableBalancing('ns');

        expect(serviceProvider.updateOne).to.have.been.calledWith(
          'config',
          'collections',
          { _id: 'ns' },
          { $set: { noBalance: true } },
          { writeConcern: { w: 'majority', wtimeout: 60000 } }
        );
      });

      it('returns whatever serviceProvider.updateOne returns', async function () {
        serviceProvider.runCommandWithCheck.resolves({
          ok: 1,
          msg: 'isdbgrid',
        });
        const oid = new bson.ObjectId();
        const expectedResult = {
          matchedCount: 1,
          modifiedCount: 1,
          upsertedCount: 1,
          upsertedId: oid,
          result: { ok: 1, n: 1, nModified: 1 },
          connection: null,
          acknowledged: true,
        } as any;
        serviceProvider.updateOne.resolves(expectedResult);
        const result = await shard.disableBalancing('ns');
        expect(result).to.deep.equal(new UpdateResult(true, 1, 1, 1, oid));
      });

      it('throws if serviceProvider.updateOne rejects', async function () {
        serviceProvider.runCommandWithCheck.resolves({
          ok: 1,
          msg: 'isdbgrid',
        });
        const expectedError = new Error();
        serviceProvider.updateOne.rejects(expectedError);
        const caughtError = await shard.disableBalancing('ns').catch((e) => e);
        expect(caughtError).to.equal(expectedError);
      });

      it('throws if not mongos', async function () {
        const expectedResult = { ok: 1 } as any;
        serviceProvider.runCommandWithCheck.resolves({
          ok: 1,
          msg: 'not dbgrid',
        });
        serviceProvider.updateOne.resolves(expectedResult);
        await shard.disableBalancing('ns');
        expect(warnSpy.calledOnce).to.equal(true);
      });
    });
    describe('enableBalancing', function () {
      it('calls serviceProvider.updateOne', async function () {
        serviceProvider.runCommandWithCheck.resolves({
          ok: 1,
          msg: 'isdbgrid',
        });
        const expectedResult = {
          matchedCount: 1,
          modifiedCount: 1,
          upsertedCount: 1,
          upsertedId: { _id: 0 },
          result: { ok: 1, n: 1, nModified: 1 },
          connection: null,
        } as any;
        serviceProvider.updateOne.resolves(expectedResult);
        await shard.enableBalancing('ns');

        expect(serviceProvider.updateOne).to.have.been.calledWith(
          'config',
          'collections',
          { _id: 'ns' },
          { $set: { noBalance: false } },
          { writeConcern: { w: 'majority', wtimeout: 60000 } }
        );
      });

      it('returns whatever serviceProvider.updateOne returns', async function () {
        serviceProvider.runCommandWithCheck.resolves({
          ok: 1,
          msg: 'isdbgrid',
        });
        const oid = new bson.ObjectId();
        const expectedResult = {
          matchedCount: 1,
          modifiedCount: 1,
          upsertedCount: 1,
          upsertedId: oid,
          result: { ok: 1, n: 1, nModified: 1 },
          connection: null,
          acknowledged: true,
        } as any;
        serviceProvider.updateOne.resolves(expectedResult);
        const result = await shard.enableBalancing('ns');
        expect(result).to.deep.equal(new UpdateResult(true, 1, 1, 1, oid));
      });

      it('throws if serviceProvider.updateOne rejects', async function () {
        serviceProvider.runCommandWithCheck.resolves({
          ok: 1,
          msg: 'isdbgrid',
        });
        const expectedError = new Error();
        serviceProvider.updateOne.rejects(expectedError);
        const caughtError = await shard.enableBalancing('ns').catch((e) => e);
        expect(caughtError).to.equal(expectedError);
      });

      it('throws if not mongos', async function () {
        const expectedResult = { ok: 1 } as any;
        serviceProvider.runCommandWithCheck.resolves({
          ok: 1,
          msg: 'not dbgrid',
        });
        serviceProvider.updateOne.resolves(expectedResult);
        await shard.enableBalancing('ns');
        expect(warnSpy.calledOnce).to.equal(true);
      });
    });
    describe('getBalancerState', function () {
      it('returns whatever serviceProvider.find returns', async function () {
        serviceProvider.runCommandWithCheck.resolves({
          ok: 1,
          msg: 'isdbgrid',
        });
        const expectedResult = { stopped: true };
        const findCursor = stubInterface<ServiceProviderCursor>();
        findCursor.tryNext.resolves(expectedResult);
        serviceProvider.find.returns(findCursor);
        const result = await shard.getBalancerState();
        expect(serviceProvider.find).to.have.been.calledWith(
          'config',
          'settings',
          { _id: 'balancer' },
          {}
        );
        expect(result).to.deep.equal(!expectedResult.stopped);
      });

      it('throws if serviceProvider.find rejects', async function () {
        serviceProvider.runCommandWithCheck.resolves({
          ok: 1,
          msg: 'isdbgrid',
        });
        const expectedError = new Error();
        serviceProvider.find.throws(expectedError);
        const caughtError = await shard.getBalancerState().catch((e) => e);
        expect(caughtError).to.equal(expectedError);
      });

      it('throws if not mongos', async function () {
        const expectedResult = { ok: 1 };
        serviceProvider.runCommandWithCheck.resolves({
          ok: 1,
          msg: 'not dbgrid',
        });
        const findCursor = stubInterface<ServiceProviderCursor>();
        findCursor.tryNext.resolves(expectedResult);
        serviceProvider.find.returns(findCursor);
        await shard.getBalancerState();
        expect(warnSpy.calledOnce).to.equal(true);
      });
    });
    describe('isBalancerRunning', function () {
      it('calls serviceProvider.runCommandWithCheck', async function () {
        serviceProvider.runCommandWithCheck.resolves({
          ok: 1,
          msg: 'isdbgrid',
        });
        await shard.isBalancerRunning();

        expect(serviceProvider.runCommandWithCheck).to.have.been.calledWith(
          ADMIN_DB,
          {
            balancerStatus: 1,
          }
        );
      });

      it('returns whatever serviceProvider.runCommandWithCheck returns', async function () {
        serviceProvider.runCommandWithCheck
          .onCall(0)
          .resolves({ ok: 1, msg: 'isdbgrid' });
        const expectedResult = { ok: 1 };
        serviceProvider.runCommandWithCheck.onCall(1).resolves(expectedResult);
        const result = await shard.isBalancerRunning();
        expect(result).to.deep.equal(expectedResult);
      });

      it('throws if serviceProvider.runCommandWithCheck rejects', async function () {
        serviceProvider.runCommandWithCheck
          .onCall(0)
          .resolves({ ok: 1, msg: 'isdbgrid' });
        const expectedError = new Error();
        serviceProvider.runCommandWithCheck.onCall(1).rejects(expectedError);
        const caughtError = await shard.isBalancerRunning().catch((e) => e);
        expect(caughtError).to.equal(expectedError);
      });
      it('throws if not mongos', async function () {
        const expectedResult = { ok: 1 };
        serviceProvider.runCommandWithCheck
          .onCall(0)
          .resolves({ ok: 1, msg: 'not dbgrid' });
        serviceProvider.runCommandWithCheck.onCall(1).resolves(expectedResult);
        await shard.isBalancerRunning();
        expect(warnSpy.calledOnce).to.equal(true);
      });
    });
    describe('startBalancer', function () {
      it('calls serviceProvider.runCommandWithCheck with arg', async function () {
        await shard.startBalancer(10000);

        expect(serviceProvider.runCommandWithCheck).to.have.been.calledWith(
          ADMIN_DB,
          {
            balancerStart: 1,
            maxTimeMS: 10000,
          }
        );
      });
      it('calls serviceProvider.runCommandWithCheck with no arg', async function () {
        await shard.startBalancer();

        expect(serviceProvider.runCommandWithCheck).to.have.been.calledWith(
          ADMIN_DB,
          {
            balancerStart: 1,
            maxTimeMS: 60000,
          }
        );
      });

      it('returns whatever serviceProvider.runCommandWithCheck returns', async function () {
        const expectedResult = { ok: 1 };
        serviceProvider.runCommandWithCheck.resolves(expectedResult);
        const result = await shard.startBalancer(10000);
        expect(result).to.deep.equal(expectedResult);
      });

      it('throws if serviceProvider.runCommandWithCheck rejects', async function () {
        const expectedError = new Error();
        serviceProvider.runCommandWithCheck.rejects(expectedError);
        const caughtError = await shard.startBalancer(10000).catch((e) => e);
        expect(caughtError).to.equal(expectedError);
      });
    });
    describe('stopBalancer', function () {
      it('calls serviceProvider.runCommandWithCheck with arg', async function () {
        await shard.stopBalancer(10000);

        expect(serviceProvider.runCommandWithCheck).to.have.been.calledWith(
          ADMIN_DB,
          {
            balancerStop: 1,
            maxTimeMS: 10000,
          }
        );
      });
      it('calls serviceProvider.runCommandWithCheck with no arg', async function () {
        await shard.stopBalancer();

        expect(serviceProvider.runCommandWithCheck).to.have.been.calledWith(
          ADMIN_DB,
          {
            balancerStop: 1,
            maxTimeMS: 60000,
          }
        );
      });

      it('returns whatever serviceProvider.runCommandWithCheck returns', async function () {
        const expectedResult = { ok: 1 };
        serviceProvider.runCommandWithCheck.resolves(expectedResult);
        const result = await shard.stopBalancer(10000);
        expect(result).to.deep.equal(expectedResult);
      });

      it('throws if serviceProvider.runCommandWithCheck rejects', async function () {
        const expectedError = new Error();
        serviceProvider.runCommandWithCheck.rejects(expectedError);
        const caughtError = await shard.stopBalancer(10000).catch((e) => e);
        expect(caughtError).to.equal(expectedError);
      });
    });
    describe('setBalancerState', function () {
      it('calls serviceProvider.runCommandWithCheck with arg=true', async function () {
        const expectedResult = { ok: 1 };
        serviceProvider.runCommandWithCheck.resolves(expectedResult);
        const result = await shard.setBalancerState(true);

        expect(serviceProvider.runCommandWithCheck).to.have.been.calledWith(
          ADMIN_DB,
          {
            balancerStart: 1,
            maxTimeMS: 60000,
          }
        );
        expect(result).to.deep.equal(expectedResult);
      });
      it('calls serviceProvider.runCommandWithCheck with arg=false', async function () {
        const expectedResult = { ok: 1 };
        serviceProvider.runCommandWithCheck.resolves(expectedResult);
        const result = await shard.setBalancerState(false);

        expect(serviceProvider.runCommandWithCheck).to.have.been.calledWith(
          ADMIN_DB,
          {
            balancerStop: 1,
            maxTimeMS: 60000,
          }
        );
        expect(result).to.deep.equal(expectedResult);
      });

      it('throws if serviceProvider.runCommandWithCheck rejects', async function () {
        const expectedError = new Error();
        serviceProvider.runCommandWithCheck.rejects(expectedError);
        const caughtError = await shard.setBalancerState(true).catch((e) => e);
        expect(caughtError).to.equal(expectedError);
      });
    });
    describe('getShardedDataDistribution', function () {
      it('throws if aggregateDb fails', async function () {
        serviceProvider.aggregateDb.throws(new Error('err'));
        const error: any = await shard
          .getShardedDataDistribution()
          .catch((err) => err);
        expect(error.message).to.be.equal('err');
      });

      it('throws if not mongos', async function () {
        const serviceProviderCursor = stubInterface<ServiceProviderAggCursor>();
        serviceProvider.aggregateDb.returns(serviceProviderCursor as any);
        serviceProviderCursor.hasNext.throws(
          Object.assign(new Error(), {
            code: 40324,
            message:
              "Unrecognized pipeline stage name: '$shardedDataDistribution'",
          })
        );
        const error: any = await shard
          .getShardedDataDistribution()
          .catch((err) => err);
        expect(error.message).to.match(
          /sh\.getShardedDataDistribution only works on mongos and MongoDB server versions greater than 6\.0\.3 \[Original Error: Unrecognized pipeline stage name: '\$shardedDataDistribution']/
        );
      });
    });

    describe('startAutoMerger', function () {
      it('calls serviceProvider.updateOne', async function () {
        serviceProvider.runCommandWithCheck.resolves({
          ok: 1,
          msg: 'isdbgrid',
        });
        const expectedResult = {
          matchedCount: 1,
          modifiedCount: 1,
          upsertedCount: 1,
          upsertedId: { _id: 0 },
          result: { ok: 1, n: 1, nModified: 1 },
          connection: null,
        } as any;
        serviceProvider.updateOne.resolves(expectedResult);
        await shard.startAutoMerger();

        expect(serviceProvider.updateOne).to.have.been.calledWith(
          'config',
          'settings',
          { _id: 'automerge' },
          { $set: { enabled: true } },
          { upsert: true, writeConcern: { w: 'majority', wtimeout: 30000 } }
        );
      });

      it('returns whatever serviceProvider.updateOne returns', async function () {
        serviceProvider.runCommandWithCheck.resolves({
          ok: 1,
          msg: 'isdbgrid',
        });
        const oid = new bson.ObjectId();
        const expectedResult = {
          matchedCount: 1,
          modifiedCount: 1,
          upsertedCount: 1,
          upsertedId: oid,
          result: { ok: 1, n: 1, nModified: 1 },
          connection: null,
          acknowledged: true,
        } as any;
        serviceProvider.updateOne.resolves(expectedResult);
        const result = await shard.startAutoMerger();
        expect(result).to.deep.equal(new UpdateResult(true, 1, 1, 1, oid));
      });

      it('throws if serviceProvider.updateOne rejects', async function () {
        serviceProvider.runCommandWithCheck.resolves({
          ok: 1,
          msg: 'isdbgrid',
        });
        const expectedError = new Error();
        serviceProvider.updateOne.rejects(expectedError);
        const caughtError = await shard.startAutoMerger().catch((e) => e);
        expect(caughtError).to.equal(expectedError);
      });

      it('throws if not mongos', async function () {
        const expectedResult = { acknowledged: 1 } as any;
        serviceProvider.runCommandWithCheck.resolves({
          ok: 1,
          msg: 'not dbgrid',
        });
        serviceProvider.updateOne.resolves(expectedResult);
        await shard.startAutoMerger();
        expect(warnSpy.calledOnce).to.equal(true);
      });
    });

    describe('stopAutoMerger', function () {
      it('calls serviceProvider.updateOne', async function () {
        serviceProvider.runCommandWithCheck.resolves({
          ok: 1,
          msg: 'isdbgrid',
        });
        const expectedResult = {
          matchedCount: 1,
          modifiedCount: 1,
          upsertedCount: 1,
          upsertedId: { _id: 0 },
          result: { ok: 1, n: 1, nModified: 1 },
          connection: null,
        } as any;
        serviceProvider.updateOne.resolves(expectedResult);
        await shard.stopAutoMerger();

        expect(serviceProvider.updateOne).to.have.been.calledWith(
          'config',
          'settings',
          { _id: 'automerge' },
          { $set: { enabled: false } },
          { upsert: true, writeConcern: { w: 'majority', wtimeout: 30000 } }
        );
      });

      it('returns whatever serviceProvider.updateOne returns', async function () {
        serviceProvider.runCommandWithCheck.resolves({
          ok: 1,
          msg: 'isdbgrid',
        });
        const oid = new bson.ObjectId();
        const expectedResult = {
          matchedCount: 1,
          modifiedCount: 1,
          upsertedCount: 1,
          upsertedId: oid,
          result: { ok: 1, n: 1, nModified: 1 },
          connection: null,
          acknowledged: true,
        } as any;
        serviceProvider.updateOne.resolves(expectedResult);
        const result = await shard.stopAutoMerger();
        expect(result).to.deep.equal(new UpdateResult(true, 1, 1, 1, oid));
      });

      it('throws if serviceProvider.updateOne rejects', async function () {
        serviceProvider.runCommandWithCheck.resolves({
          ok: 1,
          msg: 'isdbgrid',
        });
        const expectedError = new Error();
        serviceProvider.updateOne.rejects(expectedError);
        const caughtError = await shard.stopAutoMerger().catch((e) => e);
        expect(caughtError).to.equal(expectedError);
      });

      it('throws if not mongos', async function () {
        const expectedResult = { acknowledged: 1 } as any;
        serviceProvider.runCommandWithCheck.resolves({
          ok: 1,
          msg: 'not dbgrid',
        });
        serviceProvider.updateOne.resolves(expectedResult);
        await shard.stopAutoMerger();
        expect(warnSpy.calledOnce).to.equal(true);
      });
    });

    describe('isAutoMergerEnabled', function () {
      it('returns whatever serviceProvider.find returns', async function () {
        serviceProvider.runCommandWithCheck.resolves({
          ok: 1,
          msg: 'isdbgrid',
        });
        const expectedResult = { enabled: true };
        const findCursor = stubInterface<ServiceProviderCursor>();
        findCursor.tryNext.resolves(expectedResult);
        serviceProvider.find.returns(findCursor);
        const result = await shard.isAutoMergerEnabled();
        expect(serviceProvider.find).to.have.been.calledWith(
          'config',
          'settings',
          { _id: 'automerge' },
          {}
        );
        expect(result).to.deep.equal(expectedResult.enabled);
      });

      it('throws if serviceProvider.find rejects', async function () {
        serviceProvider.runCommandWithCheck.resolves({
          ok: 1,
          msg: 'isdbgrid',
        });
        const expectedError = new Error();
        serviceProvider.find.throws(expectedError);
        const caughtError = await shard.isAutoMergerEnabled().catch((e) => e);
        expect(caughtError).to.equal(expectedError);
      });

      it('throws if not mongos', async function () {
        const expectedResult = { ok: 1 };
        serviceProvider.runCommandWithCheck.resolves({
          ok: 1,
          msg: 'not dbgrid',
        });
        const findCursor = stubInterface<ServiceProviderCursor>();
        findCursor.tryNext.resolves(expectedResult);
        serviceProvider.find.returns(findCursor);
        await shard.isAutoMergerEnabled();
        expect(warnSpy.calledOnce).to.equal(true);
      });
    });

    describe('disableAutoMerger', function () {
      it('calls serviceProvider.updateOne', async function () {
        serviceProvider.runCommandWithCheck.resolves({
          ok: 1,
          msg: 'isdbgrid',
        });
        const expectedResult = {
          matchedCount: 1,
          modifiedCount: 1,
          upsertedCount: 1,
          upsertedId: { _id: 0 },
          result: { ok: 1, n: 1, nModified: 1 },
          connection: null,
        } as any;
        serviceProvider.updateOne.resolves(expectedResult);
        await shard.disableAutoMerger('ns');

        expect(serviceProvider.updateOne).to.have.been.calledWith(
          'config',
          'collections',
          { _id: 'ns' },
          { $set: { enableAutoMerge: false } },
          { writeConcern: { w: 'majority', wtimeout: 60000 } }
        );
      });

      it('returns whatever serviceProvider.updateOne returns', async function () {
        serviceProvider.runCommandWithCheck.resolves({
          ok: 1,
          msg: 'isdbgrid',
        });
        const oid = new bson.ObjectId();
        const expectedResult = {
          matchedCount: 1,
          modifiedCount: 1,
          upsertedCount: 1,
          upsertedId: oid,
          result: { ok: 1, n: 1, nModified: 1 },
          connection: null,
          acknowledged: true,
        } as any;
        serviceProvider.updateOne.resolves(expectedResult);
        const result = await shard.disableAutoMerger('ns');
        expect(result).to.deep.equal(new UpdateResult(true, 1, 1, 1, oid));
      });

      it('throws if serviceProvider.updateOne rejects', async function () {
        serviceProvider.runCommandWithCheck.resolves({
          ok: 1,
          msg: 'isdbgrid',
        });
        const expectedError = new Error();
        serviceProvider.updateOne.rejects(expectedError);
        const caughtError = await shard.disableAutoMerger('ns').catch((e) => e);
        expect(caughtError).to.equal(expectedError);
      });

      it('throws if not mongos', async function () {
        const expectedResult = { ok: 1 } as any;
        serviceProvider.runCommandWithCheck.resolves({
          ok: 1,
          msg: 'not dbgrid',
        });
        serviceProvider.updateOne.resolves(expectedResult);
        await shard.disableAutoMerger('ns');
        expect(warnSpy.calledOnce).to.equal(true);
      });
    });

    describe('enableAutoMerger', function () {
      it('calls serviceProvider.updateOne', async function () {
        serviceProvider.runCommandWithCheck.resolves({
          ok: 1,
          msg: 'isdbgrid',
        });
        const expectedResult = {
          matchedCount: 1,
          modifiedCount: 1,
          upsertedCount: 1,
          upsertedId: { _id: 0 },
          result: { ok: 1, n: 1, nModified: 1 },
          connection: null,
        } as any;
        serviceProvider.updateOne.resolves(expectedResult);
        await shard.enableAutoMerger('ns');

        expect(serviceProvider.updateOne).to.have.been.calledWith(
          'config',
          'collections',
          { _id: 'ns' },
          { $unset: { enableAutoMerge: 1 } },
          { writeConcern: { w: 'majority', wtimeout: 60000 } }
        );
      });

      it('returns whatever serviceProvider.updateOne returns', async function () {
        serviceProvider.runCommandWithCheck.resolves({
          ok: 1,
          msg: 'isdbgrid',
        });
        const oid = new bson.ObjectId();
        const expectedResult = {
          matchedCount: 1,
          modifiedCount: 1,
          upsertedCount: 1,
          upsertedId: oid,
          result: { ok: 1, n: 1, nModified: 1 },
          connection: null,
          acknowledged: true,
        } as any;
        serviceProvider.updateOne.resolves(expectedResult);
        const result = await shard.enableAutoMerger('ns');
        expect(result).to.deep.equal(new UpdateResult(true, 1, 1, 1, oid));
      });

      it('throws if serviceProvider.updateOne rejects', async function () {
        serviceProvider.runCommandWithCheck.resolves({
          ok: 1,
          msg: 'isdbgrid',
        });
        const expectedError = new Error();
        serviceProvider.updateOne.rejects(expectedError);
        const caughtError = await shard.disableBalancing('ns').catch((e) => e);
        expect(caughtError).to.equal(expectedError);
      });

      it('throws if not mongos', async function () {
        const expectedResult = { ok: 1 } as any;
        serviceProvider.runCommandWithCheck.resolves({
          ok: 1,
          msg: 'not dbgrid',
        });
        serviceProvider.updateOne.resolves(expectedResult);
        await shard.enableAutoMerger('ns');
        expect(warnSpy.calledOnce).to.equal(true);
      });
    });

    describe('checkMetadataConsistency', function () {
      it('calls serviceProvider.runCursorCommand and returns a RunCommandCursor', async function () {
        const providerCursor = stubInterface<ServiceProviderRunCommandCursor>();
        serviceProvider.runCursorCommand.returns(providerCursor);
        const runCommandCursor = await shard.checkMetadataConsistency();
        expect(runCommandCursor._cursor).to.equal(providerCursor);
        expect(serviceProvider.runCursorCommand).to.have.been.calledWith(
          'admin',
          { checkMetadataConsistency: 1 },
          {}
        );
      });
    });

    describe('shardAndDistributeCollection', function () {
      it('calls shardCollection and then reshardCollection with correct parameters', async function () {
        const expectedResult = { ok: 1 };

        const shardCollectionStub = sinon
          .stub(shard, 'shardCollection')
          .resolves(expectedResult);
        const reshardCollectionStub = sinon
          .stub(shard, 'reshardCollection')
          .resolves(expectedResult);

        await shard.shardAndDistributeCollection(
          'db.coll',
          { key: 1 },
          true,
          {}
        );

        expect(shardCollectionStub.calledOnce).to.equal(true);
        expect(shardCollectionStub.firstCall.args).to.deep.equal([
          'db.coll',
          {
            key: 1,
          },
          true,
          {},
        ]);

        expect(reshardCollectionStub.calledOnce).to.equal(true);
        expect(reshardCollectionStub.firstCall.args).to.deep.equal([
          'db.coll',
          { key: 1 },
          { forceRedistribution: true },
        ]);
      });

      it('allows user to pass numInitialChunks', async function () {
        const expectedResult = { ok: 1 };

        const shardCollectionStub = sinon
          .stub(shard, 'shardCollection')
          .resolves(expectedResult);
        const reshardCollectionStub = sinon
          .stub(shard, 'reshardCollection')
          .resolves(expectedResult);

        await shard.shardAndDistributeCollection('db.coll', { key: 1 }, true, {
          numInitialChunks: 1,
        });

        expect(shardCollectionStub.calledOnce).to.equal(true);
        expect(shardCollectionStub.firstCall.args).to.deep.equal([
          'db.coll',
          {
            key: 1,
          },
          true,
          {
            numInitialChunks: 1,
          },
        ]);

        expect(reshardCollectionStub.calledOnce).to.equal(true);
        expect(reshardCollectionStub.firstCall.args).to.deep.equal([
          'db.coll',
          { key: 1 },
          { numInitialChunks: 1, forceRedistribution: true },
        ]);
      });

      it('allows user to pass collation', async function () {
        const expectedResult = { ok: 1 };

        const shardCollectionStub = sinon
          .stub(shard, 'shardCollection')
          .resolves(expectedResult);
        const reshardCollectionStub = sinon
          .stub(shard, 'reshardCollection')
          .resolves(expectedResult);

        await shard.shardAndDistributeCollection('db.coll', { key: 1 }, true, {
          collation: { locale: 'simple' },
        });

        expect(shardCollectionStub.calledOnce).to.equal(true);
        expect(shardCollectionStub.firstCall.args).to.deep.equal([
          'db.coll',
          {
            key: 1,
          },
          true,
          {
            collation: { locale: 'simple' },
          },
        ]);

        expect(reshardCollectionStub.calledOnce).to.equal(true);
        expect(reshardCollectionStub.firstCall.args).to.deep.equal([
          'db.coll',
          { key: 1 },
          { collation: { locale: 'simple' }, forceRedistribution: true },
        ]);
      });

      it('allows user to pass shard-specific options and ignores them when resharding', async function () {
        const expectedResult = { ok: 1 };

        const shardCollectionStub = sinon
          .stub(shard, 'shardCollection')
          .resolves(expectedResult);
        const reshardCollectionStub = sinon
          .stub(shard, 'reshardCollection')
          .resolves(expectedResult);

        await shard.shardAndDistributeCollection('db.coll', { key: 1 }, true, {
          presplitHashedZones: true,
          timeseries: {
            timeField: 'ts',
          },
        });

        expect(shardCollectionStub.calledOnce).to.equal(true);
        expect(shardCollectionStub.firstCall.args).to.deep.equal([
          'db.coll',
          {
            key: 1,
          },
          true,
          {
            presplitHashedZones: true,
            timeseries: {
              timeField: 'ts',
            },
          },
        ]);

        expect(reshardCollectionStub.calledOnce).to.equal(true);
        expect(reshardCollectionStub.firstCall.args).to.deep.equal([
          'db.coll',
          { key: 1 },
          { forceRedistribution: true },
        ]);
      });

      it('returns whatever shard.reshardCollection returns', async function () {
        const expectedResult = { ok: 1 };
        sinon.stub(shard, 'reshardCollection').resolves(expectedResult);
        const result = await shard.shardAndDistributeCollection('db.coll', {
          key: 1,
        });
        expect(result).to.deep.equal(expectedResult);
      });
    });

    describe('moveCollection', function () {
      it('calls serviceProvider.runCommandWithCheck', async function () {
        await shard.moveCollection('db.coll', 'shard1');
        expect(serviceProvider.runCommandWithCheck).to.have.been.calledWith(
          ADMIN_DB,
          {
            moveCollection: 'db.coll',
            toShard: 'shard1',
          }
        );
      });

      it('returns whatever serviceProvider.runCommandWithCheck returns', async function () {
        const expectedResult = { ok: 1 };
        serviceProvider.runCommandWithCheck.resolves(expectedResult);
        const result = await shard.moveCollection('db.coll', 'shard1');
        expect(result).to.deep.equal(expectedResult);
      });

      it('throws if serviceProvider.runCommandWithCheck rejects', async function () {
        const expectedError = new Error();
        serviceProvider.runCommandWithCheck.rejects(expectedError);
        const caughtError = await shard
          .moveCollection('db.coll', 'shard1')
          .catch((e) => e);
        expect(caughtError).to.equal(expectedError);
      });
    });

    describe('abortMoveCollection', function () {
      it('calls serviceProvider.runCommandWithCheck', async function () {
        await shard.abortMoveCollection('db.coll');
        expect(serviceProvider.runCommandWithCheck).to.have.been.calledWith(
          ADMIN_DB,
          {
            abortMoveCollection: 'db.coll',
          }
        );
      });

      it('returns whatever serviceProvider.runCommandWithCheck returns', async function () {
        const expectedResult = { ok: 1 };
        serviceProvider.runCommandWithCheck.resolves(expectedResult);
        const result = await shard.abortMoveCollection('db.coll');
        expect(result).to.deep.equal(expectedResult);
      });

      it('throws if serviceProvider.runCommandWithCheck rejects', async function () {
        const expectedError = new Error();
        serviceProvider.runCommandWithCheck.rejects(expectedError);
        const caughtError = await shard
          .abortMoveCollection('db.coll')
          .catch((e) => e);
        expect(caughtError).to.equal(expectedError);
      });
    });

    describe('unshardCollection', function () {
      it('calls serviceProvider.runCommandWithCheck', async function () {
        await shard.unshardCollection('db.coll', 'shard1');
        expect(serviceProvider.runCommandWithCheck).to.have.been.calledWith(
          ADMIN_DB,
          {
            unshardCollection: 'db.coll',
            toShard: 'shard1',
          }
        );
      });

      it('returns whatever serviceProvider.runCommandWithCheck returns', async function () {
        const expectedResult = { ok: 1 };
        serviceProvider.runCommandWithCheck.resolves(expectedResult);
        const result = await shard.unshardCollection('db.coll', 'shard1');
        expect(result).to.deep.equal(expectedResult);
      });

      it('throws if serviceProvider.runCommandWithCheck rejects', async function () {
        const expectedError = new Error();
        serviceProvider.runCommandWithCheck.rejects(expectedError);
        const caughtError = await shard
          .unshardCollection('db.coll', 'shard1')
          .catch((e) => e);
        expect(caughtError).to.equal(expectedError);
      });
    });

    describe('abortUnshardCollection', function () {
      it('calls serviceProvider.runCommandWithCheck', async function () {
        await shard.abortUnshardCollection('db.coll');
        expect(serviceProvider.runCommandWithCheck).to.have.been.calledWith(
          ADMIN_DB,
          {
            abortUnshardCollection: 'db.coll',
          }
        );
      });

      it('returns whatever serviceProvider.runCommandWithCheck returns', async function () {
        const expectedResult = { ok: 1 };
        serviceProvider.runCommandWithCheck.resolves(expectedResult);
        const result = await shard.abortUnshardCollection('db.coll');
        expect(result).to.deep.equal(expectedResult);
      });

      it('throws if serviceProvider.runCommandWithCheck rejects', async function () {
        const expectedError = new Error();
        serviceProvider.runCommandWithCheck.rejects(expectedError);
        const caughtError = await shard
          .abortUnshardCollection('db.coll')
          .catch((e) => e);
        expect(caughtError).to.equal(expectedError);
      });
    });

    describe('moveRange', function () {
      it('calls serviceProvider.runCommandWithCheck with arg', async function () {
        serviceProvider.runCommandWithCheck.resolves({
          ok: 1,
          msg: 'isdbgrid',
        });
        await shard.moveRange('ns', 'destination', { key: 0 }, { key: 10 });

        expect(serviceProvider.runCommandWithCheck).to.have.been.calledWith(
          ADMIN_DB,
          {
            moveRange: 'ns',
            min: { key: 0 },
            max: { key: 10 },
            toShard: 'destination',
          }
        );
      });

      it('returns whatever serviceProvider.runCommandWithCheck returns', async function () {
        const expectedResult = {
          ok: 1,
          operationTime: { $timestamp: { t: 1741189797, i: 1 } },
        };
        serviceProvider.runCommandWithCheck.resolves(expectedResult);
        const result = await shard.moveRange(
          'ns',
          'destination',
          { key: 0 },
          { key: 10 }
        );
        expect(result).to.deep.equal(expectedResult);
      });

      it('throws if serviceProvider.runCommandWithCheck rejects', async function () {
        const expectedError = new Error(
          "Missing required parameter 'min' or 'max'"
        );
        serviceProvider.runCommandWithCheck.rejects(expectedError);
        const caughtError = await shard
          .moveRange('ns', 'destination')
          .catch((e) => e);
        expect(caughtError).to.equal(expectedError);
      });
    });

    describe('listShards', function () {
      this.beforeEach(function () {
        serviceProvider.runCommandWithCheck.resolves({
          ok: 1,
          msg: 'isdbgrid',
        });
      });

      it('calls serviceProvider.runCommandWithCheck', async function () {
        await shard.listShards();

        expect(serviceProvider.runCommandWithCheck).to.have.been.calledWith(
          ADMIN_DB,
          {
            listShards: 1,
          }
        );
      });

      it('returns the shards returned by runCommandWithCheck', async function () {
        serviceProvider.runCommandWithCheck.resolves({
          ok: 1,
          msg: 'isdbgrid',
          shards: [
            {
              _id: 'shard1',
              host: 'shard1/foo.bar:27017',
            },
            {
              _id: 'shard2',
              host: 'shard2/foo.bar:27018',
            },
          ],
        });
        const result = await shard.listShards();
        expect(result).to.deep.equal([
          {
            _id: 'shard1',
            host: 'shard1/foo.bar:27017',
          },
          {
            _id: 'shard2',
            host: 'shard2/foo.bar:27018',
          },
        ]);
      });

      it('returns empty array when shards field is not present', async function () {
        const result = await shard.listShards();
        expect(result).to.deep.equal([]);
      });

      it('throws if serviceProvider.runCommandWithCheck rejects', async function () {
        const expectedError = new Error('unreachable');
        serviceProvider.runCommandWithCheck.rejects(expectedError);
        const caughtError = await shard.listShards().catch((e) => e);
        expect(caughtError).to.equal(expectedError);
      });

      it('throws if not mongos', async function () {
        serviceProvider.runCommandWithCheck.resolves({
          ok: 1,
          msg: 'not dbgrid',
        });
        await shard.listShards();
        expect(warnSpy.calledOnce).to.be.true;
      });
    });

    describe('isConfigShardEnabled', function () {
      this.beforeEach(function () {
        serviceProvider.runCommandWithCheck.resolves({
          ok: 1,
          msg: 'isdbgrid',
        });
      });

      it('calls serviceProvider.runCommandWithCheck', async function () {
        await shard.isConfigShardEnabled();

        expect(serviceProvider.runCommandWithCheck).to.have.been.calledWith(
          ADMIN_DB,
          {
            listShards: 1,
          }
        );
      });

      it("returns false when listShards doesn't contain config shard", async function () {
        serviceProvider.runCommandWithCheck.resolves({
          ok: 1,
          msg: 'isdbgrid',
          shards: [
            {
              _id: 'shard1',
              host: 'shard1/foo.bar:27017',
            },
            {
              _id: 'shard2',
              host: 'shard2/foo.bar:27018',
            },
          ],
        });
        const result = await shard.isConfigShardEnabled();
        expect(result).to.deep.equal({ enabled: false });
      });

      it('returns true and shard info when listShards contains config shard', async function () {
        serviceProvider.runCommandWithCheck.resolves({
          ok: 1,
          msg: 'isdbgrid',
          shards: [
            {
              _id: 'shard1',
              host: 'shard1/foo.bar:27017',
            },
            {
              _id: 'shard2',
              host: 'shard2/foo.bar:27018',
            },
            {
              _id: 'config',
              host: 'shard3/foo.bar:27019',
            },
          ],
        });
        const result = await shard.isConfigShardEnabled();
        expect(result).to.deep.equal({
          enabled: true,
          host: 'shard3/foo.bar:27019',
        });
      });

      it('returns config shard tags', async function () {
        serviceProvider.runCommandWithCheck.resolves({
          ok: 1,
          msg: 'isdbgrid',
          shards: [
            {
              _id: 'shard1',
              host: 'shard1/foo.bar:27017',
            },
            {
              _id: 'shard2',
              host: 'shard2/foo.bar:27018',
            },
            {
              _id: 'config',
              host: 'shard3/foo.bar:27019',
              tags: ['tag1', 'tag2'],
            },
          ],
        });

        const result = await shard.isConfigShardEnabled();
        expect(result).to.deep.equal({
          enabled: true,
          host: 'shard3/foo.bar:27019',
          tags: ['tag1', 'tag2'],
        });
      });

      it('throws if serviceProvider.runCommandWithCheck rejects', async function () {
        const expectedError = new Error('unreachable');
        serviceProvider.runCommandWithCheck.rejects(expectedError);
        const caughtError = await shard.isConfigShardEnabled().catch((e) => e);
        expect(caughtError).to.equal(expectedError);
      });

      it('throws if not mongos', async function () {
        serviceProvider.runCommandWithCheck.resolves({
          ok: 1,
          msg: 'not dbgrid',
        });
        await shard.isConfigShardEnabled();
        expect(warnSpy.calledOnce).to.be.true;
      });
    });
  });

  describe('integration', function () {
    let serviceProvider: NodeDriverServiceProvider;
    let instanceState: ShellInstanceState;
    let sh: Shard;
    const dbName = 'test';
    const ns = `${dbName}.coll`;
    const shardId = 'rs-shard0';

    const [mongos, rs0, rs1] = startTestCluster(
      'shard',
      // shards: 0 creates a setup without any initial shards
      { topology: 'sharded', shards: 0 },
      {
        topology: 'replset',
        args: ['--replSet', `${shardId}-0`, '--shardsvr'],
      },
      { topology: 'replset', args: ['--replSet', `${shardId}-1`, '--shardsvr'] }
    );

    before(async function () {
      serviceProvider = await NodeDriverServiceProvider.connect(
        await mongos.connectionString(),
        dummyOptions,
        {},
        new EventEmitter()
      );
      instanceState = new ShellInstanceState(serviceProvider);
      sh = new Shard(instanceState.currentDb);

      // check replset uninitialized
      let members = await (
        await sh._database.getSiblingDB('config').getCollection('shards').find()
      )
        .sort({ _id: 1 })
        .toArray();
      expect(members.length).to.equal(0);

      // add new shards
      expect(
        (await sh.addShard(`${shardId}-0/${await rs0.hostport()}`)).shardAdded
      ).to.equal(`${shardId}-0`);
      expect(
        (await sh.addShard(`${shardId}-1/${await rs1.hostport()}`)).shardAdded
      ).to.equal(`${shardId}-1`);
      members = await (
        await sh._database.getSiblingDB('config').getCollection('shards').find()
      )
        .sort({ _id: 1 })
        .toArray();
      expect(members.length).to.equal(2);
      await sh._database.getSiblingDB(dbName).dropDatabase();
      await sh._database.getSiblingDB(dbName).createCollection('unsharded');
    });

    after(function () {
      return serviceProvider.close(true);
    });

    describe('collection.status()', function () {
      let db: Database;

      const dbName = 'shard-status-test';
      const ns = `${dbName}.test`;

      beforeEach(async function () {
        db = sh._database.getSiblingDB(dbName);
        await db.getCollection('test').insertOne({ key: 1 });
        await db.getCollection('test').createIndex({ key: 1 });
      });
      afterEach(async function () {
        await db.dropDatabase();
      });
      describe('unsharded collections', function () {
        describe('with >= 6.0.3', function () {
          skipIfServerVersion(mongos, '< 6.0.3');

          it('returns shardedDataDistribution as an empty array', async function () {
            const status = await sh.status();
            expect(status.value.shardedDataDistribution).deep.equals([]);
          });
        });

        describe('with < 6.0.3', function () {
          skipIfServerVersion(mongos, '>= 6.0.3');

          it('returns shardedDataDistribution as undefined', async function () {
            const status = await sh.status();
            expect(status.value.shardedDataDistribution).equals(undefined);
          });
        });
      });

      describe('sharded collections', function () {
        beforeEach(async function () {
          expect((await sh.enableSharding(dbName)).ok).to.equal(1);
          expect(
            (await sh.shardCollection(ns, { key: 1 })).collectionsharded
          ).to.equal(ns);
        });

        describe('with >= 6.0.3', function () {
          skipIfServerVersion(mongos, '< 6.0.3');

          it('returns correct shardedDataDistribution', async function () {
            const status = await sh.status();

            expect(status.value.shardedDataDistribution?.length).equals(1);
            expect(status.value.shardedDataDistribution?.[0].ns).equals(ns);
          });
        });

        describe('with < 6.0.3', function () {
          skipIfServerVersion(mongos, '>= 6.0.3');

          it('returns shardedDataDistribution as undefined', async function () {
            const status = await sh.status();
            expect(status.value.shardedDataDistribution).equals(undefined);
          });
        });
      });
    });

    describe('sharding info', function () {
      it('returns the status', async function () {
        const result = await sh.status();
        expect(result.type).to.equal('StatsResult');
        expect(Object.keys(result.value)).to.include.members([
          'shardingVersion',
          'shards',
          'autosplit',
          'balancer',
          'databases',
        ]);
        expect(
          Object.keys(result.value).includes('active mongoses') ||
            Object.keys(result.value).includes('most recently active mongoses')
        ).to.be.true;
      });
      context('with 5.0+ server', function () {
        skipIfServerVersion(mongos, '<= 4.4');
        let apiStrictServiceProvider: ServiceProvider;

        before(async function () {
          try {
            apiStrictServiceProvider = await NodeDriverServiceProvider.connect(
              await mongos.connectionString(),
              {
                ...dummyOptions,
                serverApi: { version: '1', strict: true },
              },
              {},
              new EventEmitter()
            );
          } catch {
            /* Fails to connect to servers which do not understand api versions */
          }
        });

        after(async function () {
          await apiStrictServiceProvider?.close?.(true);
        });

        it('returns the status when used with apiStrict', async function () {
          const instanceState = new ShellInstanceState(
            apiStrictServiceProvider
          );
          const sh = new Shard(instanceState.currentDb);

          const result = await sh.status();
          expect(result.type).to.equal('StatsResult');
          expect(Object.keys(result.value)).to.include.members([
            'shardingVersion',
            'shards',
            'autosplit',
            'balancer',
            'databases',
          ]);
        });
      });
      describe('with a 7.0+ server', function () {
        skipIfServerVersion(mongos, '< 7.0');

        it('displays automerge status, if explicitly set', async function () {
          await sh.startAutoMerger();
          const result = await sh.status();

          expect(result.value.automerge).to.deep.equal({
            'Currently enabled': 'yes',
          });
        });
      });
    });
    describe('turn on sharding', function () {
      it('enableSharding for a db', async function () {
        expect((await sh.status()).value.databases.length).to.oneOf([1, 2]);
        expect((await sh.enableSharding(dbName)).ok).to.equal(1); // This may not have any effect on newer server versions
        expect((await sh.status()).value.databases.length).to.be.oneOf([1, 2]);
      });
      it('enableSharding for a collection and modify documents in it', async function () {
        expect(
          Object.keys(
            (await sh.status()).value.databases.find(
              (d: Document) => d.database._id === 'test'
            )?.collections ?? []
          )
        ).to.deep.equal([]);
        expect(
          (await sh.shardCollection(ns, { key: 1 })).collectionsharded
        ).to.equal(ns);
        expect(
          (await sh.status()).value.databases.find(
            (d: Document) => d.database._id === 'test'
          )?.collections[ns].shardKey
        ).to.deep.equal({ key: 1 });

        const db = instanceState.currentDb.getSiblingDB(dbName);
        await db.getCollection('coll').insertMany([
          { key: 'A', value: 10 },
          { key: 'B', value: 20 },
        ]);
        const original = await db
          .getCollection('coll')
          .findOneAndUpdate({ key: 'A' }, { $set: { value: 30 } });
        expect(original.key).to.equal('A');
        expect(original.value).to.equal(10);

        const collectionInfo = (await sh.status()).value.databases[1]
          .collections[ns];
        expect(collectionInfo.chunkMetadata).to.have.lengthOf(1);
        const inspectedCollectionInfo = inspect(collectionInfo);
        // Make sure that each individual chunk in the output is on a single line
        expect(inspectedCollectionInfo).to.include(
          'chunks: [\n' +
            '    { min: { key: MinKey() }, max: { key: MaxKey() }, ' +
            `'on shard': '${collectionInfo.chunks[0]['on shard']}', 'last modified': Timestamp({ t: 1, i: 0 }) }\n` +
            '  ],\n'
        );
      });
    });
    describe('automerge', function () {
      it('not shown if sh.status() if not explicitly enabled', async function () {
        expect((await sh.status()).value.automerge).is.undefined;
      });
      describe('from 7.0', function () {
        skipIfServerVersion(mongos, '< 7.0'); // Available from 7.0
        it('stops correctly', async function () {
          expect((await sh.stopAutoMerger()).acknowledged).to.equal(true);
          expect(
            ((await sh.status()).value.automerge ?? {})['Currently enabled']
          ).to.equal('no');
        });
        it('enables correctly', async function () {
          expect((await sh.startAutoMerger()).acknowledged).to.equal(true);
          expect(
            ((await sh.status()).value.automerge ?? {})['Currently enabled']
          ).to.equal('yes');
        });
      });
    });
    describe('autosplit', function () {
      skipIfServerVersion(mongos, '> 6.x'); // Auto-splitter is removed in 7.0
      it('disables correctly', async function () {
        expect((await sh.disableAutoSplit()).acknowledged).to.equal(true);
        expect(
          (await sh.status()).value.autosplit['Currently enabled']
        ).to.equal('no');
      });
      it('enables correctly', async function () {
        expect((await sh.enableAutoSplit()).acknowledged).to.equal(true);
        expect(
          (await sh.status()).value.autosplit['Currently enabled']
        ).to.equal('yes');
      });
    });
    describe('tags', function () {
      it('creates a zone', async function () {
        expect((await sh.addShardTag(`${shardId}-1`, 'zone1')).ok).to.equal(1);
        expect((await sh.listShards())[1]?.tags).to.deep.equal(['zone1']);
        expect((await sh.addShardToZone(`${shardId}-0`, 'zone0')).ok).to.equal(
          1
        );
        expect((await sh.listShards())[0]?.tags).to.deep.equal(['zone0']);
      });
      it('sets a zone key range', async function () {
        expect(
          (await sh.updateZoneKeyRange(ns, { key: 0 }, { key: 20 }, 'zone1')).ok
        ).to.equal(1);
        expect(
          (await sh.status()).value.databases[1].collections[ns].tags[0]
        ).to.deep.equal({
          tag: 'zone1',
          min: { key: 0 },
          max: { key: 20 },
        });
        expect(
          (await sh.addTagRange(ns, { key: 21 }, { key: 40 }, 'zone0')).ok
        ).to.equal(1);
        expect(
          (await sh.status()).value.databases[1].collections[ns].tags[1]
        ).to.deep.equal({
          tag: 'zone0',
          min: { key: 21 },
          max: { key: 40 },
        });
      });
      it('removes a key range', async function () {
        expect(
          (await sh.status()).value.databases[1].collections[ns].tags.length
        ).to.equal(2);
        expect(
          (await sh.removeRangeFromZone(ns, { key: 0 }, { key: 20 })).ok
        ).to.equal(1);
        expect(
          (await sh.status()).value.databases[1].collections[ns].tags.length
        ).to.equal(1);
        expect(
          (await sh.removeTagRange(ns, { key: 21 }, { key: 40 })).ok
        ).to.equal(1);
        expect(
          (await sh.status()).value.databases[1].collections[ns].tags.length
        ).to.equal(0);
      });
      it('removes zones', async function () {
        expect(
          (await sh.removeShardFromZone(`${shardId}-1`, 'zone1')).ok
        ).to.equal(1);
        expect((await sh.listShards())[1].tags).to.deep.equal([]);
        expect((await sh.removeShardTag(`${shardId}-0`, 'zone0')).ok).to.equal(
          1
        );
        expect((await sh.listShards())[0].tags).to.deep.equal([]);
      });
      it('shows a full tag list when there are 20 or less tags', async function () {
        const db = instanceState.currentDb.getSiblingDB(dbName);
        for (let i = 0; i < 19; i++) {
          await db.getCollection('coll').insertOne({ key: 'A', value: i * 10 });
          await sh.addShardToZone(`${shardId}-0`, `zone${i}`);
          await sh.updateZoneKeyRange(
            ns,
            { key: i * 10 },
            { key: i * 10 + 10 },
            `zone${i}`
          );
          await sh.addShardTag(`${shardId}-0`, `zone${i}`);
        }

        const tags = (await sh.status()).value.databases.find(
          (d: Document) => d.database._id === 'test'
        )?.collections[ns].tags;
        expect(tags.length).to.equal(19);
      });
      it('cuts a tag list when there are more than 20 tags', async function () {
        await sh.addShardToZone(`${shardId}-0`, 'zone19');
        await sh.updateZoneKeyRange(ns, { key: 190 }, { key: 200 }, 'zone19');
        await sh.addShardTag(`${shardId}-0`, 'zone19');

        const tags = (await sh.status()).value.databases.find(
          (d: Document) => d.database._id === 'test'
        )?.collections[ns].tags;
        expect(tags.length).to.equal(21);
        expect(
          tags.indexOf(
            'too many tags to print, use verbose if you want to force print'
          )
        ).to.equal(20);

        // Cleanup.
        const db = instanceState.currentDb.getSiblingDB(dbName);
        await db.getCollection('coll').deleteMany({});
        for (let i = 0; i < 20; i++) {
          await sh.removeRangeFromZone(
            ns,
            { key: i * 10 },
            { key: i * 10 + 10 }
          );
          await sh.removeShardTag(`${shardId}-0`, `zone${i}`);
          await sh.removeShardFromZone(`${shardId}-0`, `zone${i}`);
        }
      });
    });
    describe('balancer', function () {
      it('reports balancer state', async function () {
        expect(Object.keys(await sh.isBalancerRunning())).to.include.members([
          'mode',
          'inBalancerRound',
          'numBalancerRounds',
        ]);
      });
      it('stops balancer', async function () {
        expect((await sh.stopBalancer()).ok).to.equal(1);
        expect((await sh.isBalancerRunning()).mode).to.equal('off');
      });
      it('starts balancer', async function () {
        expect((await sh.startBalancer()).ok).to.equal(1);
        expect((await sh.isBalancerRunning()).mode).to.equal('full');
      });
      describe('balancerCollectionStatus', function () {
        skipIfServerVersion(mongos, '< 4.4');
        it('reports state for collection', async function () {
          expect(Object.keys(await sh.balancerCollectionStatus(ns))).to.include(
            'balancerCompliant'
          );
        });
      });
      it('disables balancing', async function () {
        expect((await sh.disableBalancing(ns)).acknowledged).to.equal(true);
        expect(
          (
            await sh._database
              .getSiblingDB('config')
              .getCollection('collections')
              .findOne({ _id: ns })
          )?.noBalance
        ).to.equal(true);
      });
      it('enables balancing', async function () {
        expect((await sh.enableBalancing(ns)).acknowledged).to.equal(true);
        expect(
          (
            await sh._database
              .getSiblingDB('config')
              .getCollection('collections')
              .findOne({ _id: ns })
          )?.noBalance
        ).to.equal(false);
      });
    });
    describe('autoMerger', function () {
      it('reports autoMerger state', async function () {
        expect(await sh.isAutoMergerEnabled()).to.equal(true);
      });
      it('stops autoMerger', async function () {
        await sh.stopAutoMerger();
        expect(await sh.isAutoMergerEnabled()).to.equal(false);
      });
      it('starts autoMerger', async function () {
        await sh.startAutoMerger();
        expect(await sh.isAutoMergerEnabled()).to.equal(true);
      });
      it('disables autoMerger', async function () {
        expect((await sh.enableSharding(dbName)).ok).to.equal(1);
        expect(
          (await sh.shardCollection(ns, { key: 1 })).collectionsharded
        ).to.equal(ns);
        expect((await sh.disableAutoMerger(ns)).acknowledged).to.equal(true);
        expect(
          (
            await sh._database
              .getSiblingDB('config')
              .getCollection('collections')
              .findOne({ _id: ns })
          )?.enableAutoMerge
        ).to.equal(false);
      });
      it('enables autoMerger', async function () {
        expect((await sh.enableSharding(dbName)).ok).to.equal(1);
        expect(
          (await sh.shardCollection(ns, { key: 1 })).collectionsharded
        ).to.equal(ns);
        expect((await sh.disableAutoMerger(ns)).acknowledged).to.equal(true);
        expect((await sh.enableAutoMerger(ns)).acknowledged).to.equal(true);
        expect(
          (
            await sh._database
              .getSiblingDB('config')
              .getCollection('collections')
              .findOne({ _id: ns })
          )?.enableAutoMerge
        ).to.not.exist;
      });
    });
    describe('getShardDistribution', function () {
      let db: Database;
      const dbName = 'shard-distrib-test';
      const ns = `${dbName}.test`;

      beforeEach(function () {
        db = sh._database.getSiblingDB(dbName);
      });
      afterEach(async function () {
        await db.dropDatabase();
      });
      it('fails when running against an unsharded collection', async function () {
        try {
          await db.createCollection('test');
          await db.getCollection('test').getShardDistribution();
        } catch (err: any) {
          expect(err.name).to.equal('MongoshInvalidInputError');
          return;
        }
        expect.fail('Missed exception');
      });
      it('gives information about the shard distribution', async function () {
        expect((await sh.enableSharding(dbName)).ok).to.equal(1);
        expect(
          (await sh.shardCollection(ns, { key: 1 })).collectionsharded
        ).to.equal(ns);

        {
          const ret = await db.getCollection('test').getShardDistribution();
          expect(ret.type).to.equal('StatsResult');
          const { Totals } = ret.value as any;
          expect(Totals.data).to.equal('0B');
          expect(Totals.docs).to.equal(0);
          expect(Totals.chunks).to.equal(1);

          const TotalsShardInfoKeys = Object.keys(Totals).filter((key) =>
            key.startsWith('Shard')
          );
          expect(TotalsShardInfoKeys).to.have.lengthOf(1);
          expect(Totals[TotalsShardInfoKeys[0]]).to.deep.equal([
            '0 % data',
            '0 % docs in cluster',
            '0B avg obj size on shard',
          ]);

          const ValueShardInfoKeys = Object.keys(ret.value as Document).filter(
            (key) => key.startsWith('Shard')
          );
          expect(ValueShardInfoKeys).to.have.lengthOf(1);
          expect((ret.value as Document)[ValueShardInfoKeys[0]]).to.deep.equal({
            data: '0B',
            docs: 0,
            chunks: 1,
            'estimated data per chunk': '0B',
            'estimated docs per chunk': 0,
          });
        }

        // Insert a document, then check again
        await db.getCollection('test').insertOne({ foo: 'bar', key: 99 });

        {
          const ret = await db.getCollection('test').getShardDistribution();
          expect(ret.type).to.equal('StatsResult');
          const { Totals } = ret.value as any;
          expect(Totals.docs).to.equal(1);
          expect(Totals.chunks).to.equal(1);

          const TotalsShardInfoKeys = Object.keys(Totals).filter((key) =>
            key.startsWith('Shard')
          );
          expect(TotalsShardInfoKeys).to.have.lengthOf(1);
          expect(Totals[TotalsShardInfoKeys[0]]).to.deep.equal([
            '100 % data',
            '100 % docs in cluster',
            `${Totals.data} avg obj size on shard`,
          ]);

          const ValueShardInfoKeys = Object.keys(ret.value as Document).filter(
            (key) => key.startsWith('Shard')
          );
          expect(ValueShardInfoKeys).to.have.lengthOf(1);
          expect((ret.value as Document)[ValueShardInfoKeys[0]]).to.deep.equal({
            data: Totals.data,
            docs: 1,
            chunks: 1,
            'estimated data per chunk': Totals.data,
            'estimated docs per chunk': 1,
          });
        }
      });
    });
    describe('analyzeShardKey()', function () {
      skipIfServerVersion(mongos, '< 7.0'); // analyzeShardKey will only be added in 7.0 which is not included in stable yet

      let db: Database;
      const dbName = 'shard-analyze-test';
      const ns = `${dbName}.test`;

      const docs: any[] = [];
      for (let i = 0; i < 1000; i++) {
        docs.push({ myKey: i });
      }

      beforeEach(function () {
        db = sh._database.getSiblingDB(dbName);
      });
      afterEach(async function () {
        await db.dropDatabase();
      });
      it('succeeds when running against an unsharded collection', async function () {
        await db.getCollection('test').insertMany(docs);
        expect(
          await db.getCollection('test').analyzeShardKey({ myKey: 1 })
        ).to.deep.include({ ok: 1 });
      });
      it('succeeds when running against a sharded collection', async function () {
        expect((await sh.enableSharding(dbName)).ok).to.equal(1);
        expect(
          (await sh.shardCollection(ns, { key: 1 })).collectionsharded
        ).to.equal(ns);
        await db.getCollection('test').insertMany(docs);
        expect(
          await db.getCollection('test').analyzeShardKey({ myKey: 1 })
        ).to.deep.include({ ok: 1 });
      });
    });
    describe('configureQueryAnalyzer()', function () {
      skipIfServerVersion(mongos, '< 7.0'); // analyzeShardKey will only be added in 7.0 which is not included in stable yet

      let db: Database;
      const dbName = 'shard-analyze-test';
      const ns = `${dbName}.test`;

      const docs: any[] = [];
      for (let i = 0; i < 1000; i++) {
        docs.push({ myKey: i });
      }

      beforeEach(function () {
        db = sh._database.getSiblingDB(dbName);
      });
      afterEach(async function () {
        await db.dropDatabase();
      });
      it('succeeds when running against an unsharded collection', async function () {
        await db.getCollection('test').insertMany(docs);

        const fullResult = await db
          .getCollection('test')
          .configureQueryAnalyzer({ mode: 'full', samplesPerSecond: 1 });
        expect(fullResult).to.deep.include({
          ok: 1,
          newConfiguration: { mode: 'full', samplesPerSecond: 1 },
        });

        const offResult = await db
          .getCollection('test')
          .configureQueryAnalyzer({ mode: 'off' });
        expect(offResult).to.deep.include({
          ok: 1,
          oldConfiguration: { mode: 'full', samplesPerSecond: 1 },
          newConfiguration: { mode: 'off' },
        });
      });
      it('succeeds when running against a sharded collection', async function () {
        expect((await sh.enableSharding(dbName)).ok).to.equal(1);
        expect(
          (await sh.shardCollection(ns, { key: 1 })).collectionsharded
        ).to.equal(ns);
        await db.getCollection('test').insertMany(docs);

        const fullResult = await db
          .getCollection('test')
          .configureQueryAnalyzer({ mode: 'full', samplesPerSecond: 1 });
        expect(fullResult).to.deep.include({
          ok: 1,
          newConfiguration: { mode: 'full', samplesPerSecond: 1 },
        });

        const offResult = await db
          .getCollection('test')
          .configureQueryAnalyzer({ mode: 'off' });
        expect(offResult).to.deep.include({
          ok: 1,
          oldConfiguration: { mode: 'full', samplesPerSecond: 1 },
          newConfiguration: { mode: 'off' },
        });
      });
    });

    describe('collection.getShardDistribution()', function () {
      let db: Database;
      const dbName = 'get-shard-distribution-test';
      const ns = `${dbName}.test`;

      beforeEach(async function () {
        db = sh._database.getSiblingDB(dbName);
        await db.getCollection('test').insertOne({ key: 1 });
        await db.getCollection('test').createIndex({ key: 1 });
      });

      afterEach(async function () {
        await db.dropDatabase();
      });

      context('unsharded collections', function () {
        it('throws an error', async function () {
          const caughtError = await db
            .getCollection('test')
            .getShardDistribution()
            .catch((e) => e);
          expect(caughtError.message).includes(
            'Collection test is not sharded'
          );
        });
      });

      context('sharded collections', function () {
        beforeEach(async function () {
          expect((await sh.enableSharding(dbName)).ok).to.equal(1);
          expect(
            (await sh.shardCollection(ns, { key: 1 })).collectionsharded
          ).to.equal(ns);
        });

        it('returns the correct StatsResult', async function () {
          const result = await db.getCollection('test').getShardDistribution();
          const shardDistributionValue = result.value as Document;

          expect(result.type).to.equal('StatsResult');

          const shardFields = Object.keys(shardDistributionValue).filter(
            (field) => field !== 'Totals'
          );
          expect(shardFields.length).to.equal(1);
          const shardField = shardFields[0];
          expect(
            shardDistributionValue[shardField]['estimated docs per chunk']
          ).to.equal(1);

          expect(shardDistributionValue.Totals.docs).to.equal(1);
          expect(shardDistributionValue.Totals.chunks).to.equal(1);
        });
      });

      // We explicitly test sharded time series collections as it fallbacks to the bucket information
      context('sharded timeseries collections', function () {
        skipIfServerVersion(mongos, '< 5.1');

        const timeseriesCollectionName = 'getShardDistributionTS';
        const timeseriesNS = `${dbName}.${timeseriesCollectionName}`;

        beforeEach(async function () {
          expect((await sh.enableSharding(dbName)).ok).to.equal(1);

          expect(
            (
              await sh.shardCollection(
                timeseriesNS,
                { 'metadata.bucketId': 1 },
                {
                  timeseries: {
                    timeField: 'timestamp',
                    metaField: 'metadata',
                    granularity: 'hours',
                  },
                }
              )
            ).collectionsharded
          ).to.equal(timeseriesNS);
          await db.getCollection(timeseriesCollectionName).insertOne({
            metadata: {
              bucketId: 1,
              type: 'temperature',
            },
            timestamp: new Date('2021-05-18T00:00:00.000Z'),
            temp: 12,
          });
        });

        it('returns the correct StatsResult', async function () {
          const result = await db
            .getCollection(timeseriesCollectionName)
            .getShardDistribution();
          const shardDistributionValue = result.value as Document;

          expect(result.type).to.equal('StatsResult');

          const shardFields = Object.keys(shardDistributionValue).filter(
            (field) => field !== 'Totals'
          );
          expect(shardFields.length).to.equal(1);
          const shardField = shardFields[0];

          // Timeseries will have count NaN
          expect(
            shardDistributionValue[shardField]['estimated docs per chunk']
          ).to.be.NaN;

          expect(shardDistributionValue.Totals.docs).to.be.NaN;
          expect(shardDistributionValue.Totals.chunks).to.equal(1);
        });
      });
    });

    describe('collection.stats()', function () {
      let db: Database;
      let hasTotalSize: boolean;
      let hasScaleFactorIncluded: boolean;
      const dbName = 'shard-stats-test';
      const ns = `${dbName}.test`;

      beforeEach(async function () {
        db = sh._database.getSiblingDB(dbName);
        await db.getCollection('test').insertOne({ key: 1 });
        await db.getCollection('test').createIndex({ key: 1 });
        const dbVersion = await db.version();
        hasTotalSize = !/^4\.[0123]\./.exec(dbVersion);
        hasScaleFactorIncluded = !/^4\.[01]\./.exec(dbVersion);
      });
      afterEach(async function () {
        await db.dropDatabase();
      });
      context('unsharded collections', function () {
        it('works without indexDetails', async function () {
          const result = await db.getCollection('test').stats();
          expect(result.sharded).to.equal(false);
          expect(result.count).to.equal(1);
          if (hasTotalSize) {
            for (const shardId of Object.keys(result.shards)) {
              expect(result.shards[shardId].totalSize).to.be.a('number');
            }
          }
          for (const shardId of Object.keys(result.shards)) {
            expect(result.shards[shardId].indexDetails).to.equal(undefined);
          }
        });
        it('works with indexDetails', async function () {
          const result = await db
            .getCollection('test')
            .stats({ indexDetails: true });
          for (const shardId of Object.keys(result.shards)) {
            expect(
              result.shards[shardId].indexDetails._id_.metadata.formatVersion
            ).to.be.a('number');
          }
        });
      });
      context('sharded collections', function () {
        beforeEach(async function () {
          expect((await sh.enableSharding(dbName)).ok).to.equal(1);
          expect(
            (await sh.shardCollection(ns, { key: 1 })).collectionsharded
          ).to.equal(ns);
        });
        it('works without indexDetails', async function () {
          const result = await db.getCollection('test').stats();
          expect(result.sharded).to.equal(true);
          expect(result.count).to.equal(1);
          expect(result.primary).to.equal(undefined);
          for (const shard of Object.values(result.shards) as any) {
            if (hasTotalSize) {
              expect(shard.totalSize).to.be.a('number');
            }
            expect(shard.indexDetails).to.equal(undefined);
          }
        });
        it('works with indexDetails', async function () {
          const result = await db
            .getCollection('test')
            .stats({ indexDetails: true });
          for (const shard of Object.values(result.shards) as any) {
            if (hasTotalSize) {
              expect(shard.totalSize).to.be.a('number');
            }
            expect(shard.indexDetails._id_.metadata.formatVersion).to.be.a(
              'number'
            );
          }
        });
        it('returns scaled output', async function () {
          const scaleFactor = 1024;
          const unscaledResult = await db.getCollection('test').stats();
          const scaledResult = await db
            .getCollection('test')
            .stats(scaleFactor);

          const scaledProperties = [
            'size',
            'storageSize',
            'totalIndexSize',
            'totalSize',
          ];
          for (const scaledProperty of scaledProperties) {
            if (scaledProperty === 'totalSize' && !hasTotalSize) {
              expect(unscaledResult[scaledProperty]).to.equal(undefined);
              expect(scaledResult[scaledProperty]).to.equal(undefined);
              continue;
            }
            expect(
              unscaledResult[scaledProperty] / scaledResult[scaledProperty]
            ).to.equal(
              scaleFactor,
              `Expected scaled property "${scaledProperty}" to be scaled. ${unscaledResult[scaledProperty]} should equal ${scaleFactor}*${scaledResult[scaledProperty]}`
            );
            for (const shardId of Object.keys(scaledResult.shards)) {
              expect(
                unscaledResult.shards[shardId][scaledProperty] /
                  scaledResult.shards[shardId][scaledProperty]
              ).to.equal(scaleFactor);
            }
          }

          for (const indexId of Object.keys(scaledResult.indexSizes)) {
            expect(
              unscaledResult.indexSizes[indexId] /
                scaledResult.indexSizes[indexId]
            ).to.equal(scaleFactor);
          }
          for (const shardId of Object.keys(scaledResult.shards)) {
            for (const indexId of Object.keys(
              scaledResult.shards[shardId].indexSizes
            )) {
              expect(
                unscaledResult.shards[shardId].indexSizes[indexId] /
                  scaledResult.shards[shardId].indexSizes[indexId]
              ).to.equal(scaleFactor);
            }
          }

          // The `scaleFactor` property started being returned in 4.2.
          expect(unscaledResult.scaleFactor).to.equal(
            hasScaleFactorIncluded ? 1 : undefined
          );
          expect(scaledResult.scaleFactor).to.equal(
            hasScaleFactorIncluded ? 1024 : undefined
          );

          for (const shardStats of Object.values(
            unscaledResult.shards as {
              scaleFactor: number;
            }[]
          )) {
            expect(shardStats.scaleFactor).to.equal(
              hasScaleFactorIncluded ? 1 : undefined
            );
          }
          for (const shardStats of Object.values(
            scaledResult.shards as {
              scaleFactor: number;
            }[]
          )) {
            expect(shardStats.scaleFactor).to.equal(
              hasScaleFactorIncluded ? 1024 : undefined
            );
          }
        });
      });

      // We explicitly test sharded time series collections as it uses the legacy
      // `collStats` command as a fallback instead of the aggregation format. SERVER-72686
      context('sharded timeseries collections', function () {
        skipIfServerVersion(mongos, '< 5.1');

        const timeseriesCollectionName = 'testTS';
        const timeseriesNS = `${dbName}.${timeseriesCollectionName}`;

        beforeEach(async function () {
          expect((await sh.enableSharding(dbName)).ok).to.equal(1);

          expect(
            (
              await sh.shardCollection(
                timeseriesNS,
                { 'metadata.bucketId': 1 },
                {
                  timeseries: {
                    timeField: 'timestamp',
                    metaField: 'metadata',
                    granularity: 'hours',
                  },
                }
              )
            ).collectionsharded
          ).to.equal(timeseriesNS);
          await db.getCollection(timeseriesCollectionName).insertOne({
            metadata: {
              bucketId: 1,
              type: 'temperature',
            },
            timestamp: new Date('2021-05-18T00:00:00.000Z'),
            temp: 12,
          });
        });

        it('returns the collection stats', async function () {
          const result = await db
            .getCollection(timeseriesCollectionName)
            .stats();
          expect(result.sharded).to.equal(true);
          // Timeseries bucket collection does not provide 'count' or 'avgObjSize'.
          expect(result.count).to.equal(undefined);
          expect(result.primary).to.equal(undefined);
          for (const shard of Object.values(result.shards) as any) {
            expect(shard.totalSize).to.be.a('number');
            expect(shard.indexDetails).to.equal(undefined);
            expect(shard.timeseries.bucketsNs).to.equal(
              `${dbName}.system.buckets.${timeseriesCollectionName}`
            );
            expect(shard.timeseries.numBucketUpdates).to.equal(0);
            expect(typeof result.timeseries.bucketCount).to.equal('number');
          }
          expect(result.timeseries.bucketsNs).to.equal(
            `${dbName}.system.buckets.${timeseriesCollectionName}`
          );
          expect(result.timeseries.bucketCount).to.equal(1);
          expect(result.timeseries.numBucketInserts).to.equal(1);
        });
      });
    });

    describe('collection.isCapped', function () {
      it('returns true for config.changelog', async function () {
        const ret = await sh._database
          .getSiblingDB('config')
          .getCollection('changelog')
          .isCapped();
        expect(ret).to.equal(true);
      });
    });
    describe('databases', function () {
      let dbRegular: Database;
      let dbSh: Database;
      const dbRegularName = 'db';
      const dbShName = 'dbSh';
      const collRegularName = 'testRegular';
      const collShName = 'testSh';

      beforeEach(function () {
        dbRegular = sh._database.getSiblingDB(dbRegularName);
        dbSh = sh._database.getSiblingDB(dbShName);
      });

      afterEach(async function () {
        await dbRegular.dropDatabase();
        await dbSh.dropDatabase();
      });

      it('the list includes databases that were never explicitly sharded', async function () {
        await dbRegular
          .getCollection(collRegularName)
          .insertOne({ foo: 'bar', key: 99 });

        const collSh = dbSh.getCollection(collShName);
        await collSh.insertOne({ name: 'some', zipcode: '11111' });
        await collSh.createIndex({ zipcode: 1 });
        await sh.enableSharding(dbShName);
        await sh.shardCollection(`${dbShName}.${collShName}`, { zipcode: 1 });

        const result = await sh.status();

        const databasesDbItem = result.value.databases.find(
          (item: Document) => item.database._id === 'db'
        );
        // Cannot get strict guarantees about the value of this field since SERVER-63983
        expect(databasesDbItem?.database.partitioned).to.be.oneOf([
          false,
          undefined,
        ]);
        const databasesDbShItem = result.value.databases.find(
          (item: Document) => item.database._id === 'dbSh'
        );
        // Cannot get strict guarantees about the value of this field since SERVER-60926 and SERVER-63983
        expect(databasesDbShItem?.database.partitioned).to.be.oneOf([
          true,
          false,
          undefined,
        ]);
      });
    });
    describe('checkMetadataConsistency', function () {
      skipIfServerVersion(mongos, '< 7.0');
      let db: Database;
      let coll: Collection;

      before(async function () {
        db = instanceState.currentDb.getSiblingDB('db');
        coll = db.getCollection('coll');
        await sh.enableSharding('db');
        await sh.shardCollection('db.coll', { key: 1 });
      });

      it('returns results for the cluster', async function () {
        const cursor = await sh.checkMetadataConsistency();
        expect(await cursor.toArray()).to.deep.equal([]);
      });
      it('returns results for the cluster with options', async function () {
        const cursor = await sh.checkMetadataConsistency({ checkIndexes: 1 });
        expect(await cursor.toArray()).to.deep.equal([]);
      });

      it('returns results for a database', async function () {
        const cursor = await db.checkMetadataConsistency();
        expect(await cursor.toArray()).to.deep.equal([]);
      });
      it('returns results for a database with options', async function () {
        const cursor = await db.checkMetadataConsistency({ checkIndexes: 1 });
        expect(await cursor.toArray()).to.deep.equal([]);
      });

      it('returns results for a collection', async function () {
        const cursor = await coll.checkMetadataConsistency();
        expect(await cursor.toArray()).to.deep.equal([]);
      });
      it('returns results for a collection with options', async function () {
        const cursor = await coll.checkMetadataConsistency({ checkIndexes: 1 });
        expect(await cursor.toArray()).to.deep.equal([]);
      });
    });

    describe('listShards', function () {
      it('returns the list of shards', async function () {
        const result = await sh.listShards();
        expect(result).to.be.an('array');
        expect(result).to.have.lengthOf(2);

        expect(result[0]._id).to.equal(`${shardId}-0`);
        expect(result[0].host).to.contain(`${shardId}-0`);

        expect(result[1]._id).to.equal(`${shardId}-1`);
        expect(result[1].host).to.contain(`${shardId}-1`);
      });

      it('matches the output of status().shards', async function () {
        const listShardsResult = await sh.listShards();
        const statusResultShards = (await sh.status()).value.shards;

        expect(listShardsResult).to.deep.equal(statusResultShards);
      });
    });
  });

  describe('integration chunks', function () {
    let serviceProvider: NodeDriverServiceProvider;
    let instanceState: ShellInstanceState;
    let sh: Shard;
    const dbName = 'test';
    const ns = `${dbName}.coll`;
    const shardId = 'rs-shard1';

    const [mongos, rs0, rs1] = startTestCluster(
      'shard',
      // shards: 0 creates a setup without any initial shards
      { topology: 'sharded', shards: 0 },
      {
        topology: 'replset',
        args: ['--replSet', `${shardId}-0`, '--shardsvr'],
      },
      { topology: 'replset', args: ['--replSet', `${shardId}-1`, '--shardsvr'] }
    );

    before(async function () {
      serviceProvider = await NodeDriverServiceProvider.connect(
        await mongos.connectionString(),
        dummyOptions,
        {},
        new EventEmitter()
      );
      instanceState = new ShellInstanceState(serviceProvider);
      sh = new Shard(instanceState.currentDb);

      // check replset uninitialized
      let members = await (
        await sh._database.getSiblingDB('config').getCollection('shards').find()
      )
        .sort({ _id: 1 })
        .toArray();
      expect(members.length).to.equal(0);

      // add new shards
      expect(
        (await sh.addShard(`${shardId}-0/${await rs0.hostport()}`)).shardAdded
      ).to.equal(`${shardId}-0`);
      expect(
        (await sh.addShard(`${shardId}-1/${await rs1.hostport()}`)).shardAdded
      ).to.equal(`${shardId}-1`);
      members = await (
        await sh._database.getSiblingDB('config').getCollection('shards').find()
      )
        .sort({ _id: 1 })
        .toArray();
      expect(members.length).to.equal(2);
      await sh._database.getSiblingDB(dbName).dropDatabase();
      await sh._database.getSiblingDB(dbName).createCollection('unsharded');
      await sh.enableSharding(dbName);
      await sh.shardCollection(ns, { key: 1 });
    });

    after(function () {
      return serviceProvider.close(true);
    });

    it('shows a full chunk list when there are 20 or less chunks', async function () {
      for (let i = 0; i < 19; i++) {
        await sh.splitAt(ns, { key: i + 1 });
      }
      const chunks = (await sh.status()).value.databases.find(
        (d: Document) => d.database._id === 'test'
      )?.collections[ns].chunks;
      expect(chunks.length).to.equal(20);
    });

    it('cuts a chunk list when there are more than 20 chunks', async function () {
      await sh.splitAt(ns, { key: 20 });
      const chunks = (await sh.status()).value.databases.find(
        (d: Document) => d.database._id === 'test'
      )?.collections[ns].chunks;
      expect(chunks.length).to.equal(21);
      expect(
        chunks.indexOf(
          'too many chunks to print, use verbose if you want to force print'
        )
      ).to.equal(20);
    });
  });
});
