import {
  CommonErrors,
  MongoshInvalidInputError,
  MongoshRuntimeError,
} from '@mongosh/errors';
import type {
  Document,
  FindCursor as ServiceProviderCursor,
  ServiceProvider,
} from '@mongosh/service-provider-core';
import { bson } from '@mongosh/service-provider-core';
import chai, { expect } from 'chai';
import { EventEmitter } from 'events';
import semver from 'semver';
import sinonChai from 'sinon-chai';
import type { StubbedInstance } from 'ts-sinon';
import { stubInterface } from 'ts-sinon';
import { createRetriableMethod, ensureMaster } from '../test/helpers';
import type { MongodSetup } from '../../../testing/integration-testing-hooks';
import {
  skipIfServerVersion,
  startTestCluster,
  skipIfApiStrict,
} from '../../../testing/integration-testing-hooks';
import { NodeDriverServiceProvider } from '../../service-provider-node-driver';
import { DatabaseImpl } from './database';
import {
  ADMIN_DB,
  ALL_PLATFORMS,
  ALL_SERVER_VERSIONS,
  ALL_API_VERSIONS,
  ALL_TOPOLOGIES,
} from './enums';
import { dummyOptions } from './helpers.spec';
import { signatures, toShellResult } from './index';
import Mongo from './mongo';
import type { ReplSetConfig, ReplSetMemberConfig } from './replica-set';
import ReplicaSet from './replica-set';
import type { EvaluationListener } from './shell-instance-state';
import ShellInstanceState from './shell-instance-state';
import { eventually } from '../../../testing/eventually';
chai.use(sinonChai);

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

describe('ReplicaSet', function () {
  skipIfApiStrict();
  describe('help', function () {
    const apiClass: any = new ReplicaSet({} as any);

    it('calls help function', async function () {
      expect((await toShellResult(apiClass.help())).type).to.equal('Help');
      expect((await toShellResult(apiClass.help)).type).to.equal('Help');
    });

    it('calls help function for methods', async function () {
      expect((await toShellResult(apiClass.initiate.help())).type).to.equal(
        'Help'
      );
      expect((await toShellResult(apiClass.initiate.help)).type).to.equal(
        'Help'
      );
    });
  });

  describe('signatures', function () {
    it('type', function () {
      expect(signatures.ReplicaSet.type).to.equal('ReplicaSet');
    });

    it('attributes', function () {
      expect(signatures.ReplicaSet.attributes?.initiate).to.deep.equal({
        type: 'function',
        returnsPromise: true,
        deprecated: false,
        returnType: { type: 'unknown', attributes: {} },
        platforms: ALL_PLATFORMS,
        topologies: ALL_TOPOLOGIES,
        apiVersions: ALL_API_VERSIONS,
        serverVersions: ALL_SERVER_VERSIONS,
        isDirectShellCommand: false,
        acceptsRawInput: false,
        shellCommandCompleter: undefined,
      });
    });
  });

  describe('unit', function () {
    let mongo: Mongo;
    let serviceProvider: StubbedInstance<ServiceProvider>;
    let evaluationListener: StubbedInstance<EvaluationListener>;
    let rs: ReplicaSet;
    let bus: StubbedInstance<EventEmitter>;
    let instanceState: ShellInstanceState;
    let db: DatabaseImpl;

    beforeEach(function () {
      bus = stubInterface<EventEmitter>();
      serviceProvider = stubInterface<ServiceProvider>();
      serviceProvider.initialDb = 'test';
      serviceProvider.bsonLibrary = bson;
      serviceProvider.runCommand.resolves({ ok: 1 });
      serviceProvider.runCommandWithCheck.resolves({ ok: 1 });
      evaluationListener = stubInterface<EvaluationListener>();
      instanceState = new ShellInstanceState(serviceProvider, bus);
      instanceState.setEvaluationListener(evaluationListener);
      mongo = new Mongo(
        instanceState,
        undefined,
        undefined,
        undefined,
        serviceProvider
      );
      db = new DatabaseImpl(mongo, 'testdb');
      rs = new ReplicaSet(db._typeLaunder());
    });

    describe('initiate', function () {
      const configDoc = {
        _id: 'my_replica_set',
        members: [
          { _id: 0, host: 'rs1.example.net:27017' },
          { _id: 1, host: 'rs2.example.net:27017' },
          { _id: 2, host: 'rs3.example.net', arbiterOnly: true },
        ],
      };

      it('calls serviceProvider.runCommandWithCheck without optional arg', async function () {
        await rs.initiate();

        expect(serviceProvider.runCommandWithCheck).to.have.been.calledWith(
          ADMIN_DB,
          {
            replSetInitiate: {},
          }
        );
      });

      it('calls serviceProvider.runCommandWithCheck with arg', async function () {
        await rs.initiate(configDoc);

        expect(serviceProvider.runCommandWithCheck).to.have.been.calledWith(
          ADMIN_DB,
          {
            replSetInitiate: configDoc,
          }
        );
      });

      it('returns whatever serviceProvider.runCommandWithCheck returns', async function () {
        const expectedResult = { ok: 1 };
        serviceProvider.runCommandWithCheck.resolves(expectedResult);
        const result = await rs.initiate(configDoc);

        expect(result).to.deep.equal(expectedResult);
      });

      it('throws if serviceProvider.runCommandWithCheck rejects', async function () {
        const expectedError = new Error();
        serviceProvider.runCommandWithCheck.rejects(expectedError);
        const caughtError = await rs.initiate(configDoc).catch((e) => e);

        expect(caughtError).to.equal(expectedError);
      });
    });

    describe('config', function () {
      it('calls serviceProvider.runCommandWithCheck', async function () {
        const expectedResult = {
          config: { version: 1, members: [], settings: {} },
        };
        serviceProvider.runCommandWithCheck.resolves(expectedResult);
        await rs.config();

        expect(serviceProvider.runCommandWithCheck).to.have.been.calledWith(
          ADMIN_DB,
          {
            replSetGetConfig: 1,
          }
        );
      });

      it('returns whatever serviceProvider.runCommandWithCheck returns', async function () {
        // not using the full object for expected result, as we should check this in an e2e test.
        const expectedResult = {
          config: { version: 1, members: [], settings: {} },
        };
        serviceProvider.runCommandWithCheck.resolves(expectedResult);
        const result = await rs.config();

        expect(result).to.deep.equal(expectedResult.config);
      });

      it('throws if serviceProvider.runCommandWithCheck rejects', async function () {
        const expectedResult = {
          config: { version: 1, members: [], settings: {} },
        };
        serviceProvider.runCommandWithCheck.resolves(expectedResult);
        const expectedError = new Error();
        serviceProvider.runCommandWithCheck.rejects(expectedError);
        const caughtError = await rs.config().catch((e) => e);

        expect(caughtError).to.equal(expectedError);
      });

      it('calls find if serviceProvider.runCommandWithCheck rejects with command not found', async function () {
        const expectedError = new Error() as any;
        expectedError.codeName = 'CommandNotFound';
        serviceProvider.runCommandWithCheck.rejects(expectedError);
        const expectedResult = { res: true };
        const findCursor = stubInterface<ServiceProviderCursor>();
        findCursor.tryNext.resolves(expectedResult);
        serviceProvider.find.returns(findCursor);

        const conf = await rs.config();
        expect(serviceProvider.find).to.have.been.calledWith(
          'local',
          'system.replset',
          {},
          {}
        );
        expect(conf).to.deep.equal(expectedResult);
      });
    });

    describe('reconfig', function () {
      const configDoc: Partial<ReplSetConfig> = {
        _id: 'my_replica_set',
        members: [
          { _id: 0, host: 'rs1.example.net:27017' },
          { _id: 1, host: 'rs2.example.net:27017' },
          { _id: 2, host: 'rs3.example.net', arbiterOnly: true },
        ],
      };

      it('calls serviceProvider.runCommandWithCheck without optional arg', async function () {
        serviceProvider.runCommandWithCheck.resolves({
          config: { version: 1, protocolVersion: 1 },
        });
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
              protocolVersion: 1,
            },
          }
        );
      });

      it('calls serviceProvider.runCommandWithCheck with arg', async function () {
        serviceProvider.runCommandWithCheck.resolves({
          config: 1,
          protocolVersion: 1,
        });
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
              protocolVersion: 1,
            },
            force: true,
          }
        );
      });
    });
    describe('status', function () {
      it('calls serviceProvider.runCommandWithCheck', async function () {
        await rs.status();

        expect(serviceProvider.runCommandWithCheck).to.have.been.calledWith(
          ADMIN_DB,
          {
            replSetGetStatus: 1,
          }
        );
      });

      it('returns whatever serviceProvider.runCommandWithCheck returns', async function () {
        const expectedResult = { ok: 1 };
        serviceProvider.runCommandWithCheck.resolves(expectedResult);
        const result = await rs.status();
        expect(result).to.deep.equal(expectedResult);
      });

      it('throws if serviceProvider.runCommandWithCheck rejects', async function () {
        const expectedError = new Error();
        serviceProvider.runCommandWithCheck.rejects(expectedError);
        const caughtError = await rs.status().catch((e) => e);
        expect(caughtError).to.equal(expectedError);
      });
    });
    describe('isMaster', function () {
      it('calls serviceProvider.runCommandWithCheck', async function () {
        await rs.isMaster();

        expect(serviceProvider.runCommandWithCheck).to.have.been.calledWith(
          ADMIN_DB,
          {
            isMaster: 1,
          }
        );
      });

      it('returns whatever serviceProvider.runCommandWithCheck returns', async function () {
        const expectedResult = { ok: 1 };
        serviceProvider.runCommandWithCheck.resolves(expectedResult);
        const result = await rs.isMaster();
        expect(result).to.deep.equal(expectedResult);
      });

      it('throws if serviceProvider.runCommandWithCheck rejects', async function () {
        const expectedError = new Error();
        serviceProvider.runCommandWithCheck.rejects(expectedError);
        const caughtError = await rs.isMaster().catch((e) => e);
        expect(caughtError).to.equal(expectedError);
      });
    });
    describe('hello', function () {
      it('calls serviceProvider.runCommandWithCheck', async function () {
        await rs.hello();

        expect(serviceProvider.runCommandWithCheck).to.have.been.calledWith(
          ADMIN_DB,
          {
            hello: 1,
          }
        );
      });

      it('returns whatever serviceProvider.runCommandWithCheck returns', async function () {
        const expectedResult = { ok: 1 };
        serviceProvider.runCommandWithCheck.resolves(expectedResult);
        const result = await rs.hello();
        expect(result).to.deep.equal(expectedResult);
      });

      it('throws if serviceProvider.runCommandWithCheck rejects', async function () {
        const expectedError = new Error();
        serviceProvider.runCommandWithCheck.rejects(expectedError);
        const caughtError = await rs.hello().catch((e) => e);
        expect(caughtError).to.equal(expectedError);
      });
    });
    describe('add', function () {
      it('calls serviceProvider.runCommandWithCheck with no arb and string hostport', async function () {
        const configDoc = { version: 1, members: [{ _id: 0 }, { _id: 1 }] };
        const hostname = 'localhost:27017';
        const expectedResult = { ok: 1 };
        // eslint-disable-next-line @typescript-eslint/require-await
        serviceProvider.runCommandWithCheck.callsFake(async (db, command) => {
          if (command.replSetGetConfig) {
            return { ok: 1, config: configDoc };
          }
          return expectedResult;
        });
        const result = await rs.add(hostname);

        expect(serviceProvider.runCommandWithCheck).to.have.been.calledWith(
          ADMIN_DB,
          {
            replSetReconfig: {
              version: 2,
              members: [{ _id: 0 }, { _id: 1 }, { _id: 2, host: hostname }],
            },
          }
        );
        expect(result).to.deep.equal(expectedResult);
      });
      it('calls serviceProvider.runCommandWithCheck with arb and string hostport', async function () {
        const configDoc = { version: 1, members: [{ _id: 0 }, { _id: 1 }] };
        const hostname = 'localhost:27017';
        serviceProvider.countDocuments.resolves(1);
        const expectedResult = { ok: 1 };
        // eslint-disable-next-line @typescript-eslint/require-await
        serviceProvider.runCommandWithCheck.callsFake(async (db, command) => {
          if (command.replSetGetConfig) {
            return { ok: 1, config: configDoc };
          }
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
                { _id: 2, arbiterOnly: true, host: hostname },
              ],
            },
          }
        );
        expect(result).to.deep.equal(expectedResult);
      });

      it('calls serviceProvider.runCommandWithCheck with no arb and obj hostport', async function () {
        const configDoc = { version: 1, members: [{ _id: 0 }, { _id: 1 }] };
        const hostname = {
          host: 'localhost:27017',
        };
        serviceProvider.countDocuments.resolves(1);
        const expectedResult = { ok: 1 };
        // eslint-disable-next-line @typescript-eslint/require-await
        serviceProvider.runCommandWithCheck.callsFake(async (db, command) => {
          if (command.replSetGetConfig) {
            return { ok: 1, config: configDoc };
          }
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
                { _id: 2, host: hostname.host },
              ],
            },
          }
        );
        expect(result).to.deep.equal(expectedResult);
      });

      it('calls serviceProvider.runCommandWithCheck with no arb and obj hostport, uses _id', async function () {
        const configDoc = { version: 1, members: [{ _id: 0 }, { _id: 1 }] };
        const hostname = {
          host: 'localhost:27017',
          _id: 10,
        };
        serviceProvider.countDocuments.resolves(1);
        const expectedResult = { ok: 1 };
        // eslint-disable-next-line @typescript-eslint/require-await
        serviceProvider.runCommandWithCheck.callsFake(async (db, command) => {
          if (command.replSetGetConfig) {
            return { ok: 1, config: configDoc };
          }
          return expectedResult;
        });
        const result = await rs.add(hostname);

        expect(serviceProvider.runCommandWithCheck).to.have.been.calledWith(
          ADMIN_DB,
          {
            replSetReconfig: {
              version: 2,
              members: [{ _id: 0 }, { _id: 1 }, hostname],
            },
          }
        );
        expect(result).to.deep.equal(expectedResult);
      });

      it('throws with arb and object hostport', async function () {
        const configDoc = { version: 1, members: [{ _id: 0 }, { _id: 1 }] };
        const hostname = { host: 'localhost:27017' };
        serviceProvider.countDocuments.resolves(1);
        const expectedResult = { ok: 1 };
        // eslint-disable-next-line @typescript-eslint/require-await
        serviceProvider.runCommandWithCheck.callsFake(async (db, command) => {
          if (command.replSetGetConfig) {
            return { ok: 1, config: configDoc };
          }
          return expectedResult;
        });

        const error = await rs.add(hostname, true).catch((e) => e);
        expect(error).to.be.instanceOf(MongoshInvalidInputError);
        expect(error.code).to.equal(CommonErrors.InvalidArgument);
      });
      it('throws if local.system.replset.findOne has no docs', async function () {
        const hostname = { host: 'localhost:27017' };
        serviceProvider.runCommandWithCheck.resolves({ ok: 1 });
        const error = await rs.add(hostname, true).catch((e) => e);
        expect(error).to.be.instanceOf(MongoshRuntimeError);
        expect(error.code).to.equal(CommonErrors.CommandFailed);
      });

      it('throws if serviceProvider.runCommandWithCheck rejects', async function () {
        const expectedError = new Error();
        serviceProvider.runCommandWithCheck.rejects(expectedError);
        const caughtError = await rs.add('hostname').catch((e) => e);
        expect(caughtError).to.equal(expectedError);
      });
    });
    describe('remove', function () {
      it('calls serviceProvider.runCommandWithCheck', async function () {
        const configDoc = {
          version: 1,
          members: [
            { _id: 0, host: 'localhost:0' },
            { _id: 1, host: 'localhost:1' },
          ],
        };
        const hostname = 'localhost:0';
        const expectedResult = { ok: 1 };
        // eslint-disable-next-line @typescript-eslint/require-await
        serviceProvider.runCommandWithCheck.callsFake(async (db, command) => {
          if (command.replSetGetConfig) {
            return { ok: 1, config: configDoc };
          }
          return expectedResult;
        });
        const result = await rs.remove(hostname);

        expect(serviceProvider.runCommandWithCheck).to.have.been.calledWith(
          ADMIN_DB,
          {
            replSetReconfig: {
              version: 2,
              members: [{ _id: 1, host: 'localhost:1' }],
            },
          }
        );
        expect(result).to.deep.equal(expectedResult);
      });
      it('throws with object hostport', async function () {
        const hostname = { host: 'localhost:27017' } as any;
        const error = await rs.remove(hostname).catch((e) => e);
        expect(error.name).to.equal('MongoshInvalidInputError');
      });
      it('throws if serviceProvider.runCommandWithCheck rejects', async function () {
        const expectedError = new Error();
        serviceProvider.runCommandWithCheck.rejects(expectedError);
        const caughtError = await rs.remove('localhost:1').catch((e) => e);
        expect(caughtError).to.equal(expectedError);
      });
      it('throws if hostname not in members', async function () {
        const configDoc = {
          version: 1,
          members: [
            { _id: 0, host: 'localhost:0' },
            { _id: 1, host: 'lcoalhost:1' },
          ],
        };
        serviceProvider.runCommandWithCheck.resolves({
          ok: 1,
          config: configDoc,
        });
        const caughtError = await rs.remove('localhost:2').catch((e) => e);
        expect(caughtError).to.be.instanceOf(MongoshInvalidInputError);
        expect(caughtError.code).to.equal(CommonErrors.InvalidArgument);
      });
    });
    describe('freeze', function () {
      it('calls serviceProvider.runCommandWithCheck', async function () {
        await rs.freeze(100);

        expect(serviceProvider.runCommandWithCheck).to.have.been.calledWith(
          ADMIN_DB,
          {
            replSetFreeze: 100,
          }
        );
      });

      it('returns whatever serviceProvider.runCommandWithCheck returns', async function () {
        const expectedResult = { ok: 1 };
        serviceProvider.runCommandWithCheck.resolves(expectedResult);
        const result = await rs.freeze(100);
        expect(result).to.deep.equal(expectedResult);
      });

      it('throws if serviceProvider.runCommandWithCheck rejects', async function () {
        const expectedError = new Error();
        serviceProvider.runCommandWithCheck.rejects(expectedError);
        const caughtError = await rs.freeze(100).catch((e) => e);
        expect(caughtError).to.equal(expectedError);
      });
    });
    describe('syncFrom', function () {
      it('calls serviceProvider.runCommandWithCheck', async function () {
        await rs.syncFrom('localhost:27017');

        expect(serviceProvider.runCommandWithCheck).to.have.been.calledWith(
          ADMIN_DB,
          {
            replSetSyncFrom: 'localhost:27017',
          }
        );
      });

      it('returns whatever serviceProvider.runCommandWithCheck returns', async function () {
        const expectedResult = { ok: 1 };
        serviceProvider.runCommandWithCheck.resolves(expectedResult);
        const result = await rs.syncFrom('localhost:27017');
        expect(result).to.deep.equal(expectedResult);
      });

      it('throws if serviceProvider.runCommandWithCheck rejects', async function () {
        const expectedError = new Error();
        serviceProvider.runCommandWithCheck.rejects(expectedError);
        const caughtError = await rs
          .syncFrom('localhost:27017')
          .catch((e) => e);
        expect(caughtError).to.equal(expectedError);
      });
    });
    describe('stepDown', function () {
      it('calls serviceProvider.runCommandWithCheck without any arg', async function () {
        await rs.stepDown();

        expect(serviceProvider.runCommandWithCheck).to.have.been.calledWith(
          ADMIN_DB,
          {
            replSetStepDown: 60,
          }
        );
      });
      it('calls serviceProvider.runCommandWithCheck without second optional arg', async function () {
        await rs.stepDown(10);

        expect(serviceProvider.runCommandWithCheck).to.have.been.calledWith(
          ADMIN_DB,
          {
            replSetStepDown: 10,
          }
        );
      });

      it('calls serviceProvider.runCommandWithCheck with arg', async function () {
        await rs.stepDown(10, 30);

        expect(serviceProvider.runCommandWithCheck).to.have.been.calledWith(
          ADMIN_DB,
          {
            replSetStepDown: 10,
            secondaryCatchUpPeriodSecs: 30,
          }
        );
      });

      it('returns whatever serviceProvider.runCommandWithCheck returns', async function () {
        const expectedResult = { ok: 1 };
        serviceProvider.runCommandWithCheck.resolves(expectedResult);
        const result = await rs.stepDown(10);
        expect(result).to.deep.equal(expectedResult);
      });

      it('throws if serviceProvider.runCommandWithCheck rejects', async function () {
        const expectedError = new Error();
        serviceProvider.runCommandWithCheck.rejects(expectedError);
        const caughtError = await rs.stepDown(10).catch((e) => e);
        expect(caughtError).to.equal(expectedError);
      });
    });
    describe('reconfigForPSASet', function () {
      let secondary: ReplSetMemberConfig;
      let config: Partial<ReplSetConfig>;
      let oldConfig: ReplSetConfig;
      let reconfigCalls: ReplSetConfig[];
      let reconfigResults: Document[];

      beforeEach(function () {
        secondary = {
          _id: 2,
          host: 'secondary.mongodb.net',
          priority: 1,
          votes: 1,
        };
        oldConfig = {
          _id: 'replSet',
          members: [
            { _id: 0, host: 'primary.monogdb.net', priority: 1, votes: 1 },
            {
              _id: 1,
              host: 'arbiter.monogdb.net',
              priority: 1,
              votes: 0,
              arbiterOnly: true,
            },
          ],
          protocolVersion: 1,
          version: 1,
        };
        config = deepClone(oldConfig);
        config.members!.push(secondary);
        reconfigResults = [{ ok: 1 }, { ok: 1 }];
        reconfigCalls = [];

        // eslint-disable-next-line @typescript-eslint/require-await
        serviceProvider.runCommandWithCheck.callsFake(
          // eslint-disable-next-line @typescript-eslint/require-await
          async (db: string, cmd: Document): Promise<Document> => {
            if (cmd.replSetGetConfig) {
              return { config: oldConfig };
            }
            if (cmd.replSetReconfig) {
              const result = reconfigResults.shift();
              reconfigCalls.push(deepClone(cmd.replSetReconfig));
              if (result?.ok) {
                oldConfig = deepClone(cmd.replSetReconfig);
                return result;
              }
              throw new Error(`Reconfig failed: ${JSON.stringify(result)}`);
            }
            throw new Error('unreachable!');
          }
        );
      });

      it('fails if index is incorrect', async function () {
        try {
          await rs.reconfigForPSASet(3, config);
          expect.fail('missed exception');
        } catch (err: any) {
          expect(err.message).to.equal(
            '[COMMON-10001] Node at index 3 does not exist in the new config'
          );
        }
      });

      it('fails if secondary.votes != 1', async function () {
        secondary.votes = 0;
        try {
          await rs.reconfigForPSASet(2, config);
          expect.fail('missed exception');
        } catch (err: any) {
          expect(err.message).to.equal(
            '[COMMON-10001] Node at index 2 must have { votes: 1 } in the new config (actual: { votes: 0 })'
          );
        }
      });

      it('fails if old node had votes', async function () {
        oldConfig.members.push(secondary);
        try {
          await rs.reconfigForPSASet(2, config);
          expect.fail('missed exception');
        } catch (err: any) {
          expect(err.message).to.equal(
            '[COMMON-10001] Node at index 2 must have { votes: 0 } in the old config (actual: { votes: 1 })'
          );
        }
      });

      it('warns if there is an existing member with the same host', async function () {
        oldConfig.members.push(deepClone(secondary));
        secondary._id = 3;
        await rs.reconfigForPSASet(2, config);
        expect(evaluationListener.onPrint).to.have.been.calledWith([
          await toShellResult(
            'Warning: Node at index 2 has { host: "secondary.mongodb.net" }, ' +
              'which is also present in the old config, but with a different _id field.'
          ),
        ]);
      });

      it('skips the second reconfig if priority is 0', async function () {
        secondary.priority = 0;
        await rs.reconfigForPSASet(2, config);
        expect(reconfigCalls).to.deep.equal([{ ...config, version: 2 }]);
        expect(evaluationListener.onPrint).to.have.been.calledWith([
          await toShellResult(
            'Running first reconfig to give member at index 2 { votes: 1, priority: 0 }'
          ),
        ]);
        expect(evaluationListener.onPrint).to.have.been.calledWith([
          await toShellResult(
            'No second reconfig necessary because .priority = 0'
          ),
        ]);
      });

      it('does two reconfigs if priority is 1', async function () {
        const origConfig = deepClone(config);
        await rs.reconfigForPSASet(2, config);
        expect(reconfigCalls).to.deep.equal([
          {
            ...origConfig,
            members: [
              config.members![0],
              config.members![1],
              { ...secondary, priority: 0 },
            ],
            version: 2,
          },
          { ...origConfig, version: 3 },
        ]);
        expect(evaluationListener.onPrint).to.have.been.calledWith([
          await toShellResult(
            'Running first reconfig to give member at index 2 { votes: 1, priority: 0 }'
          ),
        ]);
        expect(evaluationListener.onPrint).to.have.been.calledWith([
          await toShellResult(
            'Running second reconfig to give member at index 2 { priority: 1 }'
          ),
        ]);
      });
    });
  });

  describe('integration (standard setup)', function () {
    const replId = 'rs0';

    const [srv0, srv1, srv2, srv3] = startTestCluster(
      'replica-set-standard',
      { args: ['--replSet', replId] },
      { args: ['--replSet', replId] },
      { args: ['--replSet', replId] },
      { args: ['--replSet', replId] }
    );

    let cfg: Partial<ReplSetConfig>;
    let additionalServer: MongodSetup;
    let serviceProvider: NodeDriverServiceProvider;
    let instanceState: ShellInstanceState;
    let db: DatabaseImpl;
    let rs: ReplicaSet;

    before(async function () {
      this.timeout(100_000);
      cfg = {
        _id: replId,
        members: [
          { _id: 0, host: `${await srv0.hostport()}`, priority: 1 },
          { _id: 1, host: `${await srv1.hostport()}`, priority: 0 },
          { _id: 2, host: `${await srv2.hostport()}`, priority: 0 },
        ],
      };
      additionalServer = srv3;

      serviceProvider = await NodeDriverServiceProvider.connect(
        `${await srv0.connectionString()}?directConnection=true`,
        dummyOptions,
        {},
        new EventEmitter()
      );
      instanceState = new ShellInstanceState(serviceProvider);
      db = instanceState.currentDb;
      rs = new ReplicaSet(db._typeLaunder());

      // check replset uninitialized
      try {
        await rs.status();
        expect.fail();
      } catch (error: any) {
        expect(error.message).to.include('no replset config');
      }
      const result = await rs.initiate(cfg);
      expect(result.ok).to.equal(1);
      // https://jira.mongodb.org/browse/SERVER-55371
      // expect(result.$clusterTime).to.not.be.undefined;
    });

    beforeEach(async function () {
      await ensureMaster(rs, 1000, await srv0.hostport());
      expect((await rs.conf()).members.length).to.equal(3);
    });

    after(function () {
      return serviceProvider.close(true);
    });

    describe('replica set info', function () {
      it('returns the status', async function () {
        const result = await rs.status();
        expect(result.set).to.equal(replId);
      });
      it('returns the config', async function () {
        const result = await rs.conf();
        expect(result._id).to.equal(replId);
      });
      it('is connected to master', async function () {
        const result = await rs.isMaster();
        expect(result.ismaster).to.be.true;
      });
      it('returns StatsResult for print secondary replication info', async function () {
        const result = await rs.printSecondaryReplicationInfo();
        expect(result.type).to.equal('StatsResult');
      });
      it('returns StatsResult for print replication info', async function () {
        const result = await rs.printReplicationInfo();
        expect(result.type).to.equal('StatsResult');
      });
      it('returns data for db.getReplicationInfo', async function () {
        const result = await rs._database.getReplicationInfo();
        expect(Object.keys(result)).to.include('logSizeMB');
      });
    });

    describe('watch', function () {
      afterEach(async function () {
        await db.dropDatabase();
      });

      it('allows watching changes as they happen', async function () {
        const coll = db.getCollection('cstest');
        const cs = await coll.watch();
        await coll.insertOne({ i: 42 });
        expect((await cs.next()).fullDocument.i).to.equal(42);
      });

      it('allow to resume watching changes as they happen', async function () {
        const coll = db.getCollection('cstest');
        const cs = await coll.watch();
        await coll.insertOne({ i: 123 });
        expect((await cs.next()).fullDocument.i).to.equal(123);
        const token = cs.getResumeToken();
        await coll.insertOne({ i: 456 });
        expect((await cs.next()).fullDocument.i).to.equal(456);

        const cs2 = await coll.watch({ resumeAfter: token });
        expect((await cs2.next()).fullDocument.i).to.equal(456);
      });
    });

    describe('topology changes', function () {
      this.timeout(100_000);

      let reconfigWithRetry: ReplicaSet['reconfig'];

      const waitForStableConfig = (expectedMembers?: number) =>
        eventually(
          async () => {
            const status = await rs.status();
            const members: { stateStr: string }[] = status?.members || [];

            const states = members.map((m) => m.stateStr);

            // eslint-disable-next-line no-console
            console.info('Current state of cluster:', states);

            if (expectedMembers) {
              expect(members.length).to.equal(expectedMembers);
            }

            expect([...new Set(states)]).to.have.members([
              'PRIMARY',
              'SECONDARY',
            ]);

            expect(states.filter((s) => s === 'PRIMARY').length).to.equal(1);
          },
          { timeout: 50_000, initialInterval: 2000, backoffFactor: 1.3 }
        );

      beforeEach(async function () {
        reconfigWithRetry = createRetriableMethod(rs, 'reconfig');

        await waitForStableConfig(3);
      });

      afterEach(async function () {
        await reconfigWithRetry(cfg, { force: true });
        expect((await rs.conf()).members.length).to.equal(3);

        // eslint-disable-next-line no-console
        console.info('Configuration reset: OK');
      });

      describe('reconfig', function () {
        it('reconfig with one less secondary', async function () {
          const newcfg: Partial<ReplSetConfig> = {
            _id: replId,
            members: [cfg.members![0], cfg.members![1]],
          };
          const version = (await rs.conf()).version;
          const result = await reconfigWithRetry(newcfg);
          expect(result.ok).to.equal(1);
          const status = await rs.conf();
          expect(status.members.length).to.equal(2);
          expect(status.version).to.be.greaterThan(version);
        });
      });

      describe('add member', function () {
        skipIfServerVersion(srv0, '< 4.4');
        it('adds a regular member to the config', async function () {
          const addWithRetry = createRetriableMethod(rs, 'add');
          const version = (await rs.conf()).version;
          const result = await addWithRetry(
            `${await additionalServer.hostport()}`
          );
          expect(result.ok).to.equal(1);
          const conf = await rs.conf();
          expect(conf.members.length).to.equal(4);
          expect(conf.version).to.be.greaterThan(version);
        });

        it('adds a arbiter member to the config', async function () {
          const addArbWithRetry = createRetriableMethod(rs, 'addArb');
          if (semver.gte(await instanceState.currentDb.version(), '4.4.0')) {
            // setDefaultRWConcern is 4.4+ only
            await instanceState.currentDb.getSiblingDB('admin').runCommand({
              setDefaultRWConcern: 1,
              defaultWriteConcern: { w: 'majority' },
            });
          }
          const version = (await rs.conf()).version;
          const result = await addArbWithRetry(
            `${await additionalServer.hostport()}`
          );
          expect(result.ok).to.equal(1);
          const conf = await rs.conf();
          expect(conf.members.length).to.equal(4);
          expect(conf.members[3].arbiterOnly).to.equal(true);
          expect(conf.version).to.be.greaterThan(version);
        });
      });

      describe('remove member', function () {
        it('removes a member of the config', async function () {
          const removeWithRetry = createRetriableMethod(rs, 'remove');
          const version = (await rs.conf()).version;
          const result = await removeWithRetry(cfg.members![2].host);
          expect(result.ok).to.equal(1);
          const conf = await rs.conf();
          expect(conf.members.length).to.equal(2);
          expect(conf.version).to.be.greaterThan(version);
        });
      });
    });

    describe('analyzeShardKey()', function () {
      skipIfServerVersion(srv0, '< 7.0'); // analyzeShardKey will only be added in 7.0 which is not included in stable yet

      const docs: any[] = [];
      for (let i = 0; i < 1000; i++) {
        docs.push({ myKey: i });
      }

      afterEach(async function () {
        await db.dropDatabase();
      });

      it('succeeds when running against an unsharded collection on a replicaset', async function () {
        await db.getCollection('test').insertMany(docs);
        expect(
          await db.getCollection('test').analyzeShardKey({ myKey: 1 })
        ).to.deep.include({ ok: 1 });
      });
    });
    describe('configureQueryAnalyzer()', function () {
      skipIfServerVersion(srv0, '< 7.0'); // analyzeShardKey will only be added in 7.0 which is not included in stable yet

      const docs: any[] = [];
      for (let i = 0; i < 1000; i++) {
        docs.push({ myKey: i });
      }

      afterEach(async function () {
        await db.dropDatabase();
      });

      it('succeeds when running against an unsharded collection on a replicaset', async function () {
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
  });

  describe('integration (PA to PSA transition)', function () {
    const replId = 'rspsa';

    const [srv0, srv1, srv2] = startTestCluster(
      'replica-set-pa-psa',
      { args: ['--replSet', replId] },
      { args: ['--replSet', replId] },
      { args: ['--replSet', replId] }
    );

    let serviceProvider: NodeDriverServiceProvider;

    beforeEach(async function () {
      serviceProvider = await NodeDriverServiceProvider.connect(
        `${await srv0.connectionString()}?directConnection=true`,
        dummyOptions,
        {},
        new EventEmitter()
      );
    });

    afterEach(async function () {
      return await serviceProvider.close(true);
    });

    it('fails with rs.reconfig but works with rs.reconfigForPSASet', async function () {
      this.timeout(100_000);
      const [primary, secondary, arbiter] = await Promise.all([
        srv0.hostport(),
        srv1.hostport(),
        srv2.hostport(),
      ]);
      const cfg = {
        _id: replId,
        members: [{ _id: 0, host: primary, priority: 1 }],
      };

      const instanceState = new ShellInstanceState(serviceProvider);
      const db = instanceState.currentDb;
      const rs = new ReplicaSet(db);
      const addArbWithRetry = createRetriableMethod(rs, 'addArb');
      /**
       * Small hack warning:
       * rs.reconfigForPSASet internally uses rs.reconfig twice with different configs
       * rs.reconfig itself could lead to a pseudo test failure because of delay in propogation
       * of new config. This small hack here helps us reduce flakiness in our test runs
       */
      rs.reconfig = createRetriableMethod(rs, 'reconfig');

      expect((await rs.initiate(cfg)).ok).to.equal(1);
      await ensureMaster(rs, 1000, primary);

      if (semver.gte(await db.version(), '4.4.0')) {
        // setDefaultRWConcern is 4.4+ only
        await db.getSiblingDB('admin').runCommand({
          setDefaultRWConcern: 1,
          defaultWriteConcern: { w: 'majority' },
        });
      }
      await addArbWithRetry(arbiter);

      if (semver.gt(await db.version(), '4.9.0')) {
        // Exception currently 5.0+ only
        try {
          // We don't run this function with retries here because we expect it to fail.
          await rs.add(secondary);
          expect.fail('missed assertion');
        } catch (err: any) {
          expect(err.codeName).to.equal(
            'NewReplicaSetConfigurationIncompatible'
          );
        }
      }

      const conf = await rs.conf();
      conf.members.push({ _id: 2, host: secondary, votes: 1, priority: 1 });
      await rs.reconfigForPSASet(2, conf);

      const { members } = await rs.status();
      expect(members).to.have.lengthOf(3);
      expect(
        members.filter(
          (member: { stateStr?: string }) => member.stateStr === 'PRIMARY'
        )
      ).to.have.lengthOf(1);
    });
  });
});
