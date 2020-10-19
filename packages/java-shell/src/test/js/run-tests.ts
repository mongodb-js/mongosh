'use strict';
import child_process from 'child_process';
import fs from 'fs';
import path from 'path';
import { startTestServer } from '../../../../../testing/integration-testing-hooks';

const port = '27019';
const authlessUri = `mongodb://localhost:${port}`;
const uri = `mongodb://admin:admin@localhost:${port}`;

describe('java-shell tests', function() {
  this.timeout(300_000);
  const connectionString = startTestServer();
  const uriFile = path.resolve(__dirname, '..', 'resources', 'URI.txt');
  const packageRoot = path.resolve(__dirname, '..', '..', '..') + '/';
  let origUriFileContent;

  before((done) => {
    // We can probably turn this into execSync once
    // https://jira.mongodb.org/browse/MONGOSH-401 is fixed
    const mongosh = child_process.spawn(
      process.execPath,
      [ path.resolve(packageRoot, '..', 'cli-repl', 'bin', 'mongosh.js'), connectionString ],
      { stdio: [ 'pipe', 'pipe', 'inherit' ], env: { ...process.env, NO_COLOR: '1' } });
    let out = '';
    let wroteCreateUser = false;
    let isDone = false;
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
        done();
      }
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

