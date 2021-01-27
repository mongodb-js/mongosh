import { runSmokeTests } from './';
import path from 'path';

describe('smoke tests', () => {
  it('self-test passes', async() => {
    // Use ts-node to run the .ts files directly so nyc can pick them up for
    // coverage.
    await runSmokeTests(
      process.execPath, '-r', 'ts-node/register', path.resolve(__dirname, 'run.ts')
    );
  });
});
