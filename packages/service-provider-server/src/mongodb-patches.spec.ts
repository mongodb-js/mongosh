import { expect } from 'chai';
import { MongoClient } from 'mongodb';
import {
  startTestServer,
  skipIfServerVersion,
} from '../../../testing/integration-testing-hooks';
import { forceCloseMongoClient } from './mongodb-patches';
import { promisify } from 'util';

const delay = promisify(setTimeout);

describe('forceCloseMongoClient [integration]', function () {
  const testServer = startTestServer('shared');

  context('for server >= 4.1', function () {
    skipIfServerVersion(testServer, '< 4.1');

    it('force-closes connections that are currently checked out', async function () {
      if (process.env.MONGOSH_TEST_FORCE_API_STRICT) {
        return this.skip(); // $currentOp is unversioned
      }

      let client = await MongoClient.connect(
        await testServer.connectionString()
      );
      const testDbName = `test-db-${Date.now()}`;
      const testDb = client.db(testDbName);

      await testDb.collection('ctrlc').insertOne({});
      let err: any;
      testDb
        .collection('ctrlc')
        .find({
          $where: 'while(true) { /* loop1 */ }',
        })
        .toArray()
        .catch((e) => {
          err = e;
        });
      await delay(100);
      const result = await forceCloseMongoClient(client);
      expect(result.forceClosedConnections).to.equal(1);
      await delay(1);
      expect(err.message).to.include('Topology is closed');

      client = await MongoClient.connect(await testServer.connectionString());
      for (let i = 0; ; i++) {
        const [out] = await client
          .db('admin')
          .aggregate([
            { $currentOp: {} },
            { $match: { 'command.find': 'ctrlc' } },
            { $count: 'waitingCommands' },
          ])
          .toArray();
        if (i === 100 || !out?.waitingCommands) {
          expect(out?.waitingCommands || 0).to.equal(0);
          break;
        }
        await delay(100);
      }

      await client.db(testDbName).dropDatabase();
      await client.close();
    });
  });
});
