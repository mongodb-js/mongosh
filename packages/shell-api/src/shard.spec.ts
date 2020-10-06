import { expect } from 'chai';
import { StubbedInstance, stubInterface } from 'ts-sinon';
import Shard from './shard';
import { ADMIN_DB, ALL_PLATFORMS, ALL_SERVER_VERSIONS, ALL_TOPOLOGIES, asShellResult } from './enums';
import { signatures } from './decorators';
import Mongo from './mongo';
import { bson, ServiceProvider, Cursor as ServiceProviderCursor } from '@mongosh/service-provider-core';
import { EventEmitter } from 'events';
import ShellInternalState from './shell-internal-state';
import { UpdateResult } from './result';

describe('Shard', () => {
  describe('help', () => {
    const apiClass: any = new Shard({});
    it('calls help function', async() => {
      expect((await apiClass.help()[asShellResult]()).type).to.equal('Help');
      expect((await apiClass.help[asShellResult]()).type).to.equal('Help');
    });
    it('calls help function for methods', async() => {
      expect((await apiClass.enableSharding.help()[asShellResult]()).type).to.equal('Help');
      expect((await apiClass.enableSharding.help[asShellResult]()).type).to.equal('Help');
    });
  });
  describe('signatures', () => {
    it('type', () => {
      expect(signatures.Shard.type).to.equal('Shard');
    });
    it('attributes', () => {
      expect(signatures.Shard.attributes.enableSharding).to.deep.equal({
        type: 'function',
        returnsPromise: true,
        returnType: { type: 'unknown', attributes: {} },
        platforms: ALL_PLATFORMS,
        topologies: ALL_TOPOLOGIES,
        serverVersions: ALL_SERVER_VERSIONS
      });
    });
    it('hasAsyncChild', () => {
      expect(signatures.Shard.hasAsyncChild).to.equal(true);
    });
  });
  describe('Metadata', () => {
    describe('asShellResult', () => {
      const mongo = { _uri: 'test_uri' } as Mongo;
      const db = new Shard(mongo);
      it('value', async() => {
        expect((await db[asShellResult]()).value).to.equal('Shard class connected to test_uri');
      });
      it('type', async() => {
        expect((await db[asShellResult]()).type).to.equal('Shard');
      });
    });
  });
  describe('commands', () => {
    let mongo: Mongo;
    let serviceProvider: StubbedInstance<ServiceProvider>;
    let shard: Shard;
    let bus: StubbedInstance<EventEmitter>;
    let internalState: ShellInternalState;

    beforeEach(() => {
      bus = stubInterface<EventEmitter>();
      serviceProvider = stubInterface<ServiceProvider>();
      serviceProvider.initialDb = 'test';
      serviceProvider.bsonLibrary = bson;
      serviceProvider.runCommand.resolves({ ok: 1 });
      serviceProvider.runCommandWithCheck.resolves({ ok: 1 });
      internalState = new ShellInternalState(serviceProvider, bus);
      mongo = new Mongo(internalState);
      shard = new Shard(mongo);
    });
    describe('enableSharding', () => {
      it('calls serviceProvider.runCommandWithCheck without optional arg', async() => {
        await shard.enableSharding('db.coll');

        expect(serviceProvider.runCommandWithCheck).to.have.been.calledWith(
          ADMIN_DB,
          {
            enableSharding: 'db.coll'
          }
        );
      });

      it('calls serviceProvider.runCommandWithCheck with arg', async() => {
        await shard.enableSharding('dbname', 'primaryShard');

        expect(serviceProvider.runCommandWithCheck).to.have.been.calledWith(
          ADMIN_DB,
          {
            enableSharding: 'dbname',
            primaryShard: 'primaryShard'
          }
        );
      });

      it('returns whatever serviceProvider.runCommandWithCheck returns', async() => {
        const expectedResult = { ok: 1 };
        serviceProvider.runCommandWithCheck.resolves(expectedResult);
        const result = await shard.enableSharding('dbname');
        expect(result).to.deep.equal(expectedResult);
      });

      it('throws if serviceProvider.runCommandWithCheck rejects', async() => {
        const expectedError = new Error();
        serviceProvider.runCommandWithCheck.rejects(expectedError);
        const catchedError = await shard.enableSharding('dbname')
          .catch(e => e);
        expect(catchedError).to.equal(expectedError);
      });
    });
    describe('shardCollection', () => {
      it('calls serviceProvider.runCommandWithCheck without optional args', async() => {
        await shard.shardCollection('db.coll', { key: 1 } );
        expect(serviceProvider.runCommandWithCheck).to.have.been.calledWith(
          ADMIN_DB,
          {
            shardCollection: 'db.coll',
            key: { key: 1 }
          }
        );
      });

      it('calls serviceProvider.runCommandWithCheck with optional args', async() => {
        await shard.shardCollection('db.coll', { key: 1 }, true, { option1: 1 });
        expect(serviceProvider.runCommandWithCheck).to.have.been.calledWith(
          ADMIN_DB,
          {
            shardCollection: 'db.coll',
            key: { key: 1 },
            unique: true,
            option1: 1
          }
        );
      });

      it('returns whatever serviceProvider.runCommandWithCheck returns', async() => {
        const expectedResult = { ok: 1 };
        serviceProvider.runCommandWithCheck.resolves(expectedResult);
        const result = await shard.shardCollection('db.coll', { key: 1 });
        expect(result).to.deep.equal(expectedResult);
      });

      it('throws if serviceProvider.runCommandWithCheck rejects', async() => {
        const expectedError = new Error();
        serviceProvider.runCommandWithCheck.rejects(expectedError);
        const catchedError = await shard.shardCollection('db.coll', { key: 1 })
          .catch(e => e);
        expect(catchedError).to.equal(expectedError);
      });
    });
    describe('addShard', () => {
      it('calls serviceProvider.runCommandWithCheck with arg', async() => {
        serviceProvider.runCommand.resolves({ ok: 1, msg: 'isdbgrid' });
        await shard.addShard('uri');

        expect(serviceProvider.runCommandWithCheck).to.have.been.calledWith(
          ADMIN_DB,
          {
            addShard: 'uri'
          }
        );
      });

      it('returns whatever serviceProvider.runCommandWithCheck returns', async() => {
        const expectedResult = { ok: 1 };
        serviceProvider.runCommand.resolves({ ok: 1, msg: 'isdbgrid' });
        serviceProvider.runCommandWithCheck.resolves(expectedResult);
        const result = await shard.addShard('uri');
        expect(result).to.deep.equal(expectedResult);
      });

      it('throws if serviceProvider.runCommandWithCheck rejects', async() => {
        serviceProvider.runCommand.resolves({ ok: 1, msg: 'isdbgrid' });
        const expectedError = new Error();
        serviceProvider.runCommandWithCheck.rejects(expectedError);
        const catchedError = await shard.addShard('uri')
          .catch(e => e);
        expect(catchedError).to.equal(expectedError);
      });

      it('throws if not mongos', async() => {
        const expectedResult = { ok: 1 };
        serviceProvider.runCommand.resolves({ ok: 1, msg: 'not dbgrid' });
        serviceProvider.runCommandWithCheck.resolves(expectedResult);
        const catchedError = await shard.addShard('uri')
          .catch(e => e);
        expect(catchedError.message).to.include('Not connected to a mongos');
      });
    });
    describe('addShardToZone', () => {
      it('calls serviceProvider.runCommandWithCheck with arg', async() => {
        serviceProvider.runCommand.resolves({ ok: 1, msg: 'isdbgrid' });
        await shard.addShardToZone('shard', 'zone');

        expect(serviceProvider.runCommandWithCheck).to.have.been.calledWith(
          ADMIN_DB,
          {
            addShardToZone: 'shard',
            zone: 'zone'
          }
        );
      });

      it('returns whatever serviceProvider.runCommandWithCheck returns', async() => {
        const expectedResult = { ok: 1 };
        serviceProvider.runCommand.resolves({ ok: 1, msg: 'isdbgrid' });
        serviceProvider.runCommandWithCheck.resolves(expectedResult);
        const result = await shard.addShardToZone('shard', 'zone');
        expect(result).to.deep.equal(expectedResult);
      });

      it('throws if serviceProvider.runCommandWithCheck rejects', async() => {
        serviceProvider.runCommand.resolves({ ok: 1, msg: 'isdbgrid' });
        const expectedError = new Error();
        serviceProvider.runCommandWithCheck.rejects(expectedError);
        const catchedError = await shard.addShardToZone('shard', 'zone')
          .catch(e => e);
        expect(catchedError).to.equal(expectedError);
      });

      it('throws if not mongos', async() => {
        const expectedResult = { ok: 1 };
        serviceProvider.runCommand.resolves({ ok: 1, msg: 'not dbgrid' });
        serviceProvider.runCommandWithCheck.resolves(expectedResult);
        const catchedError = await shard.addShardToZone('shard', 'zone')
          .catch(e => e);
        expect(catchedError.message).to.include('Not connected to a mongos');
      });
    });
    describe('addShardTag', () => {
      it('calls serviceProvider.runCommandWithCheck with arg', async() => {
        serviceProvider.runCommand.resolves({ ok: 1, msg: 'isdbgrid' });
        await shard.addShardTag('shard', 'zone');

        expect(serviceProvider.runCommandWithCheck).to.have.been.calledWith(
          ADMIN_DB,
          {
            addShardToZone: 'shard',
            zone: 'zone'
          }
        );
      });

      it('returns whatever serviceProvider.runCommandWithCheck returns', async() => {
        const expectedResult = { ok: 1 };
        serviceProvider.runCommand.resolves({ ok: 1, msg: 'isdbgrid' });
        serviceProvider.runCommandWithCheck.resolves(expectedResult);
        const result = await shard.addShardTag('shard', 'zone');
        expect(result).to.deep.equal(expectedResult);
      });

      it('throws if serviceProvider.runCommandWithCheck rejects', async() => {
        serviceProvider.runCommand.resolves({ ok: 1, msg: 'isdbgrid' });
        const expectedError = new Error();
        serviceProvider.runCommandWithCheck.rejects(expectedError);
        const catchedError = await shard.addShardTag('shard', 'zone')
          .catch(e => e);
        expect(catchedError).to.equal(expectedError);
      });

      it('throws if not mongos', async() => {
        const expectedResult = { ok: 1 };
        serviceProvider.runCommand.resolves({ ok: 1, msg: 'not dbgrid' });
        serviceProvider.runCommandWithCheck.resolves(expectedResult);
        const catchedError = await shard.addShardTag('shard', 'zone')
          .catch(e => e);
        expect(catchedError.message).to.include('Not connected to a mongos');
      });

      it('adds version suggestion if command not found', async() => {
        serviceProvider.runCommand.resolves({ ok: 1, msg: 'isdbgrid' });
        const expectedError = new Error();
        (expectedError as any).codeName = 'CommandNotFound';
        serviceProvider.runCommandWithCheck.rejects(expectedError);
        const catchedError = await shard.addShardTag('shard', 'zone')
          .catch(e => e);
        expect(catchedError.message).to.include('> 3.4');
      });
    });
    describe('updateZoneKeyRange', () => {
      it('calls serviceProvider.runCommandWithCheck with arg', async() => {
        serviceProvider.runCommand.resolves({ ok: 1, msg: 'isdbgrid' });
        await shard.updateZoneKeyRange('ns', { min: 0 }, { max: 1 }, 'zone');

        expect(serviceProvider.runCommandWithCheck).to.have.been.calledWith(
          ADMIN_DB,
          {
            updateZoneKeyRange: 'ns',
            min: { min: 0 },
            max: { max: 1 },
            zone: 'zone'
          }
        );
      });

      it('returns whatever serviceProvider.runCommandWithCheck returns', async() => {
        const expectedResult = { ok: 1 };
        serviceProvider.runCommand.resolves({ ok: 1, msg: 'isdbgrid' });
        serviceProvider.runCommandWithCheck.resolves(expectedResult);
        const result = await shard.updateZoneKeyRange('ns', {}, {}, 'zone');
        expect(result).to.deep.equal(expectedResult);
      });

      it('throws if serviceProvider.runCommandWithCheck rejects', async() => {
        serviceProvider.runCommand.resolves({ ok: 1, msg: 'isdbgrid' });
        const expectedError = new Error();
        serviceProvider.runCommandWithCheck.rejects(expectedError);
        const catchedError = await shard.updateZoneKeyRange('ns', {}, {}, 'zone')
          .catch(e => e);
        expect(catchedError).to.equal(expectedError);
      });

      it('throws if not mongos', async() => {
        const expectedResult = { ok: 1 };
        serviceProvider.runCommand.resolves({ ok: 1, msg: 'not dbgrid' });
        serviceProvider.runCommandWithCheck.resolves(expectedResult);
        const catchedError = await shard.updateZoneKeyRange('ns', {}, {}, 'zone')
          .catch(e => e);
        expect(catchedError.message).to.include('Not connected to a mongos');
      });
    });
    describe('addTagRange', () => {
      it('calls serviceProvider.runCommandWithCheck with arg', async() => {
        serviceProvider.runCommand.resolves({ ok: 1, msg: 'isdbgrid' });
        await shard.addTagRange('ns', { min: 0 }, { max: 1 }, 'zone');

        expect(serviceProvider.runCommandWithCheck).to.have.been.calledWith(
          ADMIN_DB,
          {
            updateZoneKeyRange: 'ns',
            min: { min: 0 },
            max: { max: 1 },
            zone: 'zone'
          }
        );
      });

      it('returns whatever serviceProvider.runCommandWithCheck returns', async() => {
        const expectedResult = { ok: 1 };
        serviceProvider.runCommand.resolves({ ok: 1, msg: 'isdbgrid' });
        serviceProvider.runCommandWithCheck.resolves(expectedResult);
        const result = await shard.addTagRange('ns', {}, {}, 'zone');
        expect(result).to.deep.equal(expectedResult);
      });

      it('throws if serviceProvider.runCommandWithCheck rejects', async() => {
        serviceProvider.runCommand.resolves({ ok: 1, msg: 'isdbgrid' });
        const expectedError = new Error();
        serviceProvider.runCommandWithCheck.rejects(expectedError);
        const catchedError = await shard.addTagRange('ns', {}, {}, 'zone')
          .catch(e => e);
        expect(catchedError).to.equal(expectedError);
      });

      it('throws if not mongos', async() => {
        const expectedResult = { ok: 1 };
        serviceProvider.runCommand.resolves({ ok: 1, msg: 'not dbgrid' });
        serviceProvider.runCommandWithCheck.resolves(expectedResult);
        const catchedError = await shard.addTagRange('ns', {}, {}, 'zone')
          .catch(e => e);
        expect(catchedError.message).to.include('Not connected to a mongos');
      });

      it('adds version suggestion if command not found', async() => {
        serviceProvider.runCommand.resolves({ ok: 1, msg: 'isdbgrid' });
        const expectedError = new Error();
        (expectedError as any).codeName = 'CommandNotFound';
        serviceProvider.runCommandWithCheck.rejects(expectedError);
        const catchedError = await shard.addTagRange('ns', {}, {}, 'zone')
          .catch(e => e);
        expect(catchedError.message).to.include('> 3.4');
      });
    });
    describe('removeRangeFromZone', () => {
      it('calls serviceProvider.runCommandWithChek with arg', async() => {
        serviceProvider.runCommand.resolves({ ok: 1, msg: 'isdbgrid' });
        await shard.removeRangeFromZone('ns', { min: 1 }, { max: 1 });

        expect(serviceProvider.runCommandWithCheck).to.have.been.calledWith(
          ADMIN_DB,
          {
            updateZoneKeyRange: 'ns',
            min: {
              min: 1
            },
            max: {
              max: 1
            },
            zone: null
          }
        )
        ;
      });

      it('returns whatever serviceProvider.updateZoneKeyRange returns', async() => {
        serviceProvider.runCommand.resolves({ ok: 1, msg: 'isdbgrid' });
        const expectedResult = { ok: 1, msg: 'isdbgrid' };
        serviceProvider.runCommandWithCheck.resolves(expectedResult);
        const result = await shard.removeRangeFromZone('ns', { min: 1 }, { max: 1 });
        expect(result).to.deep.equal(expectedResult);
      });

      it('throws if serviceProvider.updateZoneKeyRange rejects', async() => {
        serviceProvider.runCommand.resolves({ ok: 1, msg: 'isdbgrid' });
        const expectedError = new Error();
        serviceProvider.runCommandWithCheck.rejects(expectedError);
        const catchedError = await shard.removeRangeFromZone('ns', { min: 1 }, { max: 1 })
          .catch(e => e);
        expect(catchedError).to.equal(expectedError);
      });
      it('throws if not mongos', async() => {
        const expectedResult = { ok: 1, msg: 'isdbgrid' };
        serviceProvider.runCommand.resolves({ ok: 1, msg: 'not dbgrid' });
        serviceProvider.runCommandWithCheck.resolves(expectedResult);
        const catchedError = await shard.removeRangeFromZone('ns', {}, {})
          .catch(e => e);
        expect(catchedError.message).to.include('Not connected to a mongos');
      });
    });
    describe('removeTagRange', () => {
      it('calls serviceProvider.runCommandWithCheck with arg', async() => {
        serviceProvider.runCommand.resolves({ ok: 1, msg: 'isdbgrid' });
        await shard.removeTagRange('ns', { min: 1 }, { max: 1 });

        expect(serviceProvider.runCommandWithCheck).to.have.been.calledWith(
          ADMIN_DB,
          {
            updateZoneKeyRange: 'ns',
            min: {
              min: 1
            },
            max: {
              max: 1
            },
            zone: null
          }
        )
        ;
      });

      it('returns whatever serviceProvider.runCommandWithCheck returns', async() => {
        serviceProvider.runCommand.resolves({ ok: 1, msg: 'isdbgrid' });
        const expectedResult = { ok: 1, msg: 'isdbgrid' };
        serviceProvider.runCommandWithCheck.resolves(expectedResult);
        const result = await shard.removeTagRange('ns', { min: 1 }, { max: 1 });
        expect(result).to.deep.equal(expectedResult);
      });

      it('throws if serviceProvider.runCommandWithCheck rejects', async() => {
        serviceProvider.runCommand.resolves({ ok: 1, msg: 'isdbgrid' });
        const expectedError = new Error();
        serviceProvider.runCommandWithCheck.rejects(expectedError);
        const catchedError = await shard.removeTagRange('ns', { min: 1 }, { max: 1 })
          .catch(e => e);
        expect(catchedError).to.equal(expectedError);
      });
      it('throws if not mongos', async() => {
        const expectedResult = { ok: 1 };
        serviceProvider.runCommand.resolves({ ok: 1, msg: 'not dbgrid' });
        serviceProvider.runCommandWithCheck.resolves(expectedResult);
        const catchedError = await shard.removeTagRange('ns', {}, {})
          .catch(e => e);
        expect(catchedError.message).to.include('Not connected to a mongos');
      });
      it('adds version suggestion if command not found', async() => {
        serviceProvider.runCommand.resolves({ ok: 1, msg: 'isdbgrid' });
        const expectedError = new Error();
        (expectedError as any).codeName = 'CommandNotFound';
        serviceProvider.runCommandWithCheck.rejects(expectedError);
        const catchedError = await shard.removeTagRange('ns', {}, {})
          .catch(e => e);
        expect(catchedError.message).to.include('> 3.4');
      });
    });
    describe('removeShardFromZone', () => {
      it('calls serviceProvider.runCommandWithCheck with arg', async() => {
        serviceProvider.runCommand.resolves({ ok: 1, msg: 'isdbgrid' });
        await shard.removeShardFromZone('shard', 'zone');

        expect(serviceProvider.runCommandWithCheck).to.have.been.calledWith(
          ADMIN_DB,
          {
            removeShardFromZone: 'shard',
            zone: 'zone'
          }
        );
      });

      it('returns whatever serviceProvider.runCommandWithCheck returns', async() => {
        serviceProvider.runCommand.resolves({ ok: 1, msg: 'isdbgrid' });
        const expectedResult = { ok: 1 };
        serviceProvider.runCommandWithCheck.resolves(expectedResult);
        const result = await shard.removeShardFromZone('shard', 'zone');
        expect(result).to.deep.equal(expectedResult);
      });

      it('throws if serviceProvider.runCommandWithCheck rejects', async() => {
        serviceProvider.runCommand.resolves({ ok: 1, msg: 'isdbgrid' });
        const expectedError = new Error();
        serviceProvider.runCommandWithCheck.rejects(expectedError);
        const catchedError = await shard.removeShardFromZone('shard', 'zone')
          .catch(e => e);
        expect(catchedError).to.equal(expectedError);
      });
      it('throws if not mongos', async() => {
        const expectedResult = { ok: 1 };
        serviceProvider.runCommand.resolves({ ok: 1, msg: 'not dbgrid' });
        serviceProvider.runCommandWithCheck.resolves(expectedResult);
        const catchedError = await shard.removeShardFromZone('shard', 'zone')
          .catch(e => e);
        expect(catchedError.message).to.include('Not connected to a mongos');
      });
    });
    describe('removeShardTag', () => {
      it('calls serviceProvider.runCommandWithCheck with arg', async() => {
        serviceProvider.runCommand.resolves({ ok: 1, msg: 'isdbgrid' });
        await shard.removeShardTag('shard', 'zone');

        expect(serviceProvider.runCommandWithCheck).to.have.been.calledWith(
          ADMIN_DB,
          {
            removeShardFromZone: 'shard',
            zone: 'zone'
          }
        );
      });

      it('returns whatever serviceProvider.runCommandWithCheck returns', async() => {
        serviceProvider.runCommand.resolves({ ok: 1, msg: 'isdbgrid' });
        const expectedResult = { ok: 1 };
        serviceProvider.runCommandWithCheck.resolves(expectedResult);
        const result = await shard.removeShardTag('shard', 'zone');
        expect(result).to.deep.equal(expectedResult);
      });

      it('throws if serviceProvider.runCommandWithCheck rejects', async() => {
        serviceProvider.runCommand.resolves({ ok: 1, msg: 'isdbgrid' });
        const expectedError = new Error();
        serviceProvider.runCommandWithCheck.rejects(expectedError);
        const catchedError = await shard.removeShardTag('shard', 'zone')
          .catch(e => e);
        expect(catchedError).to.equal(expectedError);
      });
      it('throws if not mongos', async() => {
        const expectedResult = { ok: 1 };
        serviceProvider.runCommand.resolves({ ok: 1, msg: 'not dbgrid' });
        serviceProvider.runCommandWithCheck.resolves(expectedResult);
        const catchedError = await shard.removeShardTag('shard', 'zone')
          .catch(e => e);
        expect(catchedError.message).to.include('Not connected to a mongos');
      });
      it('adds version suggestion if command not found', async() => {
        serviceProvider.runCommand.resolves({ ok: 1, msg: 'isdbgrid' });
        const expectedError = new Error();
        (expectedError as any).codeName = 'CommandNotFound';
        serviceProvider.runCommandWithCheck.rejects(expectedError);
        const catchedError = await shard.removeShardTag('shard', 'tag')
          .catch(e => e);
        expect(catchedError.message).to.include('> 3.4');
      });
    });
    describe('enableAutoSplit', () => {
      it('calls serviceProvider.updateOne', async() => {
        serviceProvider.runCommand.resolves({ ok: 1, msg: 'isdbgrid' });
        const expectedResult = {
          matchedCount: 1,
          modifiedCount: 1,
          upsertedCount: 1,
          upsertedId: 0,
          result: { ok: 1 }
        };
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

      it('returns whatever serviceProvider.updateOne returns', async() => {
        serviceProvider.runCommand.resolves({ ok: 1, msg: 'isdbgrid' });
        const expectedResult = {
          matchedCount: 1,
          modifiedCount: 1,
          upsertedCount: 1,
          upsertedId: 0,
          result: { ok: 1 }
        };
        serviceProvider.updateOne.resolves(expectedResult);
        const result = await shard.enableAutoSplit();
        expect(result).to.deep.equal(new UpdateResult(1, 1, 1, 1, 0));
      });

      it('throws if serviceProvider.updateOne rejects', async() => {
        serviceProvider.runCommand.resolves({ ok: 1, msg: 'isdbgrid' });
        const expectedError = new Error();
        serviceProvider.updateOne.rejects(expectedError);
        const catchedError = await shard.enableAutoSplit()
          .catch(e => e);
        expect(catchedError).to.equal(expectedError);
      });

      it('throws if not mongos', async() => {
        const expectedResult = { ok: 1 };
        serviceProvider.runCommand.resolves({ ok: 1, msg: 'not dbgrid' });
        serviceProvider.updateOne.resolves(expectedResult);
        const catchedError = await shard.enableAutoSplit()
          .catch(e => e);
        expect(catchedError.message).to.include('Not connected to a mongos');
      });
    });
    describe('disableAutoSplit', () => {
      it('calls serviceProvider.updateOne', async() => {
        serviceProvider.runCommand.resolves({ ok: 1, msg: 'isdbgrid' });
        const expectedResult = {
          matchedCount: 1,
          modifiedCount: 1,
          upsertedCount: 1,
          upsertedId: 0,
          result: { ok: 1 }
        };
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

      it('returns whatever serviceProvider.updateOne returns', async() => {
        serviceProvider.runCommand.resolves({ ok: 1, msg: 'isdbgrid' });
        const expectedResult = {
          matchedCount: 1,
          modifiedCount: 1,
          upsertedCount: 1,
          upsertedId: 0,
          result: { ok: 1 }
        };
        serviceProvider.updateOne.resolves(expectedResult);
        const result = await shard.disableAutoSplit();
        expect(result).to.deep.equal(new UpdateResult(1, 1, 1, 1, 0));
      });

      it('throws if serviceProvider.updateOne rejects', async() => {
        serviceProvider.runCommand.resolves({ ok: 1, msg: 'isdbgrid' });
        const expectedError = new Error();
        serviceProvider.updateOne.rejects(expectedError);
        const catchedError = await shard.disableAutoSplit()
          .catch(e => e);
        expect(catchedError).to.equal(expectedError);
      });

      it('throws if not mongos', async() => {
        const expectedResult = { ok: 1 };
        serviceProvider.runCommand.resolves({ ok: 1, msg: 'not dbgrid' });
        serviceProvider.updateOne.resolves(expectedResult);
        const catchedError = await shard.disableAutoSplit()
          .catch(e => e);
        expect(catchedError.message).to.include('Not connected to a mongos');
      });
    });
    describe('splitAt', () => {
      it('calls serviceProvider.runCommandWithCheck with arg', async() => {
        serviceProvider.runCommand.resolves({ ok: 1, msg: 'isdbgrid' });
        await shard.splitAt('ns', { query: 1 });

        expect(serviceProvider.runCommandWithCheck).to.have.been.calledWith(
          ADMIN_DB,
          {
            split: 'ns',
            middle: {
              query: 1
            }
          }
        );
      });

      it('returns whatever serviceProvider.runCommandWithCheck returns', async() => {
        serviceProvider.runCommand.resolves({ ok: 1, msg: 'isdbgrid' });
        const expectedResult = { ok: 1 };
        serviceProvider.runCommandWithCheck.resolves(expectedResult);
        const result = await shard.splitAt('ns', { query: 1 });
        expect(result).to.deep.equal(expectedResult);
      });

      it('throws if serviceProvider.runCommandWithCheck rejects', async() => {
        serviceProvider.runCommand.resolves({ ok: 1, msg: 'isdbgrid' });
        const expectedError = new Error();
        serviceProvider.runCommandWithCheck.rejects(expectedError);
        const catchedError = await shard.splitAt('ns', { query: 1 })
          .catch(e => e);
        expect(catchedError).to.equal(expectedError);
      });
    });
    describe('splitFind', () => {
      it('calls serviceProvider.runCommandWithCheck with arg', async() => {
        serviceProvider.runCommand.resolves({ ok: 1, msg: 'isdbgrid' });
        await shard.splitFind('ns', { query: 1 });

        expect(serviceProvider.runCommandWithCheck).to.have.been.calledWith(
          ADMIN_DB,
          {
            split: 'ns',
            find: {
              query: 1
            }
          }
        );
      });

      it('returns whatever serviceProvider.runCommandWithCheck returns', async() => {
        serviceProvider.runCommand.resolves({ ok: 1, msg: 'isdbgrid' });
        const expectedResult = { ok: 1 };
        serviceProvider.runCommandWithCheck.resolves(expectedResult);
        const result = await shard.splitFind('ns', { query: 1 });
        expect(result).to.deep.equal(expectedResult);
      });

      it('throws if serviceProvider.runCommandWithCheck rejects', async() => {
        serviceProvider.runCommand.resolves({ ok: 1, msg: 'isdbgrid' });
        const expectedError = new Error();
        serviceProvider.runCommandWithCheck.rejects(expectedError);
        const catchedError = await shard.splitFind('ns', { query: 1 })
          .catch(e => e);
        expect(catchedError).to.equal(expectedError);
      });
    });
    describe('moveChunk', () => {
      it('calls serviceProvider.runCommandWithCheck with arg', async() => {
        serviceProvider.runCommand.resolves({ ok: 1, msg: 'isdbgrid' });
        await shard.moveChunk('ns', { query: 1 }, 'destination');

        expect(serviceProvider.runCommandWithCheck).to.have.been.calledWith(
          ADMIN_DB,
          {
            moveChunk: 'ns', find: { query: 1 }, to: 'destination'
          }
        );
      });

      it('returns whatever serviceProvider.runCommandWithCheck returns', async() => {
        serviceProvider.runCommand.resolves({ ok: 1, msg: 'isdbgrid' });
        const expectedResult = { ok: 1 };
        serviceProvider.runCommandWithCheck.resolves(expectedResult);
        const result = await shard.moveChunk('ns', { query: 1 }, 'destination');
        expect(result).to.deep.equal(expectedResult);
      });

      it('throws if serviceProvider.runCommandWithCheck rejects', async() => {
        serviceProvider.runCommand.resolves({ ok: 1, msg: 'isdbgrid' });
        const expectedError = new Error();
        serviceProvider.runCommandWithCheck.rejects(expectedError);
        const catchedError = await shard.moveChunk('ns', { query: 1 }, 'destination')
          .catch(e => e);
        expect(catchedError).to.equal(expectedError);
      });
    });
    describe('balancerCollectionStatus', () => {
      it('calls serviceProvider.runCommandWithCheck with arg', async() => {
        await shard.balancerCollectionStatus('ns');

        expect(serviceProvider.runCommandWithCheck).to.have.been.calledWith(
          ADMIN_DB,
          {
            balancerCollectionStatus: 'ns'
          }
        );
      });

      it('returns whatever serviceProvider.runCommandWithCheck returns', async() => {
        const expectedResult = { ok: 1 };
        serviceProvider.runCommandWithCheck.resolves(expectedResult);
        const result = await shard.balancerCollectionStatus('ns');
        expect(result).to.deep.equal(expectedResult);
      });

      it('throws if serviceProvider.runCommandWithCheck rejects', async() => {
        const expectedError = new Error();
        serviceProvider.runCommandWithCheck.rejects(expectedError);
        const catchedError = await shard.balancerCollectionStatus('ns')
          .catch(e => e);
        expect(catchedError).to.equal(expectedError);
      });
    });
    describe('disableBalancing', () => {
      it('calls serviceProvider.updateOne', async() => {
        serviceProvider.runCommand.resolves({ ok: 1, msg: 'isdbgrid' });
        const expectedResult = {
          matchedCount: 1,
          modifiedCount: 1,
          upsertedCount: 1,
          upsertedId: 0,
          result: { ok: 1 }
        };
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

      it('returns whatever serviceProvider.updateOne returns', async() => {
        serviceProvider.runCommand.resolves({ ok: 1, msg: 'isdbgrid' });
        const expectedResult = {
          matchedCount: 1,
          modifiedCount: 1,
          upsertedCount: 1,
          upsertedId: 0,
          result: { ok: 1 }
        };
        serviceProvider.updateOne.resolves(expectedResult);
        const result = await shard.disableBalancing('ns');
        expect(result).to.deep.equal(new UpdateResult(1, 1, 1, 1, 0));
      });

      it('throws if serviceProvider.updateOne rejects', async() => {
        serviceProvider.runCommand.resolves({ ok: 1, msg: 'isdbgrid' });
        const expectedError = new Error();
        serviceProvider.updateOne.rejects(expectedError);
        const catchedError = await shard.disableBalancing('ns')
          .catch(e => e);
        expect(catchedError).to.equal(expectedError);
      });

      it('throws if not mongos', async() => {
        const expectedResult = { ok: 1 };
        serviceProvider.runCommand.resolves({ ok: 1, msg: 'not dbgrid' });
        serviceProvider.updateOne.resolves(expectedResult);
        const catchedError = await shard.disableBalancing('ns')
          .catch(e => e);
        expect(catchedError.message).to.include('Not connected to a mongos');
      });
    });
    describe('enableBalancing', () => {
      it('calls serviceProvider.updateOne', async() => {
        serviceProvider.runCommand.resolves({ ok: 1, msg: 'isdbgrid' });
        const expectedResult = {
          matchedCount: 1,
          modifiedCount: 1,
          upsertedCount: 1,
          upsertedId: 0,
          result: { ok: 1 }
        };
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

      it('returns whatever serviceProvider.updateOne returns', async() => {
        serviceProvider.runCommand.resolves({ ok: 1, msg: 'isdbgrid' });
        const expectedResult = {
          matchedCount: 1,
          modifiedCount: 1,
          upsertedCount: 1,
          upsertedId: 0,
          result: { ok: 1 }
        };
        serviceProvider.updateOne.resolves(expectedResult);
        const result = await shard.enableBalancing('ns');
        expect(result).to.deep.equal(new UpdateResult(1, 1, 1, 1, 0));
      });

      it('throws if serviceProvider.updateOne rejects', async() => {
        serviceProvider.runCommand.resolves({ ok: 1, msg: 'isdbgrid' });
        const expectedError = new Error();
        serviceProvider.updateOne.rejects(expectedError);
        const catchedError = await shard.enableBalancing('ns')
          .catch(e => e);
        expect(catchedError).to.equal(expectedError);
      });

      it('throws if not mongos', async() => {
        const expectedResult = { ok: 1 };
        serviceProvider.runCommand.resolves({ ok: 1, msg: 'not dbgrid' });
        serviceProvider.updateOne.resolves(expectedResult);
        const catchedError = await shard.enableBalancing('ns')
          .catch(e => e);
        expect(catchedError.message).to.include('Not connected to a mongos');
      });
    });
    describe('getBalancerState', () => {
      it('returns whatever serviceProvider.find returns', async() => {
        serviceProvider.runCommand.resolves({ ok: 1, msg: 'isdbgrid' });
        const expectedResult = { stopped: true };
        const findCursor = stubInterface<ServiceProviderCursor>();
        findCursor.next.resolves(expectedResult);
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

      it('throws if serviceProvider.find rejects', async() => {
        serviceProvider.runCommand.resolves({ ok: 1, msg: 'isdbgrid' });
        const expectedError = new Error();
        serviceProvider.find.throws(expectedError);
        const catchedError = await shard.getBalancerState()
          .catch(e => e);
        expect(catchedError).to.equal(expectedError);
      });

      it('throws if not mongos', async() => {
        const expectedResult = { ok: 1 };
        serviceProvider.runCommand.resolves({ ok: 1, msg: 'not dbgrid' });
        serviceProvider.find.resolves(expectedResult);
        const catchedError = await shard.getBalancerState()
          .catch(e => e);
        expect(catchedError.message).to.include('Not connected to a mongos');
      });
    });
    describe('isBalancerRunning', () => {
      it('calls serviceProvider.runCommandWithCheck', async() => {
        serviceProvider.runCommand.resolves({ ok: 1, msg: 'isdbgrid' });
        await shard.isBalancerRunning();

        expect(serviceProvider.runCommandWithCheck).to.have.been.calledWith(
          ADMIN_DB,
          {
            balancerStatus: 1
          }
        );
      });

      it('returns whatever serviceProvider.runCommandWithCheck returns', async() => {
        serviceProvider.runCommand.resolves({ ok: 1, msg: 'isdbgrid' });
        const expectedResult = { ok: 1 };
        serviceProvider.runCommandWithCheck.resolves(expectedResult);
        const result = await shard.isBalancerRunning();
        expect(result).to.deep.equal(expectedResult);
      });

      it('throws if serviceProvider.runCommandWithCheck rejects', async() => {
        serviceProvider.runCommand.resolves({ ok: 1, msg: 'isdbgrid' });
        const expectedError = new Error();
        serviceProvider.runCommandWithCheck.rejects(expectedError);
        const catchedError = await shard.isBalancerRunning()
          .catch(e => e);
        expect(catchedError).to.equal(expectedError);
      });
      it('throws if not mongos', async() => {
        const expectedResult = { ok: 1 };
        serviceProvider.runCommand.resolves({ ok: 1, msg: 'not dbgrid' });
        serviceProvider.runCommandWithCheck.resolves(expectedResult);
        const catchedError = await shard.isBalancerRunning()
          .catch(e => e);
        expect(catchedError.message).to.include('Not connected to a mongos');
      });
    });
    describe('startBalancer', () => {
      it('calls serviceProvider.runCommandWithCheck with arg', async() => {
        await shard.startBalancer(10000);

        expect(serviceProvider.runCommandWithCheck).to.have.been.calledWith(
          ADMIN_DB,
          {
            balancerStart: 1, maxTimeMS: 10000
          }
        );
      });
      it('calls serviceProvider.runCommandWithCheck with no arg', async() => {
        await shard.startBalancer();

        expect(serviceProvider.runCommandWithCheck).to.have.been.calledWith(
          ADMIN_DB,
          {
            balancerStart: 1, maxTimeMS: 60000
          }
        );
      });

      it('returns whatever serviceProvider.runCommandWithCheck returns', async() => {
        const expectedResult = { ok: 1 };
        serviceProvider.runCommandWithCheck.resolves(expectedResult);
        const result = await shard.startBalancer(10000);
        expect(result).to.deep.equal(expectedResult);
      });

      it('throws if serviceProvider.runCommandWithCheck rejects', async() => {
        const expectedError = new Error();
        serviceProvider.runCommandWithCheck.rejects(expectedError);
        const catchedError = await shard.startBalancer(10000)
          .catch(e => e);
        expect(catchedError).to.equal(expectedError);
      });
    });
    describe('stopBalancer', () => {
      it('calls serviceProvider.runCommandWithCheck with arg', async() => {
        await shard.stopBalancer(10000);

        expect(serviceProvider.runCommandWithCheck).to.have.been.calledWith(
          ADMIN_DB,
          {
            balancerStop: 1, maxTimeMS: 10000
          }
        );
      });
      it('calls serviceProvider.runCommandWithCheck with no arg', async() => {
        await shard.stopBalancer();

        expect(serviceProvider.runCommandWithCheck).to.have.been.calledWith(
          ADMIN_DB,
          {
            balancerStop: 1, maxTimeMS: 60000
          }
        );
      });

      it('returns whatever serviceProvider.runCommandWithCheck returns', async() => {
        const expectedResult = { ok: 1 };
        serviceProvider.runCommandWithCheck.resolves(expectedResult);
        const result = await shard.stopBalancer(10000);
        expect(result).to.deep.equal(expectedResult);
      });

      it('throws if serviceProvider.runCommandWithCheck rejects', async() => {
        const expectedError = new Error();
        serviceProvider.runCommandWithCheck.rejects(expectedError);
        const catchedError = await shard.stopBalancer(10000)
          .catch(e => e);
        expect(catchedError).to.equal(expectedError);
      });
    });
    describe('setBalancerState', () => {
      it('calls serviceProvider.runCommandWithCheck with arg=true', async() => {
        const expectedResult = { ok: 1 };
        serviceProvider.runCommandWithCheck.resolves(expectedResult);
        const result = await shard.setBalancerState(true);

        expect(serviceProvider.runCommandWithCheck).to.have.been.calledWith(
          ADMIN_DB,
          {
            balancerStart: 1, maxTimeMS: 60000
          }
        );
        expect(result).to.deep.equal(expectedResult);
      });
      it('calls serviceProvider.runCommandWithCheck with arg=false', async() => {
        const expectedResult = { ok: 1 };
        serviceProvider.runCommandWithCheck.resolves(expectedResult);
        const result = await shard.setBalancerState(false);

        expect(serviceProvider.runCommandWithCheck).to.have.been.calledWith(
          ADMIN_DB,
          {
            balancerStop: 1, maxTimeMS: 60000
          }
        );
        expect(result).to.deep.equal(expectedResult);
      });

      it('throws if serviceProvider.runCommandWithCheck rejects', async() => {
        const expectedError = new Error();
        serviceProvider.runCommandWithCheck.rejects(expectedError);
        const catchedError = await shard.setBalancerState(true)
          .catch(e => e);
        expect(catchedError).to.equal(expectedError);
      });
    });
  });
});
