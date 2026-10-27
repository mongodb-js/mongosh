import { expect } from 'chai';
import { execFile as execFileCallback } from 'child_process';
import { promises as fs } from 'fs';
import crypto from 'crypto';
import path from 'path';
import { promisify } from 'util';
import { pathToFileURL } from 'url';

const execFile = promisify(execFileCallback);

const repoRoot = path.resolve(__dirname, '..', '..', '..', '..');
const scriptPath = path.join(
  repoRoot,
  '.evergreen',
  'dispatch-npm-publish.mjs'
);
const mockPath = path.resolve(__dirname, 'dispatch-npm-publish.mock.mjs');

describe('dispatch-npm-publish.mjs', function () {
  this.timeout(60_000);

  describe('with a mocked GitHub API', function () {
    let privateKey: string;

    before(async function () {
      // auth-app needs a real RSA key to sign the app JWT, even when the
      // network is mocked.
      const { privateKey: key } = crypto.generateKeyPairSync('rsa', {
        modulusLength: 2048,
      });
      privateKey = key.export({ type: 'pkcs1', format: 'pem' }).toString();
    });

    it('runs the full dispatch and wait flow to completion', async function () {
      const { stdout, stderr } = await execFile(
        process.execPath,
        ['--import', pathToFileURL(mockPath).href, scriptPath],
        {
          cwd: repoRoot,
          env: {
            ...process.env,
            DEVTOOLS_BOT_APP_ID: '123',
            DEVTOOLS_BOT_PRIVATE_KEY: privateKey,
            NPM_PUBLISH_POLL_DELAY_MS: '50',
          },
        }
      );

      const { version } = JSON.parse(
        await fs.readFile(
          path.join(repoRoot, 'packages', 'cli-repl', 'package.json'),
          'utf8'
        )
      );
      expect(stdout).to.include(
        `dispatched ${'publish-npm.yml'} for mongosh@${version}`
      );
      expect(stdout).to.include('run found');
      expect(stdout).to.include('npm publish succeeded (success)');
      expect(stderr).to.not.include('ReferenceError');
    });
  });

  describe('without app credentials', function () {
    it('fails with a credentials error, not a code error', async function () {
      try {
        await execFile(process.execPath, [scriptPath], {
          cwd: repoRoot,
          env: {
            ...process.env,
            DEVTOOLS_BOT_APP_ID: '',
            DEVTOOLS_BOT_PRIVATE_KEY: '',
          },
        });
        expect.fail('Expected the script to fail without credentials');
      } catch (err: any) {
        expect(err.code).to.not.equal(0);
        expect(err.stderr).to.include(
          'DEVTOOLS_BOT_APP_ID and DEVTOOLS_BOT_PRIVATE_KEY are required'
        );
        expect(err.stderr).to.not.include('ReferenceError');
      }
    });
  });
});
