import {
  startTestCluster,
  skipIfServerVersion,
  skipIfApiStrict,
} from '../../testing/src/integration-testing-hooks';
import { eventually } from '../../testing/src/eventually';
import { expect } from 'chai';
import type { TestShell } from './test-shell';

describe('e2e direct connection', function () {
  skipIfApiStrict();
  const tabtab = async (shell: TestShell) => {
    await new Promise((resolve) => setTimeout(resolve, 400));
    shell.writeInput('\u0009');
    await new Promise((resolve) => setTimeout(resolve, 400));
    shell.writeInput('\u0009');
  };

  context('to a replica set', function () {
    const replSetId = 'replset';
    const [rs0, rs1, rs2] = startTestCluster(
      'e2e-direct-connection',
      { args: ['--replSet', replSetId] },
      { args: ['--replSet', replSetId] },
      { args: ['--replSet', replSetId] }
    );

    [
      { server: rs0, name: 'rs0' },
      { server: rs1, name: 'rs1' },
      { server: rs2, name: 'rs2' },
    ].forEach(({ server, name }) => {
      it(`works when connecting to node ${name} of uninitialized set`, async function () {
        const shell = this.startTestShell({
          args: [await server.connectionString()],
        });
        await shell.waitForPrompt();
        await shell.executeLine('db.isMaster()');
        shell.assertContainsOutput('ismaster: false');
        shell.assertNotContainsOutput(`setName: '${replSetId}'`);
      });
    });

    context('after rs.initiate()', function () {
      let dbname: string;

      before(async function () {
        this.timeout(60_000);
        const replSetConfig = {
          _id: replSetId,
          version: 1,
          members: [
            { _id: 0, host: await rs0.hostport(), priority: 1 },
            { _id: 1, host: await rs1.hostport(), priority: 0 },
            { _id: 2, host: await rs2.hostport(), priority: 0 },
          ],
        };

        const shell = this.startTestShell({
          args: [await rs0.connectionString()],
        });
        await shell.waitForPrompt();
        await shell.executeLine(
          `rs.initiate(${JSON.stringify(replSetConfig)})`
        );
        shell.assertContainsOutput('ok: 1');
        await eventually(async () => {
          await shell.executeLine('db.isMaster()');
          shell.assertContainsOutput('ismaster: true');
          shell.assertContainsOutput(`me: '${await rs0.hostport()}'`);
          shell.assertContainsOutput(`setName: '${replSetId}'`);
        });

        await shell.executeLine('use admin');
        await shell.executeLine(
          "db.createUser({ user: 'anna', pwd: 'pwd', roles: [] })"
        );
        shell.assertContainsOutput('ok: 1');

        dbname = `test-${Date.now()}-${(Math.random() * 100000) | 0}`;
        await shell.executeLine(`use ${dbname}`);
        await shell.executeLine('db.testcollection.insertOne({})');
        shell.writeInputLine('exit');
      });
      after(async function () {
        const shell = this.startTestShell({
          args: [await rs0.connectionString()],
        });
        await shell.waitForPrompt();
        await shell.executeLine(`db.getSiblingDB("${dbname}").dropDatabase()`);
        shell.writeInputLine('exit');
        await shell.waitForSuccessfulExit();
      });

      context('connecting to secondary members directly', function () {
        it('works when specifying a connection string', async function () {
          const shell = this.startTestShell({
            args: [await rs1.connectionString()],
          });
          await shell.waitForPrompt();
          await shell.executeLine('db.isMaster()');
          shell.assertContainsOutput('ismaster: false');
          shell.assertContainsOutput(`me: '${await rs1.hostport()}'`);
          shell.assertContainsOutput(`setName: '${replSetId}'`);
        });

        it('works when specifying just host and port', async function () {
          const shell = this.startTestShell({ args: [await rs1.hostport()] });
          await shell.waitForPrompt();
          await shell.executeLine('db.isMaster()');
          shell.assertContainsOutput('ismaster: false');
          shell.assertContainsOutput(`me: '${await rs1.hostport()}'`);
          shell.assertContainsOutput(`setName: '${replSetId}'`);
        });

        it('lists collections without explicit readPreference', async function () {
          const shell = this.startTestShell({
            args: [`${await rs1.connectionString()}`],
          });
          await shell.waitForPrompt();
          await shell.executeLine('use admin');
          await shell.executeLine('db.runCommand({ listCollections: 1 })');
          shell.assertContainsOutput("name: 'system.version'");
        });

        it('lists collections when an incompatible readPreference is provided', async function () {
          const shell = this.startTestShell({
            args: [`${await rs1.connectionString()}`],
          });
          await shell.waitForPrompt();
          await shell.executeLine('use admin');
          await shell.executeLine(
            'db.runCommand({ listCollections: 1 }, { readPreference: "primary" })'
          );
          shell.assertContainsOutput("name: 'system.version'");
        });

        it('lists collections when readPreference is set via Mongo', async function () {
          const shell = this.startTestShell({
            args: [await rs1.connectionString()],
          });
          await shell.waitForPrompt();
          await shell.executeLine('use admin');
          await shell.executeLine(
            'db.getMongo().setReadPref("secondaryPreferred")'
          );
          await shell.executeLine('db.runCommand({ listCollections: 1 })');
          shell.assertContainsOutput("name: 'system.version'");
        });

        it('slists databases without explicit readPreference', async function () {
          const shell = this.startTestShell({
            args: [await rs1.connectionString()],
          });
          await shell.waitForPrompt();
          await shell.executeLine('use admin');
          await shell.executeLine('db.getMongo().getDBs()');
          shell.assertContainsOutput("name: 'admin'");
        });

        it('lists databases when an incompatible readPreference is provided', async function () {
          const shell = this.startTestShell({
            args: [await rs1.connectionString()],
          });
          await shell.waitForPrompt();
          await shell.executeLine('use admin');
          await shell.executeLine(
            'db.getMongo().getDBs({ readPreference: "primary" })'
          );
          shell.assertContainsOutput("name: 'admin'");
        });

        it('lists databases when readPreference is set via Mongo', async function () {
          const shell = this.startTestShell({
            args: [await rs1.connectionString()],
          });
          await shell.waitForPrompt();
          await shell.executeLine('use admin');
          await shell.executeLine(
            'db.getMongo().setReadPref("secondaryPreferred")'
          );
          await shell.executeLine('db.getMongo().getDBs()');
          shell.assertContainsOutput("name: 'admin'");
        });

        it('lists collections and dbs using show by default', async function () {
          const shell = this.startTestShell({
            args: [await rs1.connectionString()],
          });
          await shell.waitForPrompt();
          await shell.executeLine('use admin');
          expect(await shell.executeLine('show collections')).to.include(
            'system.version'
          );
          expect(await shell.executeLine('show dbs')).to.include('admin');
        });

        it('autocompletes collection names', async function () {
          if (process.arch === 's390x') {
            return this.skip(); // https://jira.mongodb.org/browse/MONGOSH-746
          }
          const shell = this.startTestShell({
            args: [await rs1.connectionString({}, { pathname: `/${dbname}` })],
            forceTerminal: true,
          });
          await shell.waitForPrompt();
          shell.writeInput('db.testc');
          await tabtab(shell);
          await eventually(() => {
            shell.assertContainsOutput('db.testcollection');
          });
        });

        context('post-4.0', function () {
          skipIfServerVersion(rs0, '< 4.2');

          it('allows aggregate with $merge with secondary readpref', async function () {
            const shell = this.startTestShell({
              args: [
                await rs1.connectionString(
                  {
                    readPreference: 'secondary',
                    directConnection: 'false',
                    serverSelectionTimeoutMS: '1000',
                  },
                  {
                    pathname: `/${dbname}`,
                  }
                ),
              ],
            });
            await shell.waitForPrompt();
            await shell.executeLine(`db.testcollection.aggregate([
              {$group:{_id:null,count:{$sum:1}}},
              {$set:{_id:'count'}},
              {$merge:{into:'testaggout',on:'_id'}}
            ])`);
            await eventually(async () => {
              expect(
                await shell.executeLine('db.testaggout.find()')
              ).to.include("[ { _id: 'count', count: 1 } ]");
            });
            shell.assertNoErrors();
          });
        });
      });

      context('connecting to primary', function () {
        it('when specifying replicaSet', async function () {
          const shell = this.startTestShell({
            args: [await rs1.connectionString({ replicaSet: replSetId })],
          });
          await shell.waitForPrompt();
          await shell.executeLine('db.isMaster()');
          shell.assertContainsOutput('ismaster: true');
          shell.assertContainsOutput(`me: '${await rs0.hostport()}'`);
          shell.assertContainsOutput(`setName: '${replSetId}'`);
        });
        it('when setting directConnection to false', async function () {
          const shell = this.startTestShell({
            args: [await rs1.connectionString({ directConnection: 'false' })],
          });
          await shell.waitForPrompt();
          await shell.executeLine('db.isMaster()');
          shell.assertContainsOutput('ismaster: true');
          shell.assertContainsOutput(`me: '${await rs0.hostport()}'`);
          shell.assertContainsOutput(`setName: '${replSetId}'`);
        });
        it('when specifying multiple seeds in a connection string', async function () {
          const connectionString =
            'mongodb://' +
            (await rs2.hostport()) +
            ',' +
            (await rs1.hostport()) +
            ',' +
            (await rs0.hostport());
          const shell = this.startTestShell({ args: [connectionString] });
          await shell.waitForPrompt();
          await shell.executeLine('db.isMaster()');
          shell.assertContainsOutput('ismaster: true');
          shell.assertContainsOutput(`me: '${await rs0.hostport()}'`);
          shell.assertContainsOutput(`setName: '${replSetId}'`);
        });
        it('when specifying multiple seeds without replset through --host', async function () {
          const hostlist =
            (await rs2.hostport()) +
            ',' +
            (await rs1.hostport()) +
            ',' +
            (await rs0.hostport());
          const shell = this.startTestShell({ args: ['--host', hostlist] });
          await shell.waitForPrompt();
          await shell.executeLine('db.isMaster()');
          await shell.executeLine('({ dbname: db.getName() })');
          shell.assertContainsOutput('ismaster: true');
          shell.assertContainsOutput(`me: '${await rs0.hostport()}'`);
          shell.assertContainsOutput(`setName: '${replSetId}'`);
          shell.assertContainsOutput("dbname: 'test'");
        });
        it('when specifying multiple seeds with replset through --host', async function () {
          const hostlist =
            replSetId +
            '/' +
            (await rs2.hostport()) +
            ',' +
            (await rs1.hostport()) +
            ',' +
            (await rs0.hostport());
          const shell = this.startTestShell({ args: ['--host', hostlist] });
          await shell.waitForPrompt();
          await shell.executeLine('db.isMaster()');
          await shell.executeLine('({ dbname: db.getName() })');
          shell.assertContainsOutput('ismaster: true');
          shell.assertContainsOutput(`me: '${await rs0.hostport()}'`);
          shell.assertContainsOutput(`setName: '${replSetId}'`);
          shell.assertContainsOutput("dbname: 'test'");
        });
        it('when specifying multiple seeds through --host with a db name', async function () {
          const hostlist =
            replSetId +
            '/' +
            (await rs2.hostport()) +
            ',' +
            (await rs1.hostport()) +
            ',' +
            (await rs0.hostport());
          const shell = this.startTestShell({
            args: ['--host', hostlist, 'admin'],
          });
          await shell.waitForPrompt();
          await shell.executeLine('db.isMaster()');
          await shell.executeLine('({ dbname: db.getName() })');
          shell.assertContainsOutput('ismaster: true');
          shell.assertContainsOutput(`me: '${await rs0.hostport()}'`);
          shell.assertContainsOutput(`setName: '${replSetId}'`);
          shell.assertContainsOutput("dbname: 'admin'");
        });
        it('when specifying multiple seeds through --host with a wrong replsetid', async function () {
          const hostlist =
            'wrongreplset/' +
            (await rs2.hostport()) +
            ',' +
            (await rs1.hostport()) +
            ',' +
            (await rs0.hostport());
          const shell = this.startTestShell({
            args: ['--host', hostlist, 'admin'],
          });
          await shell.waitForAnyExit();
          shell.assertContainsOutput('MongoServerSelectionError');
        });

        it('lists collections and dbs using show by default', async function () {
          const shell = this.startTestShell({
            args: [`${await rs1.connectionString()}`],
          });
          await shell.waitForPrompt();
          await shell.executeLine('use admin');
          expect(await shell.executeLine('show collections')).to.include(
            'system.version'
          );
          expect(await shell.executeLine('show dbs')).to.include('admin');
        });
        it('autocompletes collection names', async function () {
          if (process.arch === 's390x') {
            return this.skip(); // https://jira.mongodb.org/browse/MONGOSH-746
          }
          const shell = this.startTestShell({
            args: [await rs1.connectionString({}, { pathname: `/${dbname}` })],
            forceTerminal: true,
          });
          await shell.waitForPrompt();
          shell.writeInput('db.testc');
          await tabtab(shell);
          await eventually(() => {
            shell.assertContainsOutput('db.testcollection');
          });
        });
        it('can authenticate when specifying multiple seeds with replset through --host', async function () {
          const hostlist =
            replSetId +
            '/' +
            (await rs2.hostport()) +
            ',' +
            (await rs1.hostport()) +
            ',' +
            (await rs0.hostport());
          const shell = this.startTestShell({
            args: [
              '--host',
              hostlist,
              '--username',
              'anna',
              '--password',
              'pwd',
            ],
          });
          await shell.waitForPrompt();
          await shell.executeLine('db.runCommand({connectionStatus: 1})');
          shell.assertContainsOutput("user: 'anna'");
        });
        it('drops indexes even if a read preference is specified in the connection url', async function () {
          const shell = this.startTestShell({
            args: [await rs0.connectionString({ readPreference: 'secondary' })],
          });

          await shell.waitForPrompt();
          await shell.executeLine('db.mydb.test.createIndex({ field: 1 })');
          await shell.executeLine('db.mydb.test.dropIndexes({ field: 1 })');
          shell.assertContainsOutput('nIndexesWas: 2');
          shell.assertContainsOutput('ok: 1');
        });
      });

      describe('fail-fast connections', function () {
        it('does not fail fast for ECONNREFUSED errors when one host is reachable', async function () {
          const shell = this.startTestShell({
            args: [
              `mongodb://${await rs1.hostport()},127.0.0.1:1/?replicaSet=${replSetId}&readPreference=secondary`,
            ],
          });
          const result = await shell.waitForPromptOrExit();
          expect(result).to.deep.equal({ state: 'prompt' });
        });
      });
    });
  });
});
