import { expect } from 'chai';
import { startTestCluster } from '../../../testing/integration-testing-hooks';
import { eventually } from '../../../testing/eventually';
import { TestShell } from './test-shell';

describe('e2e Analytics Node', () => {
  const replSetName = 'replicaSet';
  const [rs0, rs1, rs2, rs3] = startTestCluster(
    [ '--single', '--replSet', replSetName ],
    [ '--single', '--replSet', replSetName ],
    [ '--single', '--replSet', replSetName ],
    [ '--single', '--replSet', replSetName ]
  );

  after(TestShell.cleanup);

  before(async function() {
    if (process.env.MONGOSH_TEST_FORCE_API_STRICT) {
      return this.skip();
    }
    this.timeout(60_000);
    const rsConfig = {
      _id: replSetName,
      members: [
        { _id: 0, host: `${await rs0.hostport()}`, priority: 1 },
        { _id: 1, host: `${await rs1.hostport()}`, priority: 0 },
        { _id: 2, host: `${await rs2.hostport()}`, priority: 0 },
        { _id: 3, host: `${await rs3.hostport()}`, priority: 0, votes: 0, tags: { nodeType: 'ANALYTICS' } }
      ]
    };

    const shell = TestShell.start({
      args: [await rs0.connectionString()]
    });
    await shell.waitForPrompt();
    await shell.executeLine(`rs.initiate(${JSON.stringify(rsConfig)})`);
    shell.assertContainsOutput('ok: 1');
    await eventually(async() => {
      const helloIsWritablePrimary = await shell.executeLine('db.hello().isWritablePrimary');
      expect(helloIsWritablePrimary).to.contain('true');
    }, { timeout: 20_000 });
  });

  context('without readPreference', () => {
    it('a direct connection ends up at primary', async() => {
      const shell = TestShell.start({
        args: [ await rs0.connectionString() ]
      });
      await shell.waitForPrompt();

      const helloResult = await shell.executeLine('db.hello()');
      expect(helloResult).to.contain('isWritablePrimary: true');

      await shell.executeLine('use admin');
      const explain = await shell.executeLine('db[\'system.users\'].find().explain()');
      expect(explain).to.contain(`port: ${await rs0.port()}`);
    });
  });

  context('specifying readPreference and tags', () => {
    it('ends up at the ANALYTICS node', async() => {
      const shell = TestShell.start({
        args: [ `${await rs0.connectionString()}?replicaSet=${replSetName}&readPreference=secondary&readPreferenceTags=nodeType:ANALYTICS` ]
      });
      await shell.waitForPrompt();
      await shell.executeLine('use admin');
      const explain = await shell.executeLine('db[\'system.users\'].find().explain()');
      expect(explain).to.contain(`port: ${await rs3.port()}`);
    });
  });
});
