import childProcess from 'child_process';
import path from 'path';
import { promisify } from 'util';
import { expect } from 'chai';
import { once } from 'events';
const execFile = promisify(childProcess.execFile);

describe('CLI entry point', function () {
  const pathToRun = [
    '-r',
    'ts-node/register',
    path.resolve(__dirname, 'run.ts'),
  ];
  async function run(
    args: string[],
    env?: Record<string, string>
  ): Promise<{ stdout: string; stderr: string }> {
    // Use ts-node to run the .ts files directly so nyc can pick them up for
    // coverage.
    return await execFile(process.execPath, [...pathToRun, ...args], {
      env: { ...process.env, ...(env ?? {}) },
    });
  }

  it('prints the version if --version is being used', async function () {
    const { stdout } = await run(['--version']);
    expect(stdout).to.match(/^\d+\.\d+\.\d+/);
  });

  it('prints the help text if --help is being used', async function () {
    const { stdout } = await run(['--help']);
    expect(stdout).to.include('$ mongosh [options]');
  });

  it('runs regular mongosh code otherwise', async function () {
    const { stdout } = await run(['--nodb', '--norc', '--eval', '55 + 89']);
    expect(stdout).to.include('144');
  });

  it('runs Node.js scripts if MONGOSH_RUN_NODE_SCRIPT is passed', async function () {
    const { stdout } = await run(
      [path.resolve(__dirname, '..', 'test', 'fixtures', 'nodescript.js')],
      { MONGOSH_RUN_NODE_SCRIPT: '1' }
    );
    expect(stdout).to.include('works!');
  });

  it('can load get-console-process-list on Windows', function () {
    if (process.platform !== 'win32') {
      return this.skip();
    }
    expect(require('get-console-process-list')).to.be.a('function');
  });

  it('can load win-export-certificate-and-key on Windows', function () {
    if (process.platform !== 'win32') {
      return this.skip();
    }
    expect(require('win-export-certificate-and-key')).to.be.a('function');
  });

  it('can load macos-export-certificate-and-key on macOS', function () {
    if (process.platform !== 'darwin') {
      return this.skip();
    }
    expect(require('macos-export-certificate-and-key')).to.be.a('function');
  });

  it('asks for connection string when configured to do so', async function () {
    const proc = childProcess.spawn(process.execPath, pathToRun, {
      stdio: 'pipe',
      env: { ...process.env, MONGOSH_FORCE_CONNECTION_STRING_PROMPT: '1' },
    });
    let stdout = '';
    let stderr = '';
    let wroteConnectionString = false;
    let wroteAnyKeyToExit = false;
    proc.stdout.setEncoding('utf8').on('data', (chunk) => {
      stdout += chunk;
      if (
        !wroteConnectionString &&
        stdout.includes('Please enter a MongoDB connection string')
      ) {
        proc.stdin.write('/\n');
        wroteConnectionString = true;
      }
      if (!wroteAnyKeyToExit && stdout.includes('Press any key to exit')) {
        proc.stdin.write('x');
        wroteAnyKeyToExit = true;
      }
    });
    proc.stderr.setEncoding('utf8').on('data', (chunk) => {
      stderr += chunk;
    });
    const [code] = await once(proc, 'exit');
    expect(code).to.equal(1);
    expect(stdout).to.include('Press any key to exit');
    expect(stderr).to.include(
      'MongoshInvalidInputError: [COMMON-10001] Invalid URI: /'
    );
  });

  context('prompts for password', function () {
    it('requests password when user is not redirecting output', async function () {
      const args = [...pathToRun, 'mongodb://amy@localhost:27017'];
      const proc = childProcess.spawn(process.execPath, args, {
        stdio: ['pipe'],
        env: { ...process.env, TEST_USE_STDOUT_FOR_PASSWORD: '1' },
      });
      let stdout = '';
      let promptedForPassword = false;
      proc.stdout?.setEncoding('utf8').on('data', (chunk) => {
        stdout += chunk;
        if (stdout.includes('Enter password')) {
          promptedForPassword = true;
          proc.stdin?.write('\n');
        }
      });

      const [code] = await once(proc, 'exit');
      expect(code).to.equal(1);
      expect(promptedForPassword).to.be.true;
    });

    it('requests password when user is redirecting output', async function () {
      const args = [...pathToRun, 'mongodb://amy@localhost:27017'];
      const proc = childProcess.spawn(process.execPath, args, {
        stdio: ['pipe', 'ignore', 'pipe'],
        env: { ...process.env },
      });
      let stderr = '';
      let promptedForPassword = false;
      proc.stderr?.setEncoding('utf8').on('data', (chunk) => {
        stderr += chunk;
        if (stderr.includes('Enter password')) {
          promptedForPassword = true;
          proc.stdin?.write('\n');
        }
      });

      const [code] = await once(proc, 'exit');
      expect(code).to.equal(1);
      expect(promptedForPassword).to.be.true;
    });
  });
});
