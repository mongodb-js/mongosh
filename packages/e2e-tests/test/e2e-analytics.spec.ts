import { expect } from 'chai';
import { startTestCluster, eventually } from '@mongosh/testing';
import { startTestShell } from './test-shell-context';

describe('e2e Analytics Node', function () {
  const replSetName = 'replicaSet';
  const [rs0, rs1, rs2, rs3] = startTestCluster(
    'e2e-analytics-node',
    { args: ['--replSet', replSetName] },
    { args: ['--replSet', replSetName] },
    { args: ['--replSet', replSetName] },
    { args: ['--replSet', replSetName] }
  );

  before(async function () {
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
        {
          _id: 3,
          host: `${await rs3.hostport()}`,
          priority: 0,
          votes: 0,
          tags: { nodeType: 'ANALYTICS' },
        },
      ],
    };

    const shell = startTestShell(this, {
      args: [await rs0.connectionString()],
    });
    await shell.waitForPrompt();
    await shell.executeLine(`rs.initiate(${JSON.stringify(rsConfig)})`);
    shell.assertContainsOutput('ok: 1');
    await eventually(
      async () => {
        const helloIsWritablePrimary = await shell.executeLine(
          'db.hello().isWritablePrimary'
        );
        expect(helloIsWritablePrimary).to.contain('true');
      },
      { timeout: 20_000 }
    );
  });

  context('without readPreference', function () {
    it('a direct connection ends up at primary', async function () {
      const shell = startTestShell(this, {
        args: [await rs0.connectionString()],
      });
      await shell.waitForPrompt();

      const helloResult = await shell.executeLine('db.hello()');
      expect(helloResult).to.contain('isWritablePrimary: true');
      expect(helloResult).not.to.contain('nodeType:');
    });
  });

  context('specifying readPreference and tags', function () {
    it('ends up at the ANALYTICS node', async function () {
      const shell = startTestShell(this, {
        args: [
          `${await rs0.connectionString()}?replicaSet=${replSetName}&readPreference=secondary&readPreferenceTags=nodeType:ANALYTICS`,
        ],
      });

      const directConnectionToAnalyticsShell = startTestShell(this, {
        args: [`${await rs3.connectionString()}?directConnection=true`],
      });
      await Promise.all([
        shell.waitForPrompt(),
        directConnectionToAnalyticsShell.waitForPrompt(),
      ]);

      const helloResult = await shell.executeLine('db.hello()');
      expect(helloResult).to.contain('isWritablePrimary: false');
      expect(helloResult).to.contain("nodeType: 'ANALYTICS'");

      await directConnectionToAnalyticsShell.executeLine(
        'const before = db.serverStatus().opcounters.query'
      );

      await shell.executeLine('use admin');
      await shell.executeLine("db['system.users'].findOne()");

      await directConnectionToAnalyticsShell.executeLine(
        'const after = db.serverStatus().opcounters.query'
      );
      expect(
        await directConnectionToAnalyticsShell.executeLine(
          '({ diff: after - before })'
        )
      ).to.match(/diff: [1-9]/); // not 0
    });
  });
});
