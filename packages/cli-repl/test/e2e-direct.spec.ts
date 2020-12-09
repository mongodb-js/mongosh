import { startTestCluster } from '../../../testing/integration-testing-hooks';
import { eventually } from './helpers';
import { TestShell } from './test-shell';

describe('e2e direct connection', () => {
  afterEach(async() => await TestShell.killall());

  context('to a replica set', async() => {
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

    it('allows to initialize the replica set', async() => {
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
      it('when specifying multiple seeds', async() => {
        const connectionString = 'mongodb://' + await rs2.hostport() + ',' + await rs1.hostport() + ',' + await rs0.hostport();
        const shell = TestShell.start({ args: [connectionString] });
        await shell.waitForPrompt();
        await shell.executeLine('db.isMaster()');
        shell.assertContainsOutput('ismaster: true');
        shell.assertContainsOutput(`me: '${await rs0.hostport()}'`);
        shell.assertContainsOutput(`setName: '${replSetId}'`);
      });
    });
  });
});
