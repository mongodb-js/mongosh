import { bson, ServiceProvider, Cursor as ServiceProviderCursor } from '@mongosh/service-provider-core';
import { StubbedInstance, stubInterface } from 'ts-sinon';
import ShellInternalState from './shell-internal-state';
import { signatures } from './decorators';
import ReplicaSet from './replica-set';
import { EventEmitter } from 'events';
import { expect } from 'chai';
import Mongo from './mongo';
import {
  ADMIN_DB,
  ALL_PLATFORMS,
  ALL_SERVER_VERSIONS,
  ALL_TOPOLOGIES,
  asShellResult
} from './enums';

describe('ReplicaSet', () => {
  describe('help', () => {
    const apiClass: any = new ReplicaSet({});

    it('calls help function', async() => {
      expect((await apiClass.help()[asShellResult]()).type).to.equal('Help');
      expect((await apiClass.help[asShellResult]()).type).to.equal('Help');
    });

    it('calls help function for methods', async() => {
      expect((await apiClass.initiate.help()[asShellResult]()).type).to.equal('Help');
      expect((await apiClass.initiate.help[asShellResult]()).type).to.equal('Help');
    });
  });

  describe('signatures', () => {
    it('type', () => {
      expect(signatures.ReplicaSet.type).to.equal('ReplicaSet');
    });

    it('attributes', () => {
      expect(signatures.ReplicaSet.attributes.initiate).to.deep.equal({
        type: 'function',
        returnsPromise: true,
        returnType: { type: 'unknown', attributes: {} },
        platforms: ALL_PLATFORMS,
        topologies: ALL_TOPOLOGIES,
        serverVersions: ALL_SERVER_VERSIONS
      });
    });

    it('hasAsyncChild', () => {
      expect(signatures.ReplicaSet.hasAsyncChild).to.equal(true);
    });
  });

  describe('commands', () => {
    let mongo: Mongo;
    let serviceProvider: StubbedInstance<ServiceProvider>;
    let rs: ReplicaSet;
    let bus: StubbedInstance<EventEmitter>;
    let internalState: ShellInternalState;

    const findResolvesWith = (expectedResult) => {
      const findCursor = stubInterface<ServiceProviderCursor>();
      findCursor.next.resolves(expectedResult);
      serviceProvider.find.returns(findCursor);
    };

    beforeEach(() => {
      bus = stubInterface<EventEmitter>();
      serviceProvider = stubInterface<ServiceProvider>();
      serviceProvider.initialDb = 'test';
      serviceProvider.bsonLibrary = bson;
      serviceProvider.runCommand.resolves({ ok: 1 });
      serviceProvider.runCommandWithCheck.resolves({ ok: 1 });
      internalState = new ShellInternalState(serviceProvider, bus);
      mongo = new Mongo(internalState);
      rs = new ReplicaSet(mongo);
    });

    describe('initiate', () => {
      const configDoc = {
        _id: 'my_replica_set',
        members: [
          { _id: 0, host: 'rs1.example.net:27017' },
          { _id: 1, host: 'rs2.example.net:27017' },
          { _id: 2, host: 'rs3.example.net', arbiterOnly: true },
        ]
      };

      it('calls serviceProvider.runCommandWithCheck without optional arg', async() => {
        await rs.initiate();

        expect(serviceProvider.runCommandWithCheck).to.have.been.calledWith(
          ADMIN_DB,
          {
            replSetInitiate: {}
          }
        );
      });

      it('calls serviceProvider.runCommandWithCheck with arg', async() => {
        await rs.initiate(configDoc);

        expect(serviceProvider.runCommandWithCheck).to.have.been.calledWith(
          ADMIN_DB,
          {
            replSetInitiate: configDoc
          }
        );
      });

      it('returns whatever serviceProvider.runCommandWithCheck returns', async() => {
        const expectedResult = { ok: 1 };
        serviceProvider.runCommandWithCheck.resolves(expectedResult);
        const result = await rs.initiate(configDoc);

        expect(result).to.deep.equal(expectedResult);
      });

      it('throws if serviceProvider.runCommandWithCheck rejects', async() => {
        const expectedError = new Error();
        serviceProvider.runCommandWithCheck.rejects(expectedError);
        const caughtError = await rs.initiate(configDoc)
          .catch(e => e);

        expect(caughtError).to.equal(expectedError);
      });
    });

    describe('config', () => {
      it('calls serviceProvider.runCommandWithCheck', async() => {
        const expectedResult = { config: { version: 1, members: [], settings: {} } };
        serviceProvider.runCommandWithCheck.resolves(expectedResult);
        await rs.config();

        expect(serviceProvider.runCommandWithCheck).to.have.been.calledWith(
          ADMIN_DB,
          {
            replSetReconfig: 1
          }
        );
      });

      it('returns whatever serviceProvider.runCommandWithCheck returns', async() => {
        // not using the full object for expected result, as we should check this in an e2e test.
        const expectedResult = { config: { version: 1, members: [], settings: {} } };
        serviceProvider.runCommandWithCheck.resolves(expectedResult);
        const result = await rs.config();

        expect(result).to.deep.equal(expectedResult.config);
      });

      it('throws if serviceProvider.runCommandWithCheck rejects', async() => {
        const expectedResult = { config: { version: 1, members: [], settings: {} } };
        serviceProvider.runCommandWithCheck.resolves(expectedResult);
        const expectedError = new Error();
        serviceProvider.runCommandWithCheck.rejects(expectedError);
        const caughtError = await rs.config()
          .catch(e => e);

        expect(caughtError).to.equal(expectedError);
      });

      it('calls find if serviceProvider.runCommandWithCheck rejects with command not found', async() => {
        const expectedError = new Error() as any;
        expectedError.codeName = 'CommandNotFound';
        serviceProvider.runCommandWithCheck.rejects(expectedError);
        const expectedResult = { res: true };
        const findCursor = stubInterface<ServiceProviderCursor>();
        findCursor.next.resolves(expectedResult);
        serviceProvider.find.returns(findCursor);

        const conf = await rs.config();
        expect(serviceProvider.find).to.have.been.calledWith(
          'local', 'system.replset', {}, {}
        );
        expect(conf).to.deep.equal(expectedResult);
      });
    });

    describe('reconfig', () => {
      const configDoc = {
        _id: 'my_replica_set',
        members: [
          { _id: 0, host: 'rs1.example.net:27017' },
          { _id: 1, host: 'rs2.example.net:27017' },
          { _id: 2, host: 'rs3.example.net', arbiterOnly: true },
        ]
      };

      it('calls serviceProvider.runCommandWithCheck without optional arg', async() => {
        serviceProvider.runCommandWithCheck.resolves({ config: { version: 1 } });
        await rs.reconfig(configDoc);

        expect(serviceProvider.runCommandWithCheck).to.have.been.calledWith(
          ADMIN_DB,
          {
            replSetReconfig: {
              _id: 'my_replica_set',
              members: [
                { _id: 0, host: 'rs1.example.net:27017' },
                { _id: 1, host: 'rs2.example.net:27017' },
                { _id: 2, host: 'rs3.example.net', arbiterOnly: true },
              ],
              version: 2
            }
          }
        );
      });

      it('calls serviceProvider.runCommandWithCheck with arg', async() => {
        serviceProvider.runCommandWithCheck.resolves({ config: 1 });
        await rs.reconfig(configDoc, { force: true });

        expect(serviceProvider.runCommandWithCheck).to.have.been.calledWith(
          ADMIN_DB,
          {
            replSetReconfig: {
              _id: 'my_replica_set',
              members: [
                { _id: 0, host: 'rs1.example.net:27017' },
                { _id: 1, host: 'rs2.example.net:27017' },
                { _id: 2, host: 'rs3.example.net', arbiterOnly: true },
              ],
              version: 1
            },
            force: true
          }
        );
      });
    });
    describe('status', () => {
      it('calls serviceProvider.runCommandWithCheck', async() => {
        await rs.status();

        expect(serviceProvider.runCommandWithCheck).to.have.been.calledWith(
          ADMIN_DB,
          {
            replSetGetStatus: 1
          }
        );
      });

      it('returns whatever serviceProvider.runCommandWithCheck returns', async() => {
        const expectedResult = { ok: 1 };
        serviceProvider.runCommandWithCheck.resolves(expectedResult);
        const result = await rs.status();
        expect(result).to.deep.equal(expectedResult);
      });

      it('throws if serviceProvider.runCommandWithCheck rejects', async() => {
        const expectedError = new Error();
        serviceProvider.runCommandWithCheck.rejects(expectedError);
        const catchedError = await rs.status()
          .catch(e => e);
        expect(catchedError).to.equal(expectedError);
      });
    });
    describe('isMaster', () => {
      it('calls serviceProvider.runCommandWithCheck', async() => {
        await rs.isMaster();

        expect(serviceProvider.runCommandWithCheck).to.have.been.calledWith(
          ADMIN_DB,
          {
            isMaster: 1
          }
        );
      });

      it('returns whatever serviceProvider.runCommandWithCheck returns', async() => {
        const expectedResult = { ok: 1 };
        serviceProvider.runCommandWithCheck.resolves(expectedResult);
        const result = await rs.isMaster();
        expect(result).to.deep.equal(expectedResult);
      });

      it('throws if serviceProvider.runCommandWithCheck rejects', async() => {
        const expectedError = new Error();
        serviceProvider.runCommandWithCheck.rejects(expectedError);
        const catchedError = await rs.isMaster()
          .catch(e => e);
        expect(catchedError).to.equal(expectedError);
      });
    });
    describe('add', () => {
      it('calls serviceProvider.runCommandWithCheck with no arb and string hostport', async() => {
        const configDoc = { version: 1, members: [{ _id: 0 }, { _id: 1 }] };
        const hostname = 'localhost:27017';
        findResolvesWith(configDoc);
        serviceProvider.countDocuments.resolves(1);
        const expectedResult = { ok: 1 };
        serviceProvider.runCommandWithCheck.resolves(expectedResult);
        const result = await rs.add(hostname);

        expect(serviceProvider.runCommandWithCheck).to.have.been.calledWith(
          ADMIN_DB,
          {
            replSetReconfig: {
              version: 2,
              members: [
                { _id: 0 },
                { _id: 1 },
                { _id: 2, host: hostname }
              ]
            }
          }
        );
        expect(result).to.deep.equal(expectedResult);
      });
      it('calls serviceProvider.runCommandWithCheck with arb and string hostport', async() => {
        const configDoc = { version: 1, members: [{ _id: 0 }, { _id: 1 }] };
        const hostname = 'localhost:27017';
        findResolvesWith(configDoc);
        serviceProvider.countDocuments.resolves(1);
        const expectedResult = { ok: 1 };
        serviceProvider.runCommandWithCheck.resolves(expectedResult);
        const result = await rs.add(hostname, true);

        expect(serviceProvider.runCommandWithCheck).to.have.been.calledWith(
          ADMIN_DB,
          {
            replSetReconfig: {
              version: 2,
              members: [
                { _id: 0 },
                { _id: 1 },
                { _id: 2, arbiterOnly: true, host: hostname }
              ]
            }
          }
        );
        expect(result).to.deep.equal(expectedResult);
      });

      it('calls serviceProvider.runCommandWithCheck with no arb and obj hostport', async() => {
        const configDoc = { version: 1, members: [{ _id: 0 }, { _id: 1 }] };
        const hostname = {
          host: 'localhost:27017'
        };
        findResolvesWith(configDoc);
        serviceProvider.countDocuments.resolves(1);
        const expectedResult = { ok: 1 };
        serviceProvider.runCommandWithCheck.resolves(expectedResult);
        const result = await rs.add(hostname);

        expect(serviceProvider.runCommandWithCheck).to.have.been.calledWith(
          ADMIN_DB,
          {
            replSetReconfig: {
              version: 2,
              members: [
                { _id: 0 },
                { _id: 1 },
                { _id: 2, host: hostname.host }
              ]
            }
          }
        );
        expect(result).to.deep.equal(expectedResult);
      });

      it('calls serviceProvider.runCommandWithCheck with no arb and obj hostport, uses _id', async() => {
        const configDoc = { version: 1, members: [{ _id: 0 }, { _id: 1 }] };
        const hostname = {
          host: 'localhost:27017', _id: 10
        };
        findResolvesWith(configDoc);
        serviceProvider.countDocuments.resolves(1);
        const expectedResult = { ok: 1 };
        serviceProvider.runCommandWithCheck.resolves(expectedResult);
        const result = await rs.add(hostname);

        expect(serviceProvider.runCommandWithCheck).to.have.been.calledWith(
          ADMIN_DB,
          {
            replSetReconfig: {
              version: 2,
              members: [
                { _id: 0 },
                { _id: 1 },
                hostname
              ]
            }
          }
        );
        expect(result).to.deep.equal(expectedResult);
      });

      it('throws with arb and object hostport', async() => {
        const configDoc = { version: 1, members: [{ _id: 0 }, { _id: 1 }] };
        const hostname = { host: 'localhost:27017' };
        findResolvesWith(configDoc);
        serviceProvider.countDocuments.resolves(1);
        const expectedResult = { ok: 1 };
        serviceProvider.runCommandWithCheck.resolves(expectedResult);
        const error = await rs.add(hostname, true).catch(e => e);
        expect(error.name).to.equal('MongoshInvalidInputError');
      });
      it('throws if local.system.replset.count <= 1', async() => {
        const configDoc = { version: 1, members: [{ _id: 0 }, { _id: 1 }] };
        const hostname = { host: 'localhost:27017' };
        findResolvesWith(configDoc);
        serviceProvider.countDocuments.resolves(2);
        const error = await rs.add(hostname, true).catch(e => e);
        expect(error.name).to.equal('MongoshRuntimeError');
      });
      it('throws if local.system.replset.findOne has no docs', async() => {
        const hostname = { host: 'localhost:27017' };
        findResolvesWith(null);
        serviceProvider.countDocuments.resolves(1);
        const error = await rs.add(hostname, true).catch(e => e);
        expect(error.name).to.equal('MongoshRuntimeError');
      });

      it('throws if serviceProvider.runCommandWithCheck rejects', async() => {
        const configDoc = { version: 1, members: [{ _id: 0 }, { _id: 1 }] };
        findResolvesWith(configDoc);
        serviceProvider.countDocuments.resolves(1);
        const expectedError = new Error();
        serviceProvider.runCommandWithCheck.rejects(expectedError);
        const catchedError = await rs.add('hostname')
          .catch(e => e);
        expect(catchedError).to.equal(expectedError);
      });
    });
    describe('remove', () => {
      it('calls serviceProvider.runCommandWithCheck', async() => {
        const configDoc = { version: 1, members: [{ _id: 0, host: 'localhost:0' }, { _id: 1, host: 'localhost:1' }] };
        const hostname = 'localhost:0';
        findResolvesWith(configDoc);
        serviceProvider.countDocuments.resolves(1);
        const expectedResult = { ok: 1 };
        serviceProvider.runCommandWithCheck.resolves(expectedResult);
        const result = await rs.remove(hostname);

        expect(serviceProvider.runCommandWithCheck).to.have.been.calledWith(
          ADMIN_DB,
          {
            replSetReconfig: {
              version: 2,
              members: [
                { _id: 1, host: 'localhost:1' }
              ]
            }
          }
        );
        expect(result).to.deep.equal(expectedResult);
      });
      it('throws with object hostport', async() => {
        const hostname = { host: 'localhost:27017' } as any;
        const error = await rs.remove(hostname).catch(e => e);
        expect(error.name).to.equal('MongoshInvalidInputError');
      });
      it('throws if local.system.replset.count <= 1', async() => {
        const configDoc = { version: 1, members: [{ _id: 0, host: 'localhost:0' }, { _id: 1, host: 'lcoalhost:1' }] };
        findResolvesWith(configDoc);
        serviceProvider.countDocuments.resolves(0);
        const error = await rs.remove('').catch(e => e);
        expect(error.name).to.equal('MongoshRuntimeError');
      });
      it('throws if local.system.replset.count <= 1', async() => {
        findResolvesWith(null);
        serviceProvider.countDocuments.resolves(1);
        const error = await rs.remove('').catch(e => e);
        expect(error.name).to.equal('MongoshRuntimeError');
      });
      it('throws if serviceProvider.runCommandWithCheck rejects', async() => {
        const configDoc = { version: 1, members: [{ _id: 0, host: 'localhost:0' }, { _id: 1, host: 'localhost:1' }] };
        findResolvesWith(configDoc);
        serviceProvider.countDocuments.resolves(1);
        const expectedError = new Error();
        serviceProvider.runCommandWithCheck.rejects(expectedError);
        const catchedError = await rs.remove('localhost:1')
          .catch(e => e);
        expect(catchedError).to.equal(expectedError);
      });
      it('throws if hostname not in members', async() => {
        const configDoc = { version: 1, members: [{ _id: 0, host: 'localhost:0' }, { _id: 1, host: 'lcoalhost:1' }] };
        findResolvesWith(configDoc);
        serviceProvider.countDocuments.resolves(1);
        const catchedError = await rs.remove('localhost:2')
          .catch(e => e);
        expect(catchedError.name).to.equal('MongoshInvalidInputError');
      });
    });
    describe('freeze', () => {
      it('calls serviceProvider.runCommandWithCheck', async() => {
        await rs.freeze(100);

        expect(serviceProvider.runCommandWithCheck).to.have.been.calledWith(
          ADMIN_DB,
          {
            replSetFreeze: 100
          }
        );
      });

      it('returns whatever serviceProvider.runCommandWithCheck returns', async() => {
        const expectedResult = { ok: 1 };
        serviceProvider.runCommandWithCheck.resolves(expectedResult);
        const result = await rs.freeze(100);
        expect(result).to.deep.equal(expectedResult);
      });

      it('throws if serviceProvider.runCommandWithCheck rejects', async() => {
        const expectedError = new Error();
        serviceProvider.runCommandWithCheck.rejects(expectedError);
        const catchedError = await rs.freeze(100)
          .catch(e => e);
        expect(catchedError).to.equal(expectedError);
      });
    });
    describe('syncFrom', () => {
      it('calls serviceProvider.runCommandWithCheck', async() => {
        await rs.syncFrom('localhost:27017');

        expect(serviceProvider.runCommandWithCheck).to.have.been.calledWith(
          ADMIN_DB,
          {
            replSetSyncFrom: 'localhost:27017'
          }
        );
      });

      it('returns whatever serviceProvider.runCommandWithCheck returns', async() => {
        const expectedResult = { ok: 1 };
        serviceProvider.runCommandWithCheck.resolves(expectedResult);
        const result = await rs.syncFrom('localhost:27017');
        expect(result).to.deep.equal(expectedResult);
      });

      it('throws if serviceProvider.runCommandWithCheck rejects', async() => {
        const expectedError = new Error();
        serviceProvider.runCommandWithCheck.rejects(expectedError);
        const catchedError = await rs.syncFrom('localhost:27017')
          .catch(e => e);
        expect(catchedError).to.equal(expectedError);
      });
    });
    describe('stepDown', () => {
      it('calls serviceProvider.runCommandWithCheck without any arg', async() => {
        await rs.stepDown();

        expect(serviceProvider.runCommandWithCheck).to.have.been.calledWith(
          ADMIN_DB,
          {
            replSetStepDown: 60
          }
        );
      });
      it('calls serviceProvider.runCommandWithCheck without second optional arg', async() => {
        await rs.stepDown(10);

        expect(serviceProvider.runCommandWithCheck).to.have.been.calledWith(
          ADMIN_DB,
          {
            replSetStepDown: 10
          }
        );
      });

      it('calls serviceProvider.runCommandWithCheck with arg', async() => {
        await rs.stepDown(10, 30);

        expect(serviceProvider.runCommandWithCheck).to.have.been.calledWith(
          ADMIN_DB,
          {
            replSetStepDown: 10,
            secondaryCatchUpPeriodSecs: 30
          }
        );
      });

      it('returns whatever serviceProvider.runCommandWithCheck returns', async() => {
        const expectedResult = { ok: 1 };
        serviceProvider.runCommandWithCheck.resolves(expectedResult);
        const result = await rs.stepDown(10);
        expect(result).to.deep.equal(expectedResult);
      });

      it('throws if serviceProvider.runCommandWithCheck rejects', async() => {
        const expectedError = new Error();
        serviceProvider.runCommandWithCheck.rejects(expectedError);
        const catchedError = await rs.stepDown(10)
          .catch(e => e);
        expect(catchedError).to.equal(expectedError);
      });
    });
  });
});
