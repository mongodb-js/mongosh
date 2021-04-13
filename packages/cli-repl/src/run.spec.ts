import childProcess from 'child_process';
import path from 'path';
import { promisify } from 'util';
import { expect } from 'chai';
const execFile = promisify(childProcess.execFile);

describe('CLI entry point', () => {
  async function run(args: string[], env?: Record<string, string>): Promise<{ stdout: string, stderr: string }> {
    // Use ts-node to run the .ts files directly so nyc can pick them up for
    // coverage.
    return await execFile(
      process.execPath,
      ['-r', 'ts-node/register', path.resolve(__dirname, 'run.ts'), ...args],
      { env: { ...process.env, ...(env ?? {}) } });
  }

  it('prints the version if --version is being used', async() => {
    const { stdout } = await run(['--version']);
    expect(stdout).to.match(/^\d+\.\d+\.\d+/);
  });

  it('prints the help text if --help is being used', async() => {
    const { stdout } = await run(['--help']);
    expect(stdout).to.include('$ mongosh [options]');
  });

  it('runs regular mongosh code otherwise', async() => {
    const { stdout } = await run(['--nodb', '--norc', '--eval', '55 + 89']);
    expect(stdout).to.include('144');
  });

  it('runs Node.js scripts if MONGOSH_RUN_NODE_SCRIPT is passed', async() => {
    const { stdout } = await run([path.resolve(__dirname, '..', 'test', 'fixtures', 'nodescript.js')], { MONGOSH_RUN_NODE_SCRIPT: '1' });
    expect(stdout).to.include('works!');
  });
});
