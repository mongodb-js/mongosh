import { startTestCluster, skipIfServerVersion, skipIfApiStrict } from '../../../testing/integration-testing-hooks';
import { eventually } from '../../../testing/eventually';
import { expect } from 'chai';
import { TestShell } from './test-shell';

describe('e2e direct connection', () => {
  skipIfApiStrict();
  afterEach(TestShell.cleanup);

  const tabtab = async(shell: TestShell) => {
    await new Promise(resolve => setTimeout(resolve, 400));
    shell.writeInput('\u0009');
    await new Promise(resolve => setTimeout(resolve, 400));
    shell.writeInput('\u0009');
  };

  context('to a replica set', () => {
    const replSetId = 'replset';
    const [rs0, rs1, rs2] = startTestCluster(
      ['--single', '--replSet', replSetId],
      ['--single', '--replSet', replSetId],
      ['--single', '--replSet', replSetId]
    );

    [
      { server: rs0, name: 'rs0' },
      { server: rs1, name: 'rs1' },
      { server: rs2, name: 'rs2' }
    ].forEach(({ server, name }) => {
      it(`works when connecting to node ${name} of uninitialized set`, async() => {
        const shell = TestShell.start({ args: [await server.connectionString()] });
        await shell.waitForPrompt();
        await shell.executeLine('db.isMaster()');
        shell.assertContainsOutput('ismaster: false');
        shell.assertNotContainsOutput(`setName: '${replSetId}'`);
      });
    });

    context('after rs.initiate()', () => {
      let dbname: string;

      before(async function() {
        this.timeout(60_000);
        const replSetConfig = {
          _id: replSetId,
          version: 1,
          members: [
            { _id: 0, host: await rs0.hostport(), priority: 1 },
            { _id: 1, host: await rs1.hostport(), priority: 0 },
            { _id: 2, host: await rs2.hostport(), priority: 0 },
          ]
        };

        const shell = TestShell.start({ args: [await rs0.connectionString()] });
        await shell.waitForPrompt();
        await shell.executeLine(`rs.initiate(${JSON.stringify(replSetConfig)})`);
        shell.assertContainsOutput('ok: 1');
        await eventually(async() => {
          await shell.executeLine('db.isMaster()');
          shell.assertContainsOutput('ismaster: true');
          shell.assertContainsOutput(`me: '${await rs0.hostport()}'`);
          shell.assertContainsOutput(`setName: '${replSetId}'`);
        });

        await shell.executeLine('use admin');
        await shell.executeLine("db.createUser({ user: 'anna', pwd: 'pwd', roles: [] })");
        shell.assertContainsOutput('ok: 1');

        dbname = `test-${Date.now()}-${(Math.random() * 100000) | 0}`;
        await shell.executeLine(`use ${dbname}`);
        await shell.executeLine('db.testcollection.insertOne({})');
        shell.writeInputLine('exit');
      });
      after(async() => {
        const shell = TestShell.start({ args: [await rs0.connectionString()] });
        await shell.executeLine(`db.getSiblingDB("${dbname}").dropDatabase()`);
        shell.writeInputLine('exit');
      });

      context('connecting to secondary members directly', () => {
        it('works when specifying a connection string', async() => {
          const shell = TestShell.start({ args: [await rs1.connectionString()] });
          await shell.waitForPrompt();
          await shell.executeLine('db.isMaster()');
          shell.assertContainsOutput('ismaster: false');
          shell.assertContainsOutput(`me: '${await rs1.hostport()}'`);
          shell.assertContainsOutput(`setName: '${replSetId}'`);
        });

        it('works when specifying just host and port', async() => {
          const shell = TestShell.start({ args: [await rs1.hostport()] });
          await shell.waitForPrompt();
          await shell.executeLine('db.isMaster()');
          shell.assertContainsOutput('ismaster: false');
          shell.assertContainsOutput(`me: '${await rs1.hostport()}'`);
          shell.assertContainsOutput(`setName: '${replSetId}'`);
        });

        it('fails to list collections without explicit readPreference', async() => {
          const shell = TestShell.start({ args: [`${await rs1.connectionString()}`] });
          await shell.waitForPrompt();
          await shell.executeLine('use admin');
          await shell.executeLine('db.runCommand({ listCollections: 1 })');
          shell.assertContainsError('MongoServerError: not primary');
        });

        it('lists collections when readPreference is in the connection string', async() => {
          const shell = TestShell.start({ args: [`${await rs1.connectionString()}?readPreference=secondaryPreferred`] });
          await shell.waitForPrompt();
          await shell.executeLine('use admin');
          await shell.executeLine('db.runCommand({ listCollections: 1 })');
          shell.assertContainsOutput("name: 'system.version'");
        });

        it('lists collections when readPreference is set via Mongo', async() => {
          const shell = TestShell.start({ args: [`${await rs1.connectionString()}`] });
          await shell.waitForPrompt();
          await shell.executeLine('use admin');
          await shell.executeLine('db.getMongo().setReadPref("secondaryPreferred")');
          await shell.executeLine('db.runCommand({ listCollections: 1 })');
          shell.assertContainsOutput("name: 'system.version'");
        });

        it('fails to list databases without explicit readPreference', async() => {
          const shell = TestShell.start({ args: [`${await rs1.connectionString()}`] });
          await shell.waitForPrompt();
          await shell.executeLine('use admin');
          await shell.executeLine('db.getMongo().getDBs()');
          shell.assertContainsError('MongoServerError: not primary');
        });

        it('lists databases when readPreference is in the connection string', async() => {
          const shell = TestShell.start({ args: [`${await rs1.connectionString()}?readPreference=secondaryPreferred`] });
          await shell.waitForPrompt();
          await shell.executeLine('use admin');
          await shell.executeLine('db.getMongo().getDBs()');
          shell.assertContainsOutput("name: 'admin'");
        });

        it('lists databases when readPreference is set via Mongo', async() => {
          const shell = TestShell.start({ args: [`${await rs1.connectionString()}`] });
          await shell.waitForPrompt();
          await shell.executeLine('use admin');
          await shell.executeLine('db.getMongo().setReadPref("secondaryPreferred")');
          await shell.executeLine('db.getMongo().getDBs()');
          shell.assertContainsOutput("name: 'admin'");
        });

        it('lists collections and dbs using show by default', async() => {
          const shell = TestShell.start({ args: [`${await rs1.connectionString()}`] });
          await shell.waitForPrompt();
          await shell.executeLine('use admin');
          expect(await shell.executeLine('show collections')).to.include('system.version');
          expect(await shell.executeLine('show dbs')).to.include('admin');
        });

        it('autocompletes collection names', async function() {
          if (process.arch === 's390x') {
            return this.skip(); // https://jira.mongodb.org/browse/MONGOSH-746
          }
          const shell = TestShell.start({ args: [`${await rs1.connectionString()}/${dbname}`], forceTerminal: true });
          await shell.waitForPrompt();
          shell.writeInput('db.testc');
          await tabtab(shell);
          await eventually(() => {
            shell.assertContainsOutput('db.testcollection');
          });
        });

        context('post-4.0', () => {
          skipIfServerVersion(rs0, '< 4.2');

          it('allows aggregate with $merge with secondary readpref', async() => {
            const shell = TestShell.start({ args: [
              `${await rs1.connectionString()}/${dbname}?readPreference=secondary&directConnection=false&serverSelectionTimeoutMS=10000`
            ] });
            await shell.waitForPrompt();
            await shell.executeLine(`db.testcollection.aggregate([
              {$group:{_id:null,count:{$sum:1}}},
              {$set:{_id:'count'}},
              {$merge:{into:'testaggout',on:'_id'}}
            ])`);
            await eventually(async() => {
              expect(await shell.executeLine('db.testaggout.find()')).to.include("[ { _id: 'count', count: 1 } ]");
            });
            shell.assertNoErrors();
          });
        });
      });

      context('connecting to primary', () => {
        it('when specifying replicaSet', async() => {
          const shell = TestShell.start({ args: [`${await rs1.connectionString()}?replicaSet=${replSetId}`] });
          await shell.waitForPrompt();
          await shell.executeLine('db.isMaster()');
          shell.assertContainsOutput('ismaster: true');
          shell.assertContainsOutput(`me: '${await rs0.hostport()}'`);
          shell.assertContainsOutput(`setName: '${replSetId}'`);
        });
        it('when setting directConnection to false', async() => {
          const shell = TestShell.start({ args: [`${await rs1.connectionString()}?directConnection=false`] });
          await shell.waitForPrompt();
          await shell.executeLine('db.isMaster()');
          shell.assertContainsOutput('ismaster: true');
          shell.assertContainsOutput(`me: '${await rs0.hostport()}'`);
          shell.assertContainsOutput(`setName: '${replSetId}'`);
        });
        it('when specifying multiple seeds in a connection string', async() => {
          const connectionString = 'mongodb://' + await rs2.hostport() + ',' + await rs1.hostport() + ',' + await rs0.hostport();
          const shell = TestShell.start({ args: [connectionString] });
          await shell.waitForPrompt();
          await shell.executeLine('db.isMaster()');
          shell.assertContainsOutput('ismaster: true');
          shell.assertContainsOutput(`me: '${await rs0.hostport()}'`);
          shell.assertContainsOutput(`setName: '${replSetId}'`);
        });
        it('when specifying multiple seeds without replset through --host', async() => {
          const hostlist = await rs2.hostport() + ',' + await rs1.hostport() + ',' + await rs0.hostport();
          const shell = TestShell.start({ args: ['--host', hostlist] });
          await shell.waitForPrompt();
          await shell.executeLine('db.isMaster()');
          await shell.executeLine('({ dbname: db.getName() })');
          shell.assertContainsOutput('ismaster: true');
          shell.assertContainsOutput(`me: '${await rs0.hostport()}'`);
          shell.assertContainsOutput(`setName: '${replSetId}'`);
          shell.assertContainsOutput("dbname: 'test'");
        });
        it('when specifying multiple seeds with replset through --host', async() => {
          const hostlist = replSetId + '/' + await rs2.hostport() + ',' + await rs1.hostport() + ',' + await rs0.hostport();
          const shell = TestShell.start({ args: ['--host', hostlist] });
          await shell.waitForPrompt();
          await shell.executeLine('db.isMaster()');
          await shell.executeLine('({ dbname: db.getName() })');
          shell.assertContainsOutput('ismaster: true');
          shell.assertContainsOutput(`me: '${await rs0.hostport()}'`);
          shell.assertContainsOutput(`setName: '${replSetId}'`);
          shell.assertContainsOutput("dbname: 'test'");
        });
        it('when specifying multiple seeds through --host with a db name', async() => {
          const hostlist = replSetId + '/' + await rs2.hostport() + ',' + await rs1.hostport() + ',' + await rs0.hostport();
          const shell = TestShell.start({ args: ['--host', hostlist, 'admin'] });
          await shell.waitForPrompt();
          await shell.executeLine('db.isMaster()');
          await shell.executeLine('({ dbname: db.getName() })');
          shell.assertContainsOutput('ismaster: true');
          shell.assertContainsOutput(`me: '${await rs0.hostport()}'`);
          shell.assertContainsOutput(`setName: '${replSetId}'`);
          shell.assertContainsOutput("dbname: 'admin'");
        });
        it('when specifying multiple seeds through --host with a wrong replsetid', async() => {
          const hostlist = 'wrongreplset/' + await rs2.hostport() + ',' + await rs1.hostport() + ',' + await rs0.hostport();
          const shell = TestShell.start({ args: ['--host', hostlist, 'admin'] });
          await shell.waitForExit();
          shell.assertContainsOutput('MongoServerSelectionError');
        });

        it('lists collections and dbs using show by default', async() => {
          const shell = TestShell.start({ args: [`${await rs1.connectionString()}`] });
          await shell.waitForPrompt();
          await shell.executeLine('use admin');
          expect(await shell.executeLine('show collections')).to.include('system.version');
          expect(await shell.executeLine('show dbs')).to.include('admin');
        });
        it('autocompletes collection names', async function() {
          if (process.arch === 's390x') {
            return this.skip(); // https://jira.mongodb.org/browse/MONGOSH-746
          }
          const shell = TestShell.start({ args: [`${await rs1.connectionString()}/${dbname}`], forceTerminal: true });
          await shell.waitForPrompt();
          shell.writeInput('db.testc');
          await tabtab(shell);
          await eventually(() => {
            shell.assertContainsOutput('db.testcollection');
          });
        });
        it('can authenticate when specifying multiple seeds with replset through --host', async() => {
          const hostlist = replSetId + '/' + await rs2.hostport() + ',' + await rs1.hostport() + ',' + await rs0.hostport();
          const shell = TestShell.start({ args: ['--host', hostlist, '--username', 'anna', '--password', 'pwd'] });
          await shell.waitForPrompt();
          await shell.executeLine('db.runCommand({connectionStatus: 1})');
          shell.assertContainsOutput("user: 'anna'");
        });
      });

      describe('fail-fast connections', () => {
        it('does not fail fast for ECONNREFUSED errors when one host is reachable', async() => {
          const shell = TestShell.start({ args: [
            `mongodb://${await rs1.hostport()},127.0.0.1:1/?replicaSet=${replSetId}&readPreference=secondary`
          ] });
          const result = await shell.waitForPromptOrExit();
          expect(result).to.deep.equal({ state: 'prompt' });
        });
      });
    });
  });
});
