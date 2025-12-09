import { runSmokeTests } from './smoke-tests';
import path from 'path';
import {
  downloadCurrentCryptSharedLibrary,
  startSharedTestServer,
} from '@mongosh/testing';

describe('smoke tests', function () {
  const testServer = startSharedTestServer();
  let cryptLibrary: string;

  before(async function () {
    cryptLibrary = await downloadCurrentCryptSharedLibrary();
  });

  it('self-test passes (perf testing disabled)', async function () {
    this.timeout(120_000);
    // Use ts-node to run the .ts files directly so nyc can pick them up for
    // coverage.
    await runSmokeTests({
      smokeTestServer: await testServer.connectionString(),
      args: [
        process.execPath,
        '-r',
        'ts-node/register',
        path.resolve(__dirname, 'run.ts'),
        '--cryptSharedLibPath',
        cryptLibrary,
      ],
      wantPerformanceTesting: false,
    });
  });
});
