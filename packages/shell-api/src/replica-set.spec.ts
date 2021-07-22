import { CommonErrors, MongoshInvalidInputError, MongoshRuntimeError } from '@mongosh/errors';
import { bson, Document, FindCursor as ServiceProviderCursor, ServiceProvider } from '@mongosh/service-provider-core';
import chai, { expect } from 'chai';
import { EventEmitter } from 'events';
import semver from 'semver';
import sinonChai from 'sinon-chai';
import sinon, { StubbedInstance, stubInterface } from 'ts-sinon';
import { ensureMaster } from '../../../testing/helpers';
import { MongodSetup, skipIfServerVersion, startTestCluster, skipIfApiStrict } from '../../../testing/integration-testing-hooks';
import { CliServiceProvider } from '../../service-provider-server';
import Database from './database';
import {
  ADMIN_DB,
  ALL_PLATFORMS,
  ALL_SERVER_VERSIONS,
  ALL_API_VERSIONS,
  ALL_TOPOLOGIES
} from './enums';
import { signatures, toShellResult } from './index';
import Mongo from './mongo';
import ReplicaSet, { ReplSetConfig, ReplSetMemberConfig } from './replica-set';
import ShellInternalState, { EvaluationListener } from './shell-internal-state';
chai.use(sinonChai);

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

describe('ReplicaSet', () => {
  skipIfApiStrict();
  describe('help', () => {
    const apiClass: any = new ReplicaSet({} as any);

    it('calls help function', async() => {
      expect((await toShellResult(apiClass.help())).type).to.equal('Help');
      expect((await toShellResult(apiClass.help)).type).to.equal('Help');
    });

    it('calls help function for methods', async() => {
      expect((await toShellResult(apiClass.initiate.help())).type).to.equal('Help');
      expect((await toShellResult(apiClass.initiate.help)).type).to.equal('Help');
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
        deprecated: false,
        returnType: { type: 'unknown', attributes: {} },
        platforms: ALL_PLATFORMS,
        topologies: ALL_TOPOLOGIES,
        apiVersions: ALL_API_VERSIONS,
        serverVersions: ALL_SERVER_VERSIONS,
        isDirectShellCommand: false,
        shellCommandCompleter: undefined
      });
    });
  });

  describe('unit', () => {
    let mongo: Mongo;
    let serviceProvider: StubbedInstance<ServiceProvider>;
    let evaluationListener: StubbedInstance<EvaluationListener>;
    let rs: ReplicaSet;
    let bus: StubbedInstance<EventEmitter>;
    let internalState: ShellInternalState;
    let db: Database;

    beforeEach(() => {
      bus = stubInterface<EventEmitter>();
      serviceProvider = stubInterface<ServiceProvider>();
      serviceProvider.initialDb = 'test';
      serviceProvider.bsonLibrary = bson;
      serviceProvider.runCommand.resolves({ ok: 1 });
      serviceProvider.runCommandWithCheck.resolves({ ok: 1 });
      evaluationListener = stubInterface<EvaluationListener>();
      internalState = new ShellInternalState(serviceProvider, bus);
      internalState.setEvaluationListener(evaluationListener);
      mongo = new Mongo(internalState, undefined, undefined, undefined, serviceProvider);
      db = new Database(mongo, 'testdb');
      rs = new ReplicaSet(db);
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
            replSetGetConfig: 1
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
        findCursor.tryNext.resolves(expectedResult);
        serviceProvider.find.returns(findCursor);

        const conf = await rs.config();
        expect(serviceProvider.find).to.have.been.calledWith(
          'local', 'system.replset', {}, {}
        );
        expect(conf).to.deep.equal(expectedResult);
      });
    });

    describe('reconfig', () => {
      const configDoc: Partial<ReplSetConfig> = {
        _id: 'my_replica_set',
        members: [
          { _id: 0, host: 'rs1.example.net:27017' },
          { _id: 1, host: 'rs2.example.net:27017' },
          { _id: 2, host: 'rs3.example.net', arbiterOnly: true },
        ]
      };

      it('calls serviceProvider.runCommandWithCheck without optional arg', async() => {
        serviceProvider.runCommandWithCheck.resolves({ config: { version: 1, protocolVersion: 1 } });
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
              version: 2,
              protocolVersion: 1
            }
          }
        );
      });

      it('calls serviceProvider.runCommandWithCheck with arg', async() => {
        serviceProvider.runCommandWithCheck.resolves({ config: 1, protocolVersion: 1 });
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
              version: 1,
              protocolVersion: 1
            },
            force: true
          }
        );
      });

      describe('retry on errors', () => {
        let oldConfig: Partial<ReplSetConfig>;
        let reconfigCalls: ReplSetConfig[];
        let reconfigResults: Document[];
        let sleepStub: any;

        beforeEach(() => {
          sleepStub = sinon.stub();
          internalState.shellApi.sleep = sleepStub;
          reconfigCalls = [];

          // eslint-disable-next-line @typescript-eslint/require-await
          serviceProvider.runCommandWithCheck.callsFake(async(db: string, cmd: Document) => {
            if (cmd.replSetGetConfig) {
              return { config: { ...oldConfig, version: oldConfig.version ?? 1 } };
            }
            if (cmd.replSetReconfig) {
              const result = reconfigResults.shift();
              reconfigCalls.push(deepClone(cmd.replSetReconfig));
              if (result.ok) {
                return result;
              }
              oldConfig = { ...oldConfig, version: (oldConfig.version ?? 1) + 1 };
              throw new Error(`Reconfig failed: ${JSON.stringify(result)}`);
            }
          });
        });

        it('does three reconfigs if the first two fail due to known issue', async() => {
          oldConfig = deepClone(configDoc);
          reconfigResults = [ { ok: 0 }, { ok: 0 }, { ok: 1 } ];

          const origConfig = deepClone(configDoc);
          await rs.reconfig(configDoc);
          expect(reconfigCalls).to.deep.equal([
            { ...origConfig, version: 2 },
            { ...origConfig, version: 3 },
            { ...origConfig, version: 4 }
          ]);
          expect(sleepStub).to.have.been.calledWith(1000);
          expect(sleepStub).to.have.been.calledWith(1300);
        });

        it('gives up after a number of attempts', async() => {
          oldConfig = deepClone(configDoc);
          reconfigResults = [...Array(20).keys()].map(() => ({ ok: 0 }));
          try {
            await rs.reconfig(configDoc);
            expect.fail('missed exception');
          } catch (err) {
            expect(err.message).to.equal('Reconfig failed: {"ok":0}');
          }
          expect(evaluationListener.onPrint).to.have.been.calledWith([
            await toShellResult('Reconfig did not succeed yet, starting new attempt...')
          ]);
          const totalSleepLength = sleepStub.getCalls()
            .map(({ firstArg }) => firstArg)
            .reduce((x, y) => x + y, 0);
          // Expect to spend about a minute sleeping here.
          expect(totalSleepLength).to.be.closeTo(60_000, 5_000);
          expect(reconfigCalls).to.have.lengthOf(12);
        });
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
    describe('hello', () => {
      it('calls serviceProvider.runCommandWithCheck', async() => {
        await rs.hello();

        expect(serviceProvider.runCommandWithCheck).to.have.been.calledWith(
          ADMIN_DB,
          {
            hello: 1
          }
        );
      });

      it('returns whatever serviceProvider.runCommandWithCheck returns', async() => {
        const expectedResult = { ok: 1 };
        serviceProvider.runCommandWithCheck.resolves(expectedResult);
        const result = await rs.hello();
        expect(result).to.deep.equal(expectedResult);
      });

      it('throws if serviceProvider.runCommandWithCheck rejects', async() => {
        const expectedError = new Error();
        serviceProvider.runCommandWithCheck.rejects(expectedError);
        const catchedError = await rs.hello()
          .catch(e => e);
        expect(catchedError).to.equal(expectedError);
      });
    });
    describe('add', () => {
      it('calls serviceProvider.runCommandWithCheck with no arb and string hostport', async() => {
        const configDoc = { version: 1, members: [{ _id: 0 }, { _id: 1 }] };
        const hostname = 'localhost:27017';
        const expectedResult = { ok: 1 };
        // eslint-disable-next-line @typescript-eslint/require-await
        serviceProvider.runCommandWithCheck.callsFake(async(db, command) => {
          if (command.replSetGetConfig) {return { ok: 1, config: configDoc };}
          return expectedResult;
        });
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
        serviceProvider.countDocuments.resolves(1);
        const expectedResult = { ok: 1 };
        // eslint-disable-next-line @typescript-eslint/require-await
        serviceProvider.runCommandWithCheck.callsFake(async(db, command) => {
          if (command.replSetGetConfig) {return { ok: 1, config: configDoc };}
          return expectedResult;
        });
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
        serviceProvider.countDocuments.resolves(1);
        const expectedResult = { ok: 1 };
        // eslint-disable-next-line @typescript-eslint/require-await
        serviceProvider.runCommandWithCheck.callsFake(async(db, command) => {
          if (command.replSetGetConfig) {return { ok: 1, config: configDoc };}
          return expectedResult;
        });
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
        serviceProvider.countDocuments.resolves(1);
        const expectedResult = { ok: 1 };
        // eslint-disable-next-line @typescript-eslint/require-await
        serviceProvider.runCommandWithCheck.callsFake(async(db, command) => {
          if (command.replSetGetConfig) {return { ok: 1, config: configDoc };}
          return expectedResult;
        });
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
        serviceProvider.countDocuments.resolves(1);
        const expectedResult = { ok: 1 };
        // eslint-disable-next-line @typescript-eslint/require-await
        serviceProvider.runCommandWithCheck.callsFake(async(db, command) => {
          if (command.replSetGetConfig) {return { ok: 1, config: configDoc };}
          return expectedResult;
        });

        const error = await rs.add(hostname, true).catch(e => e);
        expect(error).to.be.instanceOf(MongoshInvalidInputError);
        expect(error.code).to.equal(CommonErrors.InvalidArgument);
      });
      it('throws if local.system.replset.findOne has no docs', async() => {
        const hostname = { host: 'localhost:27017' };
        serviceProvider.runCommandWithCheck.resolves({ ok: 1 });
        const error = await rs.add(hostname, true).catch(e => e);
        expect(error).to.be.instanceOf(MongoshRuntimeError);
        expect(error.code).to.equal(CommonErrors.CommandFailed);
      });

      it('throws if serviceProvider.runCommandWithCheck rejects', async() => {
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
        const expectedResult = { ok: 1 };
        // eslint-disable-next-line @typescript-eslint/require-await
        serviceProvider.runCommandWithCheck.callsFake(async(db, command) => {
          if (command.replSetGetConfig) {return { ok: 1, config: configDoc };}
          return expectedResult;
        });
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
      it('throws if serviceProvider.runCommandWithCheck rejects', async() => {
        const expectedError = new Error();
        serviceProvider.runCommandWithCheck.rejects(expectedError);
        const catchedError = await rs.remove('localhost:1')
          .catch(e => e);
        expect(catchedError).to.equal(expectedError);
      });
      it('throws if hostname not in members', async() => {
        const configDoc = { version: 1, members: [{ _id: 0, host: 'localhost:0' }, { _id: 1, host: 'lcoalhost:1' }] };
        serviceProvider.runCommandWithCheck.resolves({ ok: 1, config: configDoc });
        const catchedError = await rs.remove('localhost:2')
          .catch(e => e);
        expect(catchedError).to.be.instanceOf(MongoshInvalidInputError);
        expect(catchedError.code).to.equal(CommonErrors.InvalidArgument);
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
    describe('reconfigForPSASet', () => {
      let secondary: ReplSetMemberConfig;
      let config: Partial<ReplSetConfig>;
      let oldConfig: ReplSetConfig;
      let reconfigCalls: ReplSetConfig[];
      let reconfigResults: Document[];
      let sleepStub: any;

      beforeEach(() => {
        sleepStub = sinon.stub();
        internalState.shellApi.sleep = sleepStub;
        secondary = {
          _id: 2, host: 'secondary.mongodb.net', priority: 1, votes: 1
        };
        oldConfig = {
          _id: 'replSet',
          members: [
            { _id: 0, host: 'primary.monogdb.net', priority: 1, votes: 1 },
            { _id: 1, host: 'arbiter.monogdb.net', priority: 1, votes: 0, arbiterOnly: true }
          ],
          protocolVersion: 1,
          version: 1
        };
        config = deepClone(oldConfig);
        config.members.push(secondary);
        reconfigResults = [ { ok: 1 }, { ok: 1 } ];
        reconfigCalls = [];

        // eslint-disable-next-line @typescript-eslint/require-await
        serviceProvider.runCommandWithCheck.callsFake(async(db: string, cmd: Document) => {
          if (cmd.replSetGetConfig) {
            return { config: oldConfig };
          }
          if (cmd.replSetReconfig) {
            const result = reconfigResults.shift();
            reconfigCalls.push(deepClone(cmd.replSetReconfig));
            if (result.ok) {
              oldConfig = deepClone(cmd.replSetReconfig);
              return result;
            }
            throw new Error(`Reconfig failed: ${JSON.stringify(result)}`);
          }
        });
      });

      it('fails if index is incorrect', async() => {
        try {
          await rs.reconfigForPSASet(3, config);
          expect.fail('missed exception');
        } catch (err) {
          expect(err.message).to.equal('[COMMON-10001] Node at index 3 does not exist in the new config');
        }
      });

      it('fails if secondary.votes != 1', async() => {
        secondary.votes = 0;
        try {
          await rs.reconfigForPSASet(2, config);
          expect.fail('missed exception');
        } catch (err) {
          expect(err.message).to.equal('[COMMON-10001] Node at index 2 must have { votes: 1 } in the new config (actual: { votes: 0 })');
        }
      });

      it('fails if old note had votes', async() => {
        oldConfig.members.push(secondary);
        try {
          await rs.reconfigForPSASet(2, config);
          expect.fail('missed exception');
        } catch (err) {
          expect(err.message).to.equal('[COMMON-10001] Node at index 2 must have { votes: 0 } in the old config (actual: { votes: 1 })');
        }
      });

      it('warns if there is an existing member with the same host', async() => {
        oldConfig.members.push(deepClone(secondary));
        secondary._id = 3;
        await rs.reconfigForPSASet(2, config);
        expect(evaluationListener.onPrint).to.have.been.calledWith([
          await toShellResult(
            'Warning: Node at index 2 has { host: "secondary.mongodb.net" }, ' +
              'which is also present in the old config, but with a different _id field.')
        ]);
      });

      it('skips the second reconfig if priority is 0', async() => {
        secondary.priority = 0;
        await rs.reconfigForPSASet(2, config);
        expect(reconfigCalls).to.deep.equal([
          { ...config, version: 2 }
        ]);
        expect(evaluationListener.onPrint).to.have.been.calledWith([
          await toShellResult('Running first reconfig to give member at index 2 { votes: 1, priority: 0 }')
        ]);
        expect(evaluationListener.onPrint).to.have.been.calledWith([
          await toShellResult('No second reconfig necessary because .priority = 0')
        ]);
      });

      it('does two reconfigs if priority is 1', async() => {
        const origConfig = deepClone(config);
        await rs.reconfigForPSASet(2, config);
        expect(reconfigCalls).to.deep.equal([
          { ...origConfig, members: [ config.members[0], config.members[1], { ...secondary, priority: 0 } ], version: 2 },
          { ...origConfig, version: 3 }
        ]);
        expect(evaluationListener.onPrint).to.have.been.calledWith([
          await toShellResult('Running first reconfig to give member at index 2 { votes: 1, priority: 0 }')
        ]);
        expect(evaluationListener.onPrint).to.have.been.calledWith([
          await toShellResult('Running second reconfig to give member at index 2 { priority: 1 }')
        ]);
      });

      it('does three reconfigs the second one fails', async() => {
        reconfigResults = [{ ok: 1 }, { ok: 0 }, { ok: 1 }];
        const origConfig = deepClone(config);
        await rs.reconfigForPSASet(2, config);
        expect(reconfigCalls).to.deep.equal([
          { ...origConfig, members: [ config.members[0], config.members[1], { ...secondary, priority: 0 } ], version: 2 },
          { ...origConfig, version: 3 },
          { ...origConfig, version: 3 }
        ]);
        expect(evaluationListener.onPrint).to.have.been.calledWith([
          await toShellResult('Running first reconfig to give member at index 2 { votes: 1, priority: 0 }')
        ]);
        expect(evaluationListener.onPrint).to.have.been.calledWith([
          await toShellResult('Running second reconfig to give member at index 2 { priority: 1 }')
        ]);
        expect(sleepStub).to.have.been.calledWith(1000);
      });

      it('gives up after a number of attempts', async() => {
        reconfigResults = [...Array(20).keys()].map((i) => ({ ok: i === 0 ? 1 : 0 }));
        try {
          await rs.reconfigForPSASet(2, config);
          expect.fail('missed exception');
        } catch (err) {
          expect(err.message).to.equal('Reconfig failed: {"ok":0}');
        }
        expect(evaluationListener.onPrint).to.have.been.calledWith([
          await toShellResult('Running first reconfig to give member at index 2 { votes: 1, priority: 0 }')
        ]);
        expect(evaluationListener.onPrint).to.have.been.calledWith([
          await toShellResult('Running second reconfig to give member at index 2 { priority: 1 }')
        ]);
        expect(evaluationListener.onPrint).to.have.been.calledWith([
          await toShellResult('Reconfig did not succeed yet, starting new attempt...')
        ]);
        expect(evaluationListener.onPrint).to.have.been.calledWith([
          await toShellResult('Second reconfig did not succeed, giving up')
        ]);
        const totalSleepLength = sleepStub.getCalls()
          .map(({ firstArg }) => firstArg)
          .reduce((x, y) => x + y, 0);
        // Expect to spend about a minute sleeping here.
        expect(totalSleepLength).to.be.closeTo(60_000, 5_000);
        expect(reconfigCalls).to.have.lengthOf(1 + 12);
      });
    });
  });

  describe('integration (standard setup)', () => {
    const replId = 'rs0';

    const [ srv0, srv1, srv2, srv3 ] = startTestCluster(
      ['--single', '--replSet', replId],
      ['--single', '--replSet', replId],
      ['--single', '--replSet', replId],
      ['--single', '--replSet', replId]
    );

    let cfg: Partial<ReplSetConfig>;
    let additionalServer: MongodSetup;
    let serviceProvider: CliServiceProvider;
    let internalState: ShellInternalState;
    let rs: ReplicaSet;

    before(async function() {
      this.timeout(100_000);
      cfg = {
        _id: replId,
        members: [
          { _id: 0, host: `${await srv0.hostport()}`, priority: 1 },
          { _id: 1, host: `${await srv1.hostport()}`, priority: 0 },
          { _id: 2, host: `${await srv2.hostport()}`, priority: 0 }
        ]
      };
      additionalServer = srv3;

      serviceProvider = await CliServiceProvider.connect(`${await srv0.connectionString()}?directConnection=true`, {}, {}, new EventEmitter());
      internalState = new ShellInternalState(serviceProvider);
      rs = new ReplicaSet(internalState.currentDb);

      // check replset uninitialized
      try {
        await rs.status();
        expect.fail();
      } catch (error) {
        expect(error.message).to.include('no replset config');
      }
      const result = await rs.initiate(cfg);
      expect(result.ok).to.equal(1);
      // https://jira.mongodb.org/browse/SERVER-55371
      // expect(result.$clusterTime).to.not.be.undefined;
    });

    beforeEach(async() => {
      await ensureMaster(rs, 1000, await srv0.hostport());
      expect((await rs.conf()).members.length).to.equal(3);
    });

    after(() => {
      return serviceProvider.close(true);
    });

    describe('replica set info', () => {
      it('returns the status', async() => {
        const result = await rs.status();
        expect(result.set).to.equal(replId);
      });
      it('returns the config', async() => {
        const result = await rs.conf();
        expect(result._id).to.equal(replId);
      });
      it('is connected to master', async() => {
        const result = await rs.isMaster();
        expect(result.ismaster).to.be.true;
      });
      it('returns StatsResult for print secondary replication info', async() => {
        const result = await rs.printSecondaryReplicationInfo();
        expect(result.type).to.equal('StatsResult');
      });
      it('returns StatsResult for print replication info', async() => {
        const result = await rs.printReplicationInfo();
        expect(result.type).to.equal('StatsResult');
      });
      it('returns data for db.getReplicationInfo', async() => {
        const result = await rs._database.getReplicationInfo();
        expect(Object.keys(result)).to.include('logSizeMB');
      });
    });
    describe('reconfig', () => {
      it('reconfig with one less secondary', async() => {
        const newcfg: Partial<ReplSetConfig> = {
          _id: replId,
          members: [ cfg.members[0], cfg.members[1] ]
        };
        const version = (await rs.conf()).version;
        const result = await rs.reconfig(newcfg);
        expect(result.ok).to.equal(1);
        const status = await rs.conf();
        expect(status.members.length).to.equal(2);
        expect(status.version).to.be.greaterThan(version);
      });
      afterEach(async() => {
        await rs.reconfig(cfg);
        const status = await rs.conf();
        expect(status.members.length).to.equal(3);
      });
    });

    describe('add member', () => {
      skipIfServerVersion(srv0, '< 4.4');
      it('adds a regular member to the config', async() => {
        const version = (await rs.conf()).version;
        const result = await rs.add(`${await additionalServer.hostport()}`);
        expect(result.ok).to.equal(1);
        const conf = await rs.conf();
        expect(conf.members.length).to.equal(4);
        expect(conf.version).to.be.greaterThan(version);
      });
      it('adds a arbiter member to the config', async() => {
        if (semver.gte(await internalState.currentDb.version(), '4.4.0')) { // setDefaultRWConcern is 4.4+ only
          await internalState.currentDb.getSiblingDB('admin').runCommand({
            setDefaultRWConcern: 1,
            defaultWriteConcern: { w: 'majority' }
          });
        }
        const version = (await rs.conf()).version;
        const result = await rs.addArb(`${await additionalServer.hostport()}`);
        expect(result.ok).to.equal(1);
        const conf = await rs.conf();
        expect(conf.members.length).to.equal(4);
        expect(conf.members[3].arbiterOnly).to.equal(true);
        expect(conf.version).to.be.greaterThan(version);
      });
      afterEach(async() => {
        await rs.reconfig(cfg);
        const status = await rs.conf();
        expect(status.members.length).to.equal(3);
      });
    });

    describe('remove member', () => {
      it('removes a member of the config', async() => {
        const version = (await rs.conf()).version;
        const result = await rs.remove(cfg.members[2].host);
        expect(result.ok).to.equal(1);
        const conf = await rs.conf();
        expect(conf.members.length).to.equal(2);
        expect(conf.version).to.be.greaterThan(version);
      });
      afterEach(async() => {
        await rs.reconfig(cfg);
        const status = await rs.conf();
        expect(status.members.length).to.equal(3);
      });
    });
  });

  describe('integration (PA to PSA transition)', () => {
    const replId = 'rspsa';

    const [ srv0, srv1, srv2 ] = startTestCluster(
      ['--single', '--replSet', replId],
      ['--single', '--replSet', replId],
      ['--single', '--replSet', replId]
    );

    let serviceProvider: CliServiceProvider;

    beforeEach(async() => {
      serviceProvider = await CliServiceProvider.connect(`${await srv0.connectionString()}?directConnection=true`, {}, {}, new EventEmitter());
    });

    afterEach(async() => {
      return await serviceProvider.close(true);
    });

    it('fails with rs.reconfig but works with rs.reconfigForPSASet', async function() {
      this.timeout(100_000);
      const [primary, secondary, arbiter] = await Promise.all([
        srv0.hostport(),
        srv1.hostport(),
        srv2.hostport()
      ]);
      const cfg = {
        _id: replId,
        members: [
          { _id: 0, host: primary, priority: 1 }
        ]
      };

      const internalState = new ShellInternalState(serviceProvider);
      const db = internalState.currentDb;
      const rs = new ReplicaSet(db);

      expect((await rs.initiate(cfg)).ok).to.equal(1);
      await ensureMaster(rs, 1000, primary);

      if (semver.gte(await db.version(), '4.4.0')) { // setDefaultRWConcern is 4.4+ only
        await db.getSiblingDB('admin').runCommand({
          setDefaultRWConcern: 1,
          defaultWriteConcern: { w: 'majority' }
        });
      }
      await rs.addArb(arbiter);

      if (semver.gt(await db.version(), '4.9.0')) { // Exception currently 5.0+ only
        try {
          await rs.add(secondary);
          expect.fail('missed assertion');
        } catch (err) {
          expect(err.codeName).to.equal('NewReplicaSetConfigurationIncompatible');
        }
      }

      const conf = await rs.conf();
      conf.members.push({ _id: 2, host: secondary, votes: 1, priority: 1 });
      await rs.reconfigForPSASet(2, conf);

      const { members } = await rs.status();
      expect(members).to.have.lengthOf(3);
      expect(members.filter(member => member.stateStr === 'PRIMARY')).to.have.lengthOf(1);
    });
  });
});
