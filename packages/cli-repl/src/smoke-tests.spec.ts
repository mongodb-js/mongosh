import { runSmokeTests } from './';
import path from 'path';
import { startTestServer, downloadCurrentCsfleSharedLibrary } from '../../../testing/integration-testing-hooks';

describe('smoke tests', () => {
  const testServer = startTestServer('shared');
  let csfleLibrary: string;

  before(async() => {
    csfleLibrary = await downloadCurrentCsfleSharedLibrary();
  });

  it('self-test passes', async() => {
    // Use ts-node to run the .ts files directly so nyc can pick them up for
    // coverage.
    await runSmokeTests(
      await testServer.connectionString(),
      process.execPath, '-r', 'ts-node/register', path.resolve(__dirname, 'run.ts'), '--csfleLibraryPath', csfleLibrary
    );
  });
});
