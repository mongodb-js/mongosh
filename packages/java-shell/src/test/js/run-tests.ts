'use strict';
import child_process from 'child_process';
import fs from 'fs';
import path from 'path';
import { startTestServer } from '../../../../../testing/integration-testing-hooks';

describe('java-shell tests', function() {
  this.timeout(600_000);
  // The java-shell tests contain references to the port in the expected output.
  // It would be nice if they accepted any port.
  const testServer = startTestServer('not-shared', '--port', '27018');
  const uriFile = path.resolve(__dirname, '..', 'resources', 'URI.txt');
  const packageRoot = path.resolve(__dirname, '..', '..', '..') + '/';
  let origUriFileContent = Buffer.alloc(0);

  before(async function () {
    const connectionString = await testServer.connectionString();
      return new Promise((resolve, reject) => {
      // We can probably turn this into execFile once
      // https://jira.mongodb.org/browse/MONGOSH-401 is fixed
      const mongosh = child_process.spawn(
        process.execPath,
        [ path.resolve(packageRoot, '..', 'cli-repl', 'bin', 'mongosh.js'), connectionString ],
        { stdio: [ 'pipe', 'pipe', 'inherit' ], env: { ...process.env, NO_COLOR: '1' } });
      let out = '';
      let wroteCreateUser = false;
      let isDone = false;
      mongosh.on('error', reject);
      mongosh.stdout.setEncoding('utf8').on('data', (chunk) => {
        out += chunk;
        process.stderr.write(chunk);
        if (out.includes('> ') && !wroteCreateUser) {
          wroteCreateUser = true;
          mongosh.stdin.write(`
            use admin;
            db.createUser({ user: "admin", pwd: "admin", roles: ["root"]});
          `);
        }
        if ((out.includes('{ ok: 1 }') ||
             out.includes('User "admin@admin" already exists')) && !isDone) {
          isDone = true;
          mongosh.kill();
          origUriFileContent = fs.readFileSync(uriFile);
          fs.writeFileSync(uriFile,
            connectionString.replace('mongodb://', 'mongodb://admin:admin@'));
          resolve();
        }
      });
    });
  });

  after(() => {
    fs.writeFileSync(uriFile, origUriFileContent);
  });

  it('passes the JavaShell tests', () => {
    if (process.platform !== 'win32') {
      child_process.execSync('./gradlew test --info', { stdio: 'inherit', cwd: packageRoot });
    } else {
      child_process.execSync('.\\gradlew.bat test --info', { stdio: 'inherit', cwd: packageRoot });
    }
  });
});

