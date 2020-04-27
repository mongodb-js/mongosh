
import { expect } from 'chai';
import { MongoClient } from 'mongodb';
import { eventually, startShell, killOpenShells } from './helpers';
import { startTestServer } from '../../../testing/integration-testing-hooks';

describe('e2e', function() {
  const connectionString = startTestServer();

  afterEach(() => killOpenShells());

  describe('--version', () => {
    it('shows version', async() => {
      const shell = startShell('--version');
      await eventually(() => {
        expect(shell.stdio.stderr).to.be.empty;
        expect(shell.stdio.stdout).to.contain(
          require('../package.json').version
        );
      });
    });
  });

  describe('with connection string', () => {
    let db;
    let client;
    let shell;
    let dbName;

    beforeEach(async () => {
      dbName = `test-${Date.now()}`;
      shell = startShell(connectionString);
      client = await (MongoClient as any).connect(
        connectionString,
        { useNewUrlParser: true }
      );

      db = client.db(dbName);
    });

    afterEach(async () => {
      await db.dropDatabase();

      client.close();
    });

    it.skip('connects to the right database', async () => {
      shell.stdio.stdin.write('db\n');

      await eventually(() => {
        expect(shell.stdio.stderr).to.be.empty;
        expect(shell.stdio.stdout).to.contain(`> ${dbName}\n`);
      });
    });

    it('runs help command', async () => {
      shell.stdio.stdin.write('help\n');

      await eventually(() => {
        expect(shell.stdio.stderr).to.be.empty;
        expect(shell.stdio.stdout).to.contain('Shell Help');
      });
    });

    it('allows to find documents', async () => {
      shell.stdio.stdin.write(`use ${dbName}\n`);

      await db.collection('test').insertMany([
        {doc: 1},
        {doc: 2},
        {doc: 3}
      ]);

      shell.stdio.stdin.write('db.test.find()\n');

      await eventually(() => {
        expect(shell.stdio.stderr).to.be.empty;
        expect(shell.stdio.stdout).to.contain('doc: 1');
        expect(shell.stdio.stdout).to.contain('doc: 2');
        expect(shell.stdio.stdout).to.contain('doc: 3');
      });
    });
  });
});
