import { expect } from 'chai';
import { StubbedInstance, stubInterface } from 'ts-sinon';
import Shard from './shard';
import { ADMIN_DB, ALL_PLATFORMS, ALL_SERVER_VERSIONS, ALL_TOPOLOGIES, asShellResult } from './enums';
import { signatures } from './decorators';
import Mongo from './mongo';
import { bson, ServiceProvider } from '@mongosh/service-provider-core';
import { EventEmitter } from 'events';
import ShellInternalState from './shell-internal-state';

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
        expect(catchedError.message).to.include('Are you connected to version > 3.4?');
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
        expect(catchedError.message).to.include('Are you connected to version > 3.4?');
      });
    });
  });
});
