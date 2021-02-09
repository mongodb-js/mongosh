import { runSmokeTests } from './';
import path from 'path';
import { startTestServer, ensureMongodAvailable } from '../../../testing/integration-testing-hooks';

describe('smoke tests', () => {
  const testServer = startTestServer('shared');

  let pathBefore;
  before(async() => {
    // The smoke tests want mongocryptd to be in the path. We may need to add
    // the directory of the downloaded mongod in order to be able to use it.
    pathBefore = process.env.PATH;
    const extraPath = await ensureMongodAvailable();
    if (extraPath !== null) {
      process.env.PATH += path.delimiter + extraPath;
    }
  });
  after(() => {
    process.env.PATH = pathBefore;
  });

  it('self-test passes', async() => {
    // Use ts-node to run the .ts files directly so nyc can pick them up for
    // coverage.
    await runSmokeTests(
      await testServer.connectionString(),
      process.execPath, '-r', 'ts-node/register', path.resolve(__dirname, 'run.ts')
    );
  });
});
